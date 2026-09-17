# 技术栈（基于上游 v0.18.0 实测）

## 前端 `infinite-canvas/web`

* Vite 7 + React 19 + React Router 7 + TypeScript 5，包管理 `bun`（`web/package.json:1`，脚本见 `:6`：`dev/build/typecheck/start/format`，`dev/start` 均为 `:3000`）。
* UI：`antd ^6`（含 pro-components beta）+ Tailwind 4 + `lucide-react`；图标优先 `lucide-react` 或已用 Antd 图标。
* 状态：`zustand ^5`，全局/跨页状态放 `web/src/stores/`，画布域放 `web/src/stores/canvas/`。
* 数据请求：`axios`，外部服务统一放 `web/src/services/api/`（`request/image/video/audio/model-plugin/local-proxy/prompts/canvas-agent`），由浏览器直连，不假设项目后端。
* 持久化：`localforage`（IndexedDB），入口 `web/src/lib/localforage-storage.ts`；`localStorage` 只放极小简单配置。
* 国际化：`i18next` + `react-i18next`，文案 `web/src/i18n/locales/` 中英双语，页面文案保持中文。

## 本地 Agent `infinite-canvas/canvas-agent`

* Node + Express + SSE，对外 `http://127.0.0.1:17371`（`src/config.ts:6`，`src/server/http.ts:18`）。
* 前端经 `web/src/services/api/canvas-agent.ts` 连接；Codex/Claude Code 经 MCP 操作画布。

## 本地代理 `infinite-canvas/canvas-proxy`

* 纯 Node `node:http` 转发，加 CORS 头解决浏览器直连 AI 接口跨域（见 `canvas-proxy/index.js:1` 起）。

## 插件 SDK `infinite-canvas/plugins/canvas/sdk`

* TypeScript 契约 + `define-plugin.ts:1` 作者入口；模板 `plugins/canvas/template/`（含 `build.mjs`），注册器 `plugins/canvas/registry/`。

## 文档站 `infinite-canvas/docs`

* Next 16 + Fumadocs（`docs/package.json:1`，`dev/build/start/types:check`），内容 `docs/content/docs/*.mdx` 中英双版。

## 部署

* Docker：`bun` 构建 Vite → `nginx:alpine` 托管纯静态（`infinite-canvas/Dockerfile:1`，`EXPOSE 3000`），镜像 `ghcr.io/basketikun/infinite-canvas:latest`（`docker-compose.yml:1`）。
* Vercel：Vite 预设，`cd web && bun install/build`，SPA 重写到 `index.html`（`vercel.json:1`）。
* Render：`runtime: docker`，按 Dockerfile 部署（`render.yaml:1`）。
* 注意：Docker 静态资源路径仍有待办，文档不要过度承诺生产部署已完全验证。
