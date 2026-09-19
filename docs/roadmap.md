# 二次开发路线

> 方向按“插件优先、少改上游”排序；涉及边界值（超时/重试/并发/上限）先向用户说明并取得确认，再写码。

## 方向

1. **节点插件批建**：走 `plugins/canvas/sdk`（`define-plugin.ts:1`），类型 `"<pluginId>:<name>"`（`types/canvas.ts:21`），注册经 `node-registry.ts`；详见技术报告（插件主题）。
2. **渠道与模型适配**：新中转站先写自定义调用脚本（`services/api/model-plugin.ts`），跑通再考虑进 `use-config-store.ts` 预设。
3. **画布交互打磨**：工具栏极简扁平、无多余底色，遵循 `agents/canvas-ui.md`；图片节点尊重原始比例。
4. **素材与同步**：IndexedDB 结构调整直接改（不写旧兼容）；WebDAV 同步链路补测试。
5. **本地 Agent 深化**：`canvas-agent/src/canvas/session.ts` 多 Tab 会话与 Codex 状态机，按需扩展 tool。
6. **部署硬化**：Docker 静态资源路径待办、Vercel/Render 验证结论沉淀到 `upstream-summary.md`。
7. **文档与发版纪律**：重大改动记 `CHANGELOG Unreleased`（上游文件 `infinite-canvas/CHANGELOG.md`），待办流转按 `agents/workflow.md`。

## 插件 hardening 待办（按优先级）

1. 验证 async 生效（§`grsai-integration.md:4` 三步确认法）→ `lastTaskId` 落盘：拿到 `first.id` 即写 `metadata`，刷新后自动 GET `/v1/api/result` 续查（幂等查询）。
2. 宿主 `updateMetadata` 函数式重载，插件读改写一律走它（消 versions 并发覆盖）。
3. 宿主暴露 `storeImage`，插件 metadata 只存 key（治版本膨胀）。
4. 生图脚本建任务步切 `request({..., timeout: 30000})`（早失败早提示，减误重发）。
5. 抽 `plugins/canvas/shared`（工具/组件/防重样板），三 Panel 演进为 schema 驱动（字段清单单一来源，顺带消灭 `as string` 断言与 `filledCount` 隐性耦合、内联样式缓存、`fitNode/set` 合并更新、取证标记收编）。
6. MODEL_ALLOW 可配置化（放开全量或存 metadata 用户勾选）。

## 非目标

* 不自建后端中转（除非跨域/密钥场景明确要求，此时优先 `canvas-proxy` 方案）。
* 不兼容旧本地数据（项目尚未上线，直接按新设计改）。
