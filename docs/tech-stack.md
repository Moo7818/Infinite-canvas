# 技术栈

## 前端

| 层 | 选型 | 版本锚点 |
|----|------|----------|
| 构建 | Vite 7 + `@vitejs/plugin-react` | `infinite-canvas/web/package.json:7` `vite --host 0.0.0.0 --port 3000` + `vite.config.ts:15 localPluginsManifest` |
| 框架 | React 19 + React Router 7 | `web/package.json:22 react@19.2.5`, `router.tsx:15 createBrowserRouter` |
| 状态 | Zustand 5 + `persist` + `localforage` | `stores/use-canvas-store.ts:63 canvasStorage`, `use-config-store.ts:192 CONFIG_STORE_KEY` |
| UI | Ant Design 6 + Tailwind 4 + lucide-react + motion | `web/package.json:21 antd@^6.4.2`, `lib/app-theme.ts` Alias Token |
| 请求 | axios 1.16 + `buildApiUrl` 直连用户网关 | `services/api/image.ts:1` 915行网关（含OpenAI/Gemini双分支+自定义脚本） |
| 持久化 | localforage(IndexDB) 主 + localStorage 轻量开关 | `lib/localforage-storage.ts:4`, `services/image-storage.ts:15 storeName:image_files` |
| 工具 | nanoid, fflate, file-saver, dayjs, i18next, streamdown, codemirror | `web/package.json:14` |

**约束** `AGENTS.md:22-46`：外部请求统一 `services/api/`，全局状态在 `stores/`，业务大JSON禁用 `localStorage`。

## 本地 Agent

`infinite-canvas/canvas-agent/package.json:24`：`@openai/codex@0.146.0` + `express@^5.1.0` + `@modelcontextprotocol/sdk` + `winston + zod + gray-matter`，`tsx` 驱动，`node>=18`。`src/version-check.ts:51 npmView` 单次查最新版，`utils/agent-runtime.ts:4 redactAgentLog` 脱敏 `Bearer/sk-`。

## 插件 SDK

`plugins/canvas/sdk/src/define-plugin.ts:14` 仅类型辅助，`types.ts` 镜像宿主类型，`build.mjs` esbuild 单JS 产出，`jsx-runtime.ts` 复用宿主 React。`marked@14 via esm.sh`（Markdown插件 `src/index.tsx:18`）为已知XSS面。

## 构建与部署

- 两阶段 Docker `infinite-canvas/Dockerfile:2 oven/bun:1.3.13 → nginx:1.27-alpine`，`nginx.conf:7 try_files $uri /index.html` SPA回退，`docker-entrypoint.sh:12 tr -cd 'A-Za-z0-9-'` 消毒分析ID。
- `bun.lock:58` 约640行指向 `registry.npmmirror.com`，需生产切 `registry.npmjs.org` 并 `--frozen-lockfile`（`AGENTS.md:114`）。
- 4个 workflow 仅 `push tags v*` 触发，权限最小化 `contents:read + packages:write`，缺 PR 级 `audit/build`（`AGENTS.md:120` 待补 `ci.yml`）。

## 关键依赖风险

`new Function` (`model-plugin.ts:119`)、`Blob import` (`plugin-loader.ts:12`)、`innerHTML` (`svg:70/markdown:61`) 为设计级 RCE/XSS，单用户可接受，多租户需Worker沙箱+DOMPurify（`AGENTS.md:130`）。
