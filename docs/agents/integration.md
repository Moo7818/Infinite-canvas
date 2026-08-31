# 二次开发集成指引

- 沿用 `web/src/pages/canvas|components/canvas|stores/canvas` 与 `lib/canvas`、`services/api/`。
- 新增能力走插件 SDK `plugins/canvas/sdk/src/define-plugin.ts:1` + `template`，不改核心渲染，官方插件走 `plugins-dist` 孤儿分支。
- 持久化 `localforage`（`web/src/services/image-storage.ts:10`），`localStorage` 仅轻量开关。
- AI 直连 `buildApiUrl:389` 前端网关，需隐藏 Key 则增后端代理并更新 `SECURITY.md`。
