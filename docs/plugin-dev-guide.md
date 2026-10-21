# 节点插件开发指南（对照产品 v0.19.0；改动前核对当前 SDK）

> 插件 = 一个 ESM bundle（默认导出 `CanvasPlugin` 对象或工厂函数），宿主以 `Blob → import()` 动态评估加载。
> 插件优先通常能减少宿主耦合；遇到 SDK 表达不了的能力，先评估宿主契约扩展，再决定是否改上游代码。

## 1 契约（作者唯一 API）

* 插件侧契约 `infinite-canvas/plugins/canvas/sdk/src/types.ts` 是宿主 `web/src/types/canvas-plugin.ts` 的自包含镜像；契约变更要同步两处并核对现有插件。
* 作者入口 `infinite-canvas/plugins/canvas/sdk/src/define-plugin.ts:1`：`definePlugin({id, name, version, nodes})` 或工厂 `(runtime) => ({...})`。
* 节点类型全局唯一，约定 `"<pluginId>:<name>"`（如 `svg:vector`）；宿主以开放字符串接纳（`infinite-canvas/web/src/types/canvas.ts:21`）。

## 2 宿主机制

| 环节 | 位置 | 要点 |
|------|------|------|
| 注册 | `web/src/lib/canvas/node-registry.ts` | `registerNodeDefinitions(defs, pluginId)`，卸载整组移除；未注册类型回退 340×240 |
| 加载 | `web/src/lib/canvas/plugin-loader.ts:11/31` | Blob URL + `@vite-ignore` import，取 `default ?? plugin`；非法导出/缺字段抛 `pluginErrors.*` |
| 运行时 | `web/src/lib/canvas/plugin-runtime.ts:28` | 单例 React + `injectCSS` + 事件总线；**插件不准自带 React**（esbuild external） |
| ctx 组装 | `web/src/lib/canvas/plugin-node-context.ts:9` | 每次渲染注入 `CanvasNodeContext` |
| AI 桥接 | `web/src/pages/canvas/hooks/use-plugin-host.tsx` | `ctx.ai` 复用宿主渠道；Key 不由 ctx 参数传给插件，未配置时宿主提示配置 |
| 持久化 | `web/src/stores/canvas/use-plugin-store.ts:6` | 源码缓存支持离线，localforage 持久化 |

## 3 `ctx` 能力

自身：`updateMetadata/updateNode`；读图：`getNode/getNodes/getConnections/getUpstream/getDownstream`；
操作：`applyOps`（8 种 `CanvasAgentOp`，见 `web/src/lib/canvas/canvas-agent-ops.ts:7`，与 Agent 同级）；
通信：`emit/on`；AI：`ai.generateImage/generateVideo/generateText + listModels/defaultModel`；
面板：`openPanel/closePanel`；私有 KV：`storage`（按插件 id 隔离）；主题：`theme/scale/isSelected`。

## 4 节点定义开关（以当前 SDK 类型为准）

* `Content/Panel/toolbar/onDoubleClick`：渲染三件套；`interactionToggle: true` 时宿主自动拼「交互⇄移动」开关。
* `useBuiltinPanel: {mode, promptPrefix?, writeBackToSelf?}`：零成本复用宿主生成面板，与自定义 `Panel` 二选一。
* `transparentBackground`（融入画布）、`hidePanel`（纯展示）、`autoOpenPanel`、`forceInteractive`、`keepAspectRatio`、`showInCreateMenu/hasSourceHandle/minimapColor`。
* `resource(node)`：声明作上游输入时输出 `{kind: image|video|audio|text}`，决定能否连给生成节点。
* `generate?(ctx)`：声明后宿主可程序化触发本节点的自定义生成（Agent 的 `run_generation`、工具条等走它）——从 `ctx.node.metadata` 读入参、用 `ctx.ai` 生成、写回节点；不声明则 `run_generation` 回退宿主内置流程。角色节点已接入（面板按钮与宿主共用 `runCharacterGenerate`）。

## 5 工程流

1. 复制 `infinite-canvas/plugins/canvas/template/`（示例 `src/index.tsx:1`：编辑态、`getUpstream`、`applyOps` 衍生节点、`data-canvas-no-zoom` + `stopPropagation`、只用 `ctx.theme` 取色）。
2. `node build.mjs`（`sdk/build.mjs:17`）：esbuild 打包 + 同步 `web/public/plugins/` + 维护 `index.json`（gitignore，仅本地）。
3. 联调：`npm run dev`（--watch）+ 画布自动发现；或 `VITE_DEV_PLUGINS=<url>` 免安装热载（`plugin-loader.ts:153`）。
4. 官方发布：`registry/build.mjs` 的 `OFFICIAL` 登记，`package.json version` 单一真源 → 打 `v*` tag → CI 强推 `plugins-dist` 分支 → jsDelivr 拉清单（见 `registry/README.md`）。**第三方插件不走此流程，用户填 JS URL 安装**。
5. 四态：URL 安装（替换旧版）/ 启用禁用（local 启用时重拉）/ 更新（bust 缓存）/ 卸载（先 deactivate 再删记录）。

## 6 上游插件模式参考

`markdown` 文本渲染；`svg` 透明背景 + 双击编辑 + 上游源码自动采用 + `pointerEvents:none` 拖拽穿透；
`html` 沙箱 iframe + `{{input}}` 上游注入；`panorama` 交互/移动切换 + 面板前缀约束；`sticky-note` 颜色 + 双击编辑。

## 7 批量开发约定

* `id` kebab-case，`type = <id>:<name>`，`version` 与 `package.json` 一致，`minAppVersion` 卡宿主版本。
* 只用 `ctx.theme` 取色；操作按钮扁平无底色（见 `agents/canvas-ui.md`）；交互控件加 `data-canvas-no-zoom` 并阻止冒泡。
* 状态放 `metadata`（扁平字段袋，生成/连线体系可读）；跨会话私有数据放 `ctx.storage`。
* 需生成能力直接调 `ctx.ai`，不自接接口；`system` 提示词插件自拼。
* 安全：远端源码即不可信；`dangerouslySetInnerHTML` 仅用于可信内容，HTML 类内容使用有明确限制的 iframe；`setup` 返回 cleanup；事件名加插件前缀。
* 插件分支按仓库策略命名 `feature/<topic>`；产品可见改动记产品 CHANGELOG。验证按用户要求和任务约定执行，报告是否运行及结果。

## 8 自研插件经验（character/scene/prop/grid/video）

* **metadata 命名空间**：新字段带插件前缀（如 `sceneTime`），`name/model/versions/content` 等通用键与宿主混居，未来撞车风险由本约定规避；`content` 作通用输出位是有意的，保留。
* **错误分类**：当前插件错误处理中仍有按消息文本判断的路径，容易受文案和语言影响；优先使用宿主保留的 `error.code`（如 `ERR_NETWORK/ECONNABORTED/ERR_CANCELED`），缺失时再回退显示消息。
* **读改写竞态**：`ctx.node` 是渲染快照。宿主 `updateMetadata` 已支持函数式更新；对追加列表等依赖最新值的读改写使用函数式重载，避免闭包快照覆盖。
* **生成态三件套**：内存互斥 Map（同步检查占用）+ `metadata.generating` 持久 + 刷新中断显式标记（真续跑需 taskId 落盘，见 roadmap）；取消走模块级 `AbortController`。
* **版本存储**：dataURL 全量进 metadata 会膨胀（2K 单张 5–10MB）；目标是宿主暴露 `storeImage`，metadata 只存 key。见 roadmap。
* **模型筛选**：自研生成插件已有 `metadata.modelAllow` 覆盖默认 `MODEL_ALLOW` 的能力；是否增加可发现的 UI 仍待评估，不要说成尚不可配置。
* **脚本超时**：`http` helper 不支持 timeout（见 minimax 脚本改用 `request` 的先例）；生图脚本建任务步同样切 `request({..., timeout: 30000})`，早失败早提示。见 roadmap。
* **幂等头**：POST 带 `X-Request-Id`，上游未承诺也无害，并作为推动其支持幂等键的依据。
* **双重标注**：宿主 `requestEdit` 会给 prompt 加"参考图片编号…"前缀，与插件自拼的"（环境参考图片1、2）"语义一致（`toReferences` 保序），仅冗余，无冲突。
* **共享代码包**（已落地）：`plugins/canvas/shared`（`versions/media/fields/generation/imports/ui`），插件通过 `file:../shared` 引用并随 bundle 打包，不独立发布。共享稳定通用能力；提示词拼装、业务流程与业务状态策略留各插件。
* **构建取证**：`build.mjs` 保留可读函数名以便定位运行时告警；各插件 `package.json` 版本与 `definePlugin` 版本保持一致。源码有发布变化时同步提升插件版本，避免缓存继续使用旧 bundle。

## 安全边界

URL 安装的插件通过 Blob 动态导入，运行在应用页面的 JavaScript 环境中，并非 iframe 沙箱。`ctx` 不暴露 API Key 只是 SDK 接口约束，不能阻止插件访问页面本身可访问的数据或浏览器 API。只安装自己审过或明确信任的源码；更新插件时重新检查来源和差异。自定义模型脚本也属于可执行代码，宿主通过 `new Function` 执行，不应描述为具备安全隔离的沙箱。
