# 简报：画布 MCP 生态三线调研（libtv 对比 / 插件工具扩展 / harness 适配）

> 一页结论版。详细分析见三篇正文：
> [libtv MCP 能力对比](./mcp-libtv-comparison.md) ｜ [插件节点 MCP 工具方案](./mcp-plugin-tools-plan.md) ｜ [脱离 Codex 的 harness 适配](./harness-adaptation.md)

## TL;DR

1. **libtv MCP 是云端 85 工具的重型创作平台**（LibLib 画布，项目事务/幂等提交/资产库/剧本分镜/剪辑交付/内建 Agent 委托全链路）；**infinite-canvas MCP 是本机 34 工具的轻量画布操控面**。差距不在"谁强"，在定位：libtv 管全链路生产，我们管"浏览器本地画布 + 生成节点"。libtv 的 5 个设计（能力自描述、任务权威对账、幂等提交、模型发现、生成前校验）值得直接借鉴。
2. **插件节点 MCP 扩展路线清晰**：5 个自研插件（character/scene/prop/grid/video）现在 MCP 只能读/改/删，**建不了、触发不了生成（触发即毁节点，`project.tsx:2443-2450` 会把 type 改写成 text）**。三个候选工具按序落地：`canvas_list_node_types`（只读零风险）→ `canvas_create_plugin_node`（补创建，需消掉静默回退 Text 坑）→ `canvas_run_plugin_generation`（需 SDK 契约加 `generate?()` 钩子，5 插件改造，单独排期）。
3. **harness 适配不需要推倒重来**：MCP 工具层本就协议无关，opencode/Claude Code 已可用（确认卡通用）；Codex 独占的只是侧边栏 turn 管线。三条路线：a) 纯 MCP 增强（2-5 天，零风险）→ b) 补齐 `/agent/claude/turn` 为通用 turn 端点（1-2 周，官方规划方向 Claude Agent SDK）→ c) harness-neutral 抽象层（2-4 周，破坏性协议变更，慎做）。**opencode 接侧边栏的技术路径已验证存在**（`@opencode-ai/sdk` 已在依赖树，SSE 事件流+会话+权限确认端点齐备），b 落地后 opencode 是第一个受益客户端。

## 待拍板事项（按优先级）

| # | 事项 | 涉及 | 量级 |
|---|---|---|---|
| 1 | 候选工具 1+2：`canvas_list_node_types` + `canvas_create_plugin_node` | canvas-agent 服务端 + 宿主浏览器层，不动插件本体 | 小（形态 A/B 已列全改动文件） |
| 2 | 项目级 CRUD：`canvas_create_project`/`canvas_rename_project` | canvas-agent + 浏览器 site tool | 小 |
| 3 | libtv 借鉴包：幂等键 / 模型发现 / 生成前校验 / 任务权威对账 | canvas-agent `schemas.ts`+`session.ts` | 小-中，可打包做 |
| 4 | 候选工具 3：插件生成触发（SDK 契约 `generate?()` 钩子） | 契约双同步 + 5 插件重打 | 中，单独排期 |
| 5 | harness 方案 a（附件 harness 无关化等 MCP 增强） | `session.ts` 附件链路 | 小，可与 #1/#3 合批 |
| 6 | harness 方案 b（通用 turn 端点 + Claude Agent SDK） | canvas-agent 后端+前端 | 中（1-2 周） |
| 7 | `generation_get_status` 认 `metadata.generating`（插件生成状态可查） | `agent-site-tools.ts` 一行策略 | 极小，可捎带 |

## 风险提示

- `run_generation` 对插件节点是**毁节点级**错误（type 改写），在候选 3 落地前，任何 Agent 流程不要对插件节点调 `canvas_run_generation`。
- MCP 连线不拦 `hasTargetHandle:false`（5 插件均拒收上游连线），Agent 连线需自律。
- `versions[]` dataURL 不截断，插件图节点快照可能很大，注意工具返回体积。
- 方案 c 的路由/事件改名属破坏性协议变更（升 `AGENT_PROTOCOL_VERSION` 会强断连旧面板），且 `http.ts`/`session.ts` 是上游热点文件，同步冲突风险最高。
