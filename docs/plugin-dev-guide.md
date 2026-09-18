# 节点插件开发指南（上游 v0.18.0 实测）

> 插件 = 一个 ESM bundle（默认导出 `CanvasPlugin` 对象或工厂函数），宿主以 `Blob → import()` 动态评估加载。
> 批量开发插件**不需要改上游源码**，是二次开发成本最低的路径。

## 1 契约（作者唯一 API）

* 公开契约 `infinite-canvas/plugins/canvas/sdk/src/types.ts:1`（自包含镜像，源头为宿主 `web/src/types/canvas-plugin.ts`；宿主改契约需同步 SDK）。
* 作者入口 `infinite-canvas/plugins/canvas/sdk/src/define-plugin.ts:1`：`definePlugin({id, name, version, nodes})` 或工厂 `(runtime) => ({...})`。
* 节点类型全局唯一，约定 `"<pluginId>:<name>"`（如 `svg:vector`）；宿主以开放字符串接纳（`infinite-canvas/web/src/types/canvas.ts:21`）。

## 2 宿主机制

| 环节 | 位置 | 要点 |
|------|------|------|
| 注册 | `web/src/lib/canvas/node-registry.ts` | `registerNodeDefinitions(defs, pluginId)`，卸载整组移除；未注册类型回退 340×240 |
| 加载 | `web/src/lib/canvas/plugin-loader.ts:11/31` | Blob URL + `@vite-ignore` import，取 `default ?? plugin`；非法导出/缺字段抛 `pluginErrors.*` |
| 运行时 | `web/src/lib/canvas/plugin-runtime.ts:28` | 单例 React + `injectCSS` + 事件总线；**插件不准自带 React**（esbuild external） |
| ctx 组装 | `web/src/lib/canvas/plugin-node-context.ts:9` | 每次渲染注入 `CanvasNodeContext` |
| AI 桥接 | `web/src/pages/canvas/hooks/use-plugin-host.tsx:42` | `ctx.ai` 复用宿主渠道；**插件拿不到 Key**，未配置时宿主弹配置窗 |
| 持久化 | `web/src/stores/canvas/use-plugin-store.ts:6` | 源码缓存支持离线，localforage 持久化 |

## 3 `ctx` 能力

自身：`updateMetadata/updateNode`；读图：`getNode/getNodes/getConnections/getUpstream/getDownstream`；
操作：`applyOps`（8 种 `CanvasAgentOp`，见 `web/src/lib/canvas/canvas-agent-ops.ts:7`，与 Agent 同级）；
通信：`emit/on`；AI：`ai.generateImage/generateVideo/generateText + listModels/defaultModel`；
面板：`openPanel/closePanel`；私有 KV：`storage`（按插件 id 隔离）；主题：`theme/scale/isSelected`。

## 4 节点定义开关（`sdk/src/types.ts:267`）

* `Content/Panel/toolbar/onDoubleClick`：渲染三件套；`interactionToggle: true` 时宿主自动拼「交互⇄移动」开关。
* `useBuiltinPanel: {mode, promptPrefix?, writeBackToSelf?}`：零成本复用宿主生成面板，与自定义 `Panel` 二选一。
* `transparentBackground`（融入画布）、`hidePanel`（纯展示）、`autoOpenPanel`、`forceInteractive`、`keepAspectRatio`、`showInCreateMenu/hasSourceHandle/minimapColor`。
* `resource(node)`：声明作上游输入时输出 `{kind: image|video|audio|text}`，决定能否连给生成节点。

## 5 工程流

1. 复制 `infinite-canvas/plugins/canvas/template/`（示例 `src/index.tsx:1`：编辑态、`getUpstream`、`applyOps` 衍生节点、`data-canvas-no-zoom` + `stopPropagation`、只用 `ctx.theme` 取色）。
2. `node build.mjs`（`sdk/build.mjs:17`）：esbuild 打包 + 同步 `web/public/plugins/` + 维护 `index.json`（gitignore，仅本地）。
3. 联调：`npm run dev`（--watch）+ 画布自动发现；或 `VITE_DEV_PLUGINS=<url>` 免安装热载（`plugin-loader.ts:153`）。
4. 官方发布：`registry/build.mjs` 的 `OFFICIAL` 登记，`package.json version` 单一真源 → 打 `v*` tag → CI 强推 `plugins-dist` 分支 → jsDelivr 拉清单（见 `registry/README.md`）。**第三方插件不走此流程，用户填 JS URL 安装**。
5. 四态：URL 安装（替换旧版）/ 启用禁用（local 启用时重拉）/ 更新（bust 缓存）/ 卸载（先 deactivate 再删记录）。

## 6 现有 5 插件模式（新插件先对号入座）

`markdown` 文本渲染；`svg` 透明背景 + 双击编辑 + 上游源码自动采用 + `pointerEvents:none` 拖拽穿透；
`html` 沙箱 iframe + `{{input}}` 上游注入；`panorama` 交互/移动切换 + 面板前缀约束；`sticky-note` 颜色 + 双击编辑。

## 7 批量开发约定

* `id` kebab-case，`type = <id>:<name>`，`version` 与 `package.json` 一致，`minAppVersion` 卡宿主版本。
* 只用 `ctx.theme` 取色；操作按钮扁平无底色（见 `agents/canvas-ui.md`）；交互控件加 `data-canvas-no-zoom` 并阻止冒泡。
* 状态放 `metadata`（扁平字段袋，生成/连线体系可读）；跨会话私有数据放 `ctx.storage`。
* 需生成能力直接调 `ctx.ai`，不自接接口；`system` 提示词插件自拼。
* 安全：远端源码即不可信；`dangerouslySetInnerHTML` 仅用于可信内容，HTML 类走沙箱 iframe；`setup` 返回 cleanup；事件名加插件前缀。
* 每插件独立 `feature/plugin-<id>` 分支，模板自带 `typecheck`；`CHANGELOG Unreleased` 一句话。
