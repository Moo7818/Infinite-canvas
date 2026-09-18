# 二次开发文档总索引

> 项目实体位于 `infinite-canvas/`（上游同步，当前 `v0.18.0`，见 `infinite-canvas/VERSION:1`）。
> 根 `docs/` 为二次开发分析层，不复制上游用户文档；上游用户文档入口见 [上游摘要](./upstream-summary.md)。

## 二次开发层

| 文档 | 说明 |
|------|------|
| [架构设计](./architecture.md) | 分层、目录映射、画布引擎、Agent/插件、数据流 |
| [技术栈](./tech-stack.md) | 前端/Agent/代理/文档站/持久化/构建 |
| [产品设计](./product-design.md) | 定位、核心链路、亮点与不足 |
| [二次开发路线](./roadmap.md) | 方向与待办 |
| [Git 分支策略](./git-branch-strategy.md) | 双层目录 vendor copy 管理、上游同步、发版 |
| [插件开发指南](./plugin-dev-guide.md) | 插件契约/宿主机制/ctx 能力/工程流/批量约定 |
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
* 二次开发优先走插件 SDK：`infinite-canvas/plugins/canvas/sdk/src/define-plugin.ts:1`，节点类型注册见 `infinite-canvas/web/src/lib/canvas/node-registry.ts:1`。
* 本地启动：`infinite-canvas/web` 下 `bun install && bun run dev`（`:3000`，见 `infinite-canvas/web/package.json:6`）。

## 资产

* `assets/grsai-autodl-canvas-config.json`：双渠道画布导入配置（Grsai + AutoDL），用法见文件内 `_note` 字段。
