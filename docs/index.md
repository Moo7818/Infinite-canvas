# 二次开发文档总索引

> 产品实体位于 `infinite-canvas/`（上游 v0.19.0 基线 + 本地二次开发；当前产品 VERSION 为 v0.19.0）。上游仓库根目录到本地 `infinite-canvas/` 的同步规则见 [Git 策略](./git-branch-strategy.md)。
> 根 `docs/` 为二次开发分析层，不复制上游用户文档；上游用户文档入口见 [上游摘要](./upstream-summary.md)。

## 二次开发层

| 文档 | 说明 |
|------|------|
| [架构设计](./architecture.md) | 分层、目录映射、画布引擎、Agent/插件、数据流 |
| [技术栈](./tech-stack.md) | 前端/Agent/代理/文档站/持久化/构建 |
| [产品设计](./product-design.md) | 定位、核心链路、亮点与不足 |
| [二次开发路线](./roadmap.md) | 方向与待办 |
| [Git 与上游同步策略](./git-branch-strategy.md) | 代码归属、分支、上游根目录映射同步、产品发行 |
| [插件开发指南](./plugin-dev-guide.md) | 插件契约/宿主机制/ctx 能力/工程流/批量约定 |
| [Grsai 渠道集成](./grsai-integration.md) | 接口行为/三故障判定/版本确认/async 状态 |
| [MCP 工具清单](./mcp-tools.md) | 画布 MCP 41 工具中英对照/参数/边界 |
| [MCP 调研简报](./research/调研简报.md) | libtv 对比/插件工具扩展/harness 适配三线结论与待拍板项 |
| [libtv MCP 能力对比](./research/libtv-MCP能力对比.md) | libtv 85 工具面 vs 本 MCP 41 工具差异与可借鉴设计 |
| [插件 MCP 工具方案](./research/插件节点MCP工具方案.md) | 插件节点 MCP 扩展链路/候选工具/扩展点与坑 |
| [harness 适配](./research/脱离Codex的harness适配.md) | 脱离 Codex：耦合清单/三条适配路线/通用接入路径；方案 b MVP 已以 opencode 落地（见 5.1 实施状态） |
| [上游摘要](./upstream-summary.md) | 上游功能/部署文档指路（不复制原文） |

## AI 行为约束（按需加载）

| 关注点 | 文档 |
|--------|------|
| 基本原则与沉淀 | `agents/principles.md` |
| 前端规范 | `agents/frontend.md` |
| 画布 UI | `agents/canvas-ui.md` |
| 文档/发版/审查 | `agents/workflow.md` |
| 项目注意事项 | `agents/project-notes.md` |
| 安全门禁 8 步 | `agents/security-gate.md` |
| 集成指引 | `agents/integration.md` |

## 快速定位

* 8 路由：`infinite-canvas/web/src/router.tsx:15`（`/`、`/image`、`/video`、`/assets`、`/prompts`、`/canvas`、`/canvas/:id`、`/config`）。
* 自研节点优先走插件 SDK：`infinite-canvas/plugins/canvas/sdk/src/define-plugin.ts:1`；自研插件当前在 `plugins/canvas/{character,grid,prop,scene,video,shared}`。宿主 `web/src` 已含本地扩展，改动前查上游基线和 Git 历史。
* 本地启动：`infinite-canvas/web` 下 `bun install && bun run dev`（`:3000`，见 `infinite-canvas/web/package.json:6`）。

## Agent 团队（opencode）

* 根 `AGENTS.md` 为全员宪法（自动注入所有成员上下文）；各成员文件只写角色差异。
* 主智能体 `.opencode/agents/lead.md`（`mode: primary`，宪法 + 编排规则，Tab 切换使用）。
* Git 专员 `.opencode/agents/git-keeper.md`（`mode: subagent`，`@git-keeper` 直调或由 lead 指派）。
* 插件专员 `.opencode/agents/plugin-dev.md`（`mode: subagent`，仅写 `plugins/canvas/`，由 lead 指派）。
* 调用规则见 lead 文件内「Subagents 调用规则」；新增成员时同步放行 `task` 白名单。

## 资产

* `assets/grsai-autodl-canvas-config.json`：双渠道画布导入配置（Grsai + AutoDL），用法见文件内 `_note` 字段。
