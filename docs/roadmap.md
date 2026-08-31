# 二次开发方向

## 1 画布编排补齐（短期·低风险高价值）

- 自动布局：基于 `dagre` 对选中子图分层排布，复用 `lib/canvas/canvas-node-geometry.ts`，新增 `CanvasAgentOp:layout_nodes` 供Agent调用。
- 组容器完善：`types/canvas.ts:18 Group` 支持折叠/重命名/批量导出，解决布局失控。
- 模板市场：`CanvasProject` JSON 模板存 `localforage`，一键复用常用“文→图→视频”流。

## 2 云同步与协作（中期·需后端）

沿 `WebdavSyncConfig` (`use-config-store.ts:56`) 抽象 `SyncProvider`（S3/WebDAV/自建API），在 `use-canvas-store.ts:53` 400ms节流处加防抖上传，冲突 `updatedAt+CRDT`。`image-storage.ts` Blob 同步至对象存储，`resolveImageUrl` 走CDN。需同步更新 `SECURITY.md` 直连声明，密钥改后端代理注入。

## 3 插件生态硬化（对应 AGENTS.md:130 阻断项）

- 沙箱化：`model-plugin.ts:119 new Function` 与 `plugin-loader.ts:12 Blob import` 改 `Worker/Comlink` 或 `iframe sandbox`，仅暴露 `ctx.ai/storage/emit`。
- 信任链：`plugin-registry.ts:17` 增 `SRI` + `url allowlist`，默认禁用远程插件，安装前二次确认。
- 消毒：`markdown/svg` 接 `DOMPurify` 剥离 `script/foreignObject/on*`。

## 4 生成可观测与可控

- 任务中心：统一 `image/video/text` 的 `taskId/poll`（复用 `model-plugin.ts:92 poll`），全局队列/取消/重试对比。
- 参数下沉：`size/quality/count/reasoningEffort/videoSeconds` 从 `defaultConfig:70` 下沉为节点级覆写，支持 Seed/Steps/Guidance 透传。
- 成本审计：`image_generation_logs/video_generation_logs` 关联 `model/prompt/references` 做预算看板。

## 5 Agent 一等公民化

- 无本地Agent模式：前端直连云端 `codex app-server` WSS，降低安装门槛。
- 后端渲染：`canvas-export.ts + canvas-video-frame.ts` 走 `OffscreenCanvas` 一键出片/拼接视频。
- Skill商店：基于 `skills/store.ts` 做搜索/评分/安装（`todo.mdx` 已规划Skill搜索），草稿 `assertDraftHasNoSensitiveValues:420` 复用审核。

## 6 企业级加固

补 `ci.yml`（PR: build+typecheck+bun audit+docker --dry-run），`Dockerfile:2` 锁 digest，`.npmrc` 锁 `registry.npmjs.org`。密钥改后端代理（`image.ts:341 aiHeaders` 的 `Bearer` 由网关注入，前端仅持短期 `sessionToken`），`latest` 改 digest 部署。

## 7 资产化增长

- 素材图谱：`assets` 页标签/相似搜索/去重，基于 `prompt` 倒排索引，直接拖入画布成参考图。
- 提示词版本：团队私有源 + A/B分组 + 效果回溯，形成“提示词→生成→收藏”闭环。

## 落地清单

1. 新环境先走 `AGENTS.md:100` 8步门禁，③换官方源、`⑥` 三项隔离先行。2. 新能力优先插件 SDK `plugins/canvas/template`，不改核心渲染链路。3. 每项完成后按文档规范 `todo→pending-test→features` 流转，同步 `CHANGELOG Unreleased`。
