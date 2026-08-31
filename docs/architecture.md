# 架构设计

## 1 整体分层

```
UI 层      pages/* + components/canvas/* (AntD + Tailwind + lucide-react)
状态层     stores/* + stores/canvas/* (Zustand5)
引擎层     lib/canvas/* (15文件: node-registry/plugin-loader/canvas-agent-ops/geometry)
服务层     services/api/* (image.ts 915行 全量AI网关) + image-storage/file-storage
持久层     lib/localforage-storage.ts → localforage(IndexDB) + localStorage 降级
类型层     types/canvas.ts + types/canvas-plugin.ts
本地Agent  canvas-agent/src/server/http.ts(Express+SSE) + canvas/session.ts(MCP会话)
插件层     plugins/canvas/sdk + template/html/markdown/svg/panorama/sticky-note
```

**无后端设计**：`infinite-canvas/web/src/stores/use-config-store.ts:332 buildApiUrl` 浏览器直连用户 `baseUrl`，`AGENTS.md:92` 画布/素材全量本地化。

## 2 目录映射

```
infinite-canvas/
├── web/src/router.tsx:15        # 8路由: /,/image,/video,/assets,/prompts,/canvas,/canvas/:id,/config
├── web/src/pages/canvas/project.tsx # 单项目工作台（viewport/节点/连线/工具栏整合）
├── web/src/stores/canvas/use-canvas-store.ts:63 # projects持久化 400ms节流
├── web/src/stores/use-config-store.ts:192       # 多渠道 ModelChannel + 四类默认模型
├── web/src/stores/use-agent-store.ts:98         # SSE连接/线程/权限
├── web/src/lib/canvas/canvas-agent-ops.ts:7    # 8种 CanvasAgentOp 纯函数归约
├── canvas-agent/src/server/http.ts:18 startHttpServer # 127.0.0.1:17371 + validToken:538
├── canvas-agent/src/canvas/session.ts:42 CanvasSession # 多Tab隔离 + Codex状态机
├── plugins/canvas/sdk/src/types.ts              # CanvasPlugin 契约
└── .github/workflows/*                          # 4个 v* tag触发流
```

## 3 画布引擎

- **视口** `infinite-canvas/web/src/components/canvas/infinite-canvas.tsx:21`：受控 `viewport{x,y,k}`，`Ctrl/Space`切pan，按鼠标锚点缩放0.05~5，RAF节流平移。
- **节点** `types/canvas.ts:12/87`：`CanvasNodeType(Image|Text|Config|Video|Audio|Group|插件扩展)`，`CanvasNodeData{position,width,height,metadata}`，`metadata`含 `content/prompt/model/size/references/storageKey` + 插件自定义键。
- **工厂** `lib/canvas/canvas-node-factory.ts:9` 按 `node-registry.ts:53 getNodeSpec` 决尺寸。
- **操作归约** `lib/canvas/canvas-agent-ops.ts:37 applyCanvasAgentOps` 供前端与Agent共用。
- **资源引用** `canvas-resource-references.ts` 把上游节点解析为 `CanvasResource{kind:'image'|'text'}` 供生成节点消费。

## 4 本地 Agent

`canvas-agent/src/server/http.ts:18`：`loadConfig(true)` 生成 `token=crypto.randomBytes(18):21 0600落盘`，`express.json 30mb:106`，`setCors:521` 记录首个 `Origin`，`validToken:538` 验 `?token`或`x-canvas-agent-token`。

**会话** `canvas/session.ts:42`：`clients/map + canvasStates/map` 多Tab隔离，`target=bound||active:76`，`codexState{busy,threadId,turnId}` + `conversationState{revision,status,mcpStatuses}` 状态机 `idle→preparing→ready→running`，`requestCanvasTool:489` 经 SSE `tool_call` → 前端执行 → `/canvas/result` 回填30s超时。

**Codex** `agent/codex.ts:54` `codexQueue` Promise串行，`codex-client.ts:71 spawn(codex app-server)` JSON-RPC，`generateCodexSkillDraft` 时 `canvasSkillSource:293` 裁剪300节点/600连线并脱敏 `apiKey/token/webUrl`。

## 5 插件系统

`plugins/canvas/sdk/src/types.ts` 定义 `CanvasPlugin{id,nodes,css,setup}`，`CanvasNodeContext:212` 暴露 `updateMetadata/getUpstream/applyOps/ai/storage/emit`。加载器 `web/src/lib/canvas/plugin-loader.ts:11 evaluatePluginSource` 以 `Blob→import(--vite-ignore)` 评估，`activatePlugin:31` 注册+注样式。`plugin-runtime.ts:28 getPluginRuntime` 单例注入 `React/host`。官方5插件打包进 `plugins-dist` 孤儿分支。

## 6 数据流

`用户交互→store更新→400ms节流→localforage→(可选)WebDAV同步`；`Agent/MCP→Session.tool_call→前端applyOps→postState回传`。消息三级归属 `threadId/turnId/itemId` `AGENTS.md:92`，实时事件仅补未物化turn。
