# 二次开发集成项目背景 — 人机共创视频工厂

> 集成 `infinite-canvas` 开源画布（`infinite-canvas/`），非基于其二次改：**前端自研，前端按需嵌入画布；后端 `opencode multi-agent` 编排全流程；人机资产同库互调；终局进画布精修并复用其模型对接能力生成视频，产物回流再编辑/再生成。数据模型与具体实现待定，本文仅定边界与集成方式。**

## 1 背景与问题

现有 `infinite-canvas` 为纯前端 `localforage` 单机画布（`infinite-canvas/web/src/stores/use-config-store.ts:65`、`AGENTS.md:92`），AI 直连用户网关、提示词库本地轮询，适合个人探索，不满足：
- 团队资产沉淀与复用（跨端/跨人不可见）
- 全流程可追溯（选题→脚本→分镜→素材→粗剪→精修→成片割裂）
- 人机协作闭环（Agent 产出无法入库被人类再调用，反之亦然）
- 视频生成的工程化（批量、队列、成本、再生成）

本项目引入 **后端编排层**：Docker 内 `opencode multi-agent` 作为“导演组”，与人类在同一资产库中协作。

## 2 总体目标

```
人类 CRUD 资产 ↔ 共享资产库（DB+S3） ↔ Agent CRUD 资产
       ↕ 阶段化 UI（每阶段专用面板）        ↕ opencode 调度
       └──────────────→ 终局画布（infinite-canvas）←──────────┘
                              ↓ 模型接口 (OpenAI兼容/Sora/Runway/Kling)
                       视频生成产物 → 入库 → 再编辑/再生成
```

**四句判据**：
1. 人创资产与 Agent 资产同表同权，可互相检索、引用、再生成
2. 流程分阶段，每阶段有独立 UI 与 `opencode agent` 职责，支持人类增删改查+Agent 自动推进
3. 最后阶段必须进入 `infinite-canvas` 画布（人工/Agent 双驱动），复用其 `buildApiUrl:389` 模型对接能力
4. 所有生成产物（图/视频/音频/文本）自动入库，携带血缘（`prompt/model/references/parentId`），支持一键回画布再编辑

## 3 系统架构（集成式，非继承式）

```
┌─────────────────────────────────────────────────────────────────┐
│ 前端（自研 Vite+React，与 infinite-canvas/web 解耦）            │
│  自研页面: /assets /stages/{1..N} /generations /admin           │
│  画布集成区: <CanvasEmbed />  ← 按需嵌入 infinite-canvas 能力   │
│  状态：自研 stores → 后端 API；画布内状态仍走其自有 stores      │
├─────────────────────────────────────────────────────────────────┤
│ 后端 (Docker, opencode orchestration)                            │
│  API Gateway → Asset Service → DB + 对象存储                    │
│              ↕                         ↕                        │
│        opencode Router (lead)        资产检索/注册 MCP          │
│        ├─ 策划 Agent                                     │
│        ├─ 美术 Agent                                     │
│        ├─ 视频 Agent                                     │
│        └─ 剪辑 Agent                                     │
│        共享工具: asset_search/register, canvas_bridge,         │
│                 image_generate/video_generate                │
├─────────────────────────────────────────────────────────────────┤
│ 画布（被集成方 infinite-canvas）                                │
│  视为可嵌入组件/子应用：lib/canvas/* + plugin SDK + 模型网关   │
│  集成方式三选一：npm 包引入 / iframe 子应用 / 独立路由嵌入     │
│  密钥：前端不再直连模型，统一走后端代理隐藏 Key（缓解 AGENTS.md:130）│
└─────────────────────────────────────────────────────────────────┘
```

**集成原则**：不 fork 改 `infinite-canvas/web`，不复用其 `router.tsx:15` 与 `localforage` 存储；前端自研壳，画布以组件形式挂载，仅通过 `props/postMessage/SDK` 交换 `assets ↔ CanvasSnapshot`。

**部署**：自研前端与 `infinite-canvas` 分开构建；后端 `opencode` 单独容器编排；可复用 `infinite-canvas/Dockerfile:2 oven/bun→nginx` 作为画布子应用镜像，或将其 `web/dist` 作为静态资源被主前端按需加载。

## 4 资产模型（待定，本文仅约束边界）

> 具体表结构、字段、存储选型未定，下述为**必须满足的不变量**，实现时再定 DDL。

**不变量**：
- 人机同库：人类创建与 Agent 生成的资产**同权入库**，可互相检索、引用、再生成；需记录 `created_by: human | agent:{name}` 与血缘 `parent_id / lineage`
- 可回流：画布内生成产物（图/视频/音频/文本）必须能一键回库，且能再次作为输入回到画布
- 检索统一：前端资产页与 Agent 的 `asset_search` 共用同一查询能力（按 `kind/stage/关键词` 等），避免“人类看不见 Agent 产出”
- 占位：画布侧不再依赖 `infinite-canvas/web/src/services/image-storage.ts:15` 的 `localforage` 直存；自研前端改为 `POST /api/assets/upload → 对象存储 → DB`，画布仅作编辑器

**待定项（后续设计时确定）**：表名、是否 `projects/stages/generations` 三表、是否 `pgvector`、是否沿用 `storage_key` 与 `s3_key` 双键、权限与配额模型。确定前不在文档中固化 SQL，避免误导实现。

## 5 阶段化流程与专用UI

| 阶段 | 人类UI | Agent职责 (opencode) | 产出资产 |
|------|--------|----------------------|----------|
| 1 选题/策划 | 关键词/参考图录入、选题列表CRUD | lead 调度“策划Agent”生成3版大纲 | `text: outline` |
| 2 脚本 | 分场脚本编辑器、对话/旁白CRUD | 剧作Agent按大纲扩写，人物一致性校验 | `text: script` |
| 3 分镜 | 分镜表格（镜号/景别/台词/参考图） | 美术Agent按脚本批量 `image_generate` | `image: storyboard` |
| 4 素材 | 素材库筛选/上传/标注 | 资产Agent补齐角色/场景一致性图 | `image: character/scene` |
| 5 粗剪 | 时间线预览、镜头排序 | 视频Agent `image→video` (首帧/尾帧/运动幅度) | `video: clip` |
| 6 精修 | **进入 infinite-canvas 画布** | 剪辑Agent + 人类在画布共修 | `video: final` |

每阶段 UI 由自研前端独立实现，不基于 `infinite-canvas/web/src/pages/canvas/project.tsx` 裁剪；阶段间通过后端的 `project.current_stage` 与资产 `stage` 关联，画布仅在最后阶段被嵌入。

## 6 终局画布（集成点，人机共编）

> 画布不作为基座，仅作为**可嵌入的编辑器**在最后阶段出现；三种集成任选其一：① npm 包引入 `lib/canvas/*` ② iframe 子应用 `postMessage` ③ 独立路由 `/canvas-embed/:id` 透传。

- 入口：自研前端将阶段产物组装为 `CanvasSnapshot`（参考 `infinite-canvas/web/src/lib/canvas/canvas-agent-ops.ts:17` 结构）通过 `props/postMessage` 注入画布，而非直接写 `useCanvasStore`
- 能力复用（按需）：
  - 节点类型：复用 `Group/image/video/text/config`，必要时用插件 SDK 扩展 `storyboard:shot`
  - 生成：画布的 `ai.generateImage/Video` 改为**后端代理** `POST /api/generate/*`（隐藏 `apiKey`，缓解 `AGENTS.md:130` 直连泄露），参数形态参考 `infinite-canvas/web/src/stores/use-config-store.ts:70`
  - 协作：如需 Agent 在画布中操作，复用 `canvas-agent/src/canvas/session.ts:42` 的多Tab隔离与 `canvas_apply_ops` 工具桥，或由自研后端的 `opencode` 直接驱动 `CanvasEmbed` 的命令通道
- 产物回流：画布侧“生成完成/导出”回调自研前端，由前端执行 `POST /api/assets/from-canvas` 入库，再经资产库回到任意阶段；支持“回画布再生成”闭环

## 6.1 人机互调用闭环

```
人类在阶段2改脚本 → opencode 监听 asset.updated → 美术Agent自动重绘分镜 → 人类在阶段3看到新图 → 拖入画布微调 → 生成视频 → Agent在阶段5自动拼接 → 人类在时间线替换镜头
```
关键：人类与Agent用同一 `prompt+references` 结构（参考 `infinite-canvas/web/src/lib/canvas/canvas-resource-references.ts`），检索能力由后端统一提供，具体是否 `pgvector` 待定。

## 7 后端 opencode 编排

- **入口**：`opencode` 单容器内多Agent，通过 `lead` 路由按 `project.current_stage` 分发，`skills/store.ts` 沉淀“选题→脚本→分镜”Prompt 模板为 Skill
- **工具**：复用 `canvas-agent/src/canvas/tools.ts` 的15工具，新增 `asset_search(asset_kind, query)`, `asset_register(asset)`, `video_queue(task)`，均经 `session.callTool:489` 鉴权（`x-canvas-agent-token` + `0600` 配置）
- **队列**：视频生成走 `poll` (`model-plugin.ts:92`) 轮询 `GET /videos/:id/content`，后端统一限流/重试/成本记账（`AGENTS.md:92` 边界值需确认）
- **可观测**：`winston` 日志脱敏 `redactAgentLog:4`，落盘按日轮转，`/api/generations` 可审计

## 8 集成改造要点（不改画布源码为准）

- **前端自研**：新建独立 `web/`，**不改** `infinite-canvas/web`；资产上传直调 `POST /api/assets/upload`，不走 `infinite-canvas/web/src/services/image-storage.ts:27` 的 `localforage`；阶段路由自建，不动 `infinite-canvas/web/src/router.tsx:15`
- **画布集成**：以 SDK/iframe 嵌入，约定 `CanvasSnapshot` 交换协议与 `onGenerate/onExport` 回调；样式沿用 `infinite-canvas/web/src/lib/app-theme.ts` 的扁平风格但由自研壳统一
- **后端**：新增资产与生成代理服务，`opencode` 容器编排参考 `canvas-agent/src/agent/codex-client.ts:71` 的进程模型，但不直接复用其 `session.ts`
- **部署**：`infinite-canvas` 可作为子镜像或静态资源被主应用按需加载；`AGENTS.md:100` 8步门禁中 `⑥` 三项在代理与沙箱完成前不开放多用户

## 9 验收标准

- 人机产物在 `/assets` 同列表可互搜、互引、再生成；血缘链可追溯到 `parent_id`
- 阶段CRUD无刷新丢失，刷新后 `canvasSnapshot` 从DB恢复
- 画布内“生成视频”产物自动入库且可在资产库/时间线再编辑
- `bun audit`/`gitleaks`/`ci.yml(PR)` 全绿，`new Function/Blob import/innerHTML` 已按 `AGENTS.md:130` 隔离或书面豁免
