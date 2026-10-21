# Infinite Canvas · 二次开发仓库

基于上游开源项目 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas)（无限画布 + AI 生图/视频/音频）的二次开发仓库，在其之上扩展了自研插件节点、侧边栏 Agent（opencode harness）、画布 MCP 工具与渠道集成等能力。

> 本仓库是**双层结构**：根目录是二次开发协作层，产品实体在 `infinite-canvas/`。上游把产品文件放在仓库根，本仓库把同一产品树放在 `infinite-canvas/`（vendor copy，非 submodule），因此不能把 `upstream/main` 直接 merge 进来。详见 [`docs/git-branch-strategy.md`](docs/git-branch-strategy.md)。

## 目录结构

| 路径 | 层次 | 职责 |
|------|------|------|
| `AGENTS.md`、`docs/`、`.opencode/` | 协作层 | 二次开发规则、架构/调研/路线文档、Agent 团队配置（不进产品发行包） |
| `infinite-canvas/` | 产品层 | 可构建、可部署的产品树：`web/`（前端）、`canvas-agent/`（侧边栏 Agent 服务）、`plugins/`（画布插件）、`canvas-proxy/`、文档站与 `VERSION`/`CHANGELOG.md` |
| `opencode-runtime/` | 运行时 | 侧边栏 Agent 使用的 opencode 独立运行时（固定 `opencode-ai@1.19.3`），与产品源码解耦 |

## 核心二次开发内容

- **自研插件节点**：角色、场景、道具、宫格调度图、影片节点，带表单字段、版本管理与参考图。
- **侧边栏 Agent（opencode harness）**：画布内置对话式 Agent，以 opencode 为执行后端，模型列表跟随 opencode 已配置的 provider。
- **画布 MCP 工具**：把画布读写、生成、插件节点创建等能力经 MCP 暴露给 Agent（清单见 [`docs/mcp-tools.md`](docs/mcp-tools.md)）。
- **渠道与代理**：Grsai 生图/视频渠道集成、本地代理转发等。

## 快速开始

```bash
# 1) 前端（Vite + React，默认 http://localhost:3000）
cd infinite-canvas/web && npm install && npm run dev

# 2) 侧边栏 Agent 服务（默认 http://127.0.0.1:17371）
cd infinite-canvas/canvas-agent && npm install && npm run build && npm start
#   开发态可用 npm run dev（tsx，免构建）；加 --debug 输出调试日志

# 3) opencode 运行时（canvas-agent 会自动拉起 opencode serve，:17372）
cd opencode-runtime && npm install
```

Agent 连接令牌与工作空间等配置位于 `~/.infinite-canvas/canvas-agent.json`。前端在画布页右侧「Agent」面板填入地址与令牌即可连接。

## 文档

- 二次开发文档总索引：[`docs/index.md`](docs/index.md)
- AI/自动化开发约束入口：[`AGENTS.md`](AGENTS.md)
- 产品用户文档与功能说明：[`infinite-canvas/README.md`](infinite-canvas/README.md) 及 `infinite-canvas/docs/`
- 产品版本记录：[`infinite-canvas/CHANGELOG.md`](infinite-canvas/CHANGELOG.md)、`infinite-canvas/VERSION`

## 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 稳定发布线 |
| `develop` | 集成线 |
| `feature/<topic>` | 单项功能，从 `develop` 开始 |
| `sync/upstream-<version>` | 上游基线同步 |
| `hotfix/<topic>` | 从 `main` 修复后回合 `develop` |

合并受保护分支前走 PR，不对 `main`/`develop` force-push。完整规则见 [`docs/git-branch-strategy.md`](docs/git-branch-strategy.md)。

## 上游

- 上游仓库：`upstream` → [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas)
- 当前上游基线：**v0.19.0**；产品 `VERSION` 为 v0.19.0。基线升级流程见 [`docs/git-branch-strategy.md`](docs/git-branch-strategy.md) 与 [`docs/upstream-summary.md`](docs/upstream-summary.md)。
