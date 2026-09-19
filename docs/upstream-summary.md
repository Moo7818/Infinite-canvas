# 上游摘要（指路，不复制原文）

> 上游用户文档原文在 `infinite-canvas/docs/content/docs/`（中英双版 `.mdx`），文档站索引 `infinite-canvas/docs/index.md:1`。
> 本层只给二次开发者一句话指路；细节读原文。

## 概览 `overview/`

* `quick-start`：本地 `bun install/dev` 与 Docker `compose up`，`:3000`，首次配 `Base URL + API Key`。
* `features`：完整功能说明（画布/AI 创作/助手/Agent/插件/提示词库）。
* `docker` / `render`：容器与 Render 部署（对照根 `tech-stack.md` 部署节）。
* `codex-app-plugin`：Codex app 插件安装与 MCP 拉起。
* `third-party-prompt-repositories`：第三方提示词源接入。

## 画布 `canvas/`

* `canvas-node-manual`：节点操作手册。
* `canvas-shortcuts`：快捷键。

## 开发与数据 `development/`

* `local-development`：本地开发流程。
* `canvas-data-structure`：画布数据结构（对照 `types/canvas.ts:90`）。
* `local-codex-canvas`：本地 Codex 连接原理（对照 `canvas-agent/src/server/http.ts:18`）。

## 商业/支持 `business/ support/`

* `business`、`license`（MIT，可免费商用闭源）、`sponsor`、`security`（漏洞提交）。

## 进度 `progress/`

* `todo` / `pending-test` / `changelog`：上游待办与可测变更。
* `prompt-chip-input-plan` / `local-agent-integration-plan`：专项计划。
* 二次开发纪律：上游 `pending-test` 只记录上游变更；我们的变更记 `infinite-canvas/CHANGELOG.md Unreleased`，不要混写。
