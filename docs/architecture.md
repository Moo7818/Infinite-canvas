# 架构设计（基于上游 v0.18.0 实测）

## 1 整体分层

```
UI 层      web/src/pages/* + web/src/components/canvas/*（AntD + Tailwind + lucide-react）
状态层     web/src/stores/* + web/src/stores/canvas/*（Zustand5）
引擎层     web/src/lib/canvas/*（14 文件：node-registry / plugin-loader / canvas-agent-ops / geometry…）
服务层     web/src/services/api/*（image / video / audio / model-plugin / request / local-proxy…）
持久层     web/src/lib/localforage-storage.ts → localforage（IndexedDB），小配置走 localStorage
类型层     web/src/types/canvas.ts + web/src/types/canvas-plugin.ts
本地 Agent canvas-agent/src/server/http.ts（Express + SSE）+ canvas-agent/src/canvas/session.ts（MCP 会话）
插件层     plugins/canvas/sdk + template / registry + html / markdown / svg / panorama / sticky-note
```

**无后端设计**：浏览器直连用户配置的 `baseUrl`，多渠道见 `infinite-canvas/web/src/stores/use-config-store.ts:18`（`ModelChannel`）与 `:28`（`channelMode`）。

## 2 目录映射

```
infinite-canvas/
├── web/src/router.tsx:15              # 8 路由（+ * 兜底 NotFound）
├── web/src/pages/canvas/project.tsx   # 单项目工作台（视口/节点/连线/工具栏整合）
├── web/src/stores/canvas/             # 画布域 store（项目、插件、侧面板…）
├── web/src/stores/use-config-store.ts:18  # 多渠道 ModelChannel + 四类默认模型
├── web/src/stores/use-agent-store.ts  # Agent 连接/线程/权限
├── web/src/lib/canvas/canvas-agent-ops.ts:7  # 8 种 CanvasAgentOp 纯函数归约
├── canvas-agent/src/config.ts:6       # DEFAULT_PORT = 17371
├── canvas-agent/src/server/http.ts:18 # startHttpServer，127.0.0.1 监听（:434）
├── plugins/canvas/sdk/src/types.ts    # CanvasPlugin 契约
└── docs/content/docs/                 # 上游用户文档站（Next16 + Fumadocs，见 upstream-summary.md）
```

## 3 画布引擎

* **视口** `infinite-canvas/web/src/components/canvas/infinite-canvas.tsx`：受控 `viewport{x,y,k}`，缩放/平移。
* **节点** `infinite-canvas/web/src/types/canvas.ts:12`：`CanvasNodeType` 6 内置（image/text/config/video/audio/group）；`:21` 插件类型为开放字符串 `"<pluginId>:<name>"`；`:90` `CanvasNodeData{position,width,height,metadata}`。
* **工厂** `infinite-canvas/web/src/lib/canvas/canvas-node-factory.ts` 按 `node-registry.ts` 的 `getNodeSpec` 决尺寸（未注册类型回退 340×240）。
* **操作归约** `infinite-canvas/web/src/lib/canvas/canvas-agent-ops.ts:7`：`add_node / update_node / delete_node / delete_connections / connect_nodes / set_viewport / select_nodes / run_generation`，前端与 Agent 共用同一套语义。
* **资源引用** `infinite-canvas/web/src/lib/canvas/canvas-resource-references.ts` 把上游节点解析为资源，供生成节点消费。

## 4 本地 Agent

`canvas-agent/src/server/http.ts:18`：`startHttpServer`，端口取 `PORT` 或配置 URL 端口或 `DEFAULT_PORT(17371)`（见 `:20` 与 `config.ts:6`），`app.listen(port, "127.0.0.1")`（`:434`）。
前端侧 `web/src/services/api/canvas-agent.ts` 对接；会话/状态机在 `canvas-agent/src/canvas/session.ts`。

## 5 插件系统

* 契约 `plugins/canvas/sdk/src/types.ts`：`CanvasPlugin{id, nodes, css, setup}`；作者入口 `sdk/src/define-plugin.ts:1`（对象或工厂两种形式）。
* 加载 `web/src/lib/canvas/plugin-loader.ts:11`：`evaluatePluginSource` 以 `Blob → import(/* @vite-ignore */ url)` 动态评估远端源码；`:31` `activatePlugin` 注册节点定义 + 注入 `css` + 执行 `setup(runtime)`。
* 注册 `web/src/lib/canvas/node-registry.ts`：`registerNodeDefinitions(defs, pluginId)` / `unregisterPluginNodes(pluginId)`，`ownerByType` 记录归属，卸载时整组移除。
* 官方模板与注册器：`plugins/canvas/template/`、`plugins/canvas/registry/`；内置示例：`html/markdown/svg/panorama/sticky-note/`。

## 6 数据流

`用户交互 → store 更新 → localforage 持久化 →（可选）WebDAV 同步`；`Agent/MCP → tool_call → 前端 applyOps → 状态回传`。
自定义模型调用脚本经 `web/src/services/api/model-plugin.ts` 沙箱执行（`http/poll/sleep/signal/onDelta/onProgress` 注入）。
