# Infinite Canvas MCP 工具清单 / MCP Tool Reference

> 权威来源 / Source of truth：`infinite-canvas/canvas-agent/src/canvas/schemas.ts`（`toolNames` + `toolInputSchemas` + `toolDescriptions`）。
> 本文为中英对照的只读清单；参数细节以 schemas.ts 为准。协议入口：本机 `127.0.0.1:17371`，MCP 启动命令 `npx -y @basketikun/canvas-agent@latest mcp`，opencode 注册见 `.opencode/opencode.json`。
> This is a read-only bilingual reference. Parameter details follow `schemas.ts`. Local endpoint: `127.0.0.1:17371`; MCP command: `npx -y @basketikun/canvas-agent@latest mcp`.

共 34 个工具 / 34 tools in total.

## 1. 站点导航 Site navigation（1）

### `site_navigate`
- 中文：跳转网站页面。可选 `/`、`/canvas`、`/canvas/:id`、`/image`、`/video`、`/prompts`、`/assets`、`/config`；操作画布前若不在画布页，先用本工具打开画布。
- EN: Navigate to a site page. Allowed paths: `/`, `/canvas`, `/canvas/:id`, `/image`, `/video`, `/prompts`, `/assets`, `/config`. Open the canvas first if the agent is not on a canvas page.
- 入参 / Params: `path: string`

## 2. 画布读取 Canvas reading（4）

### `canvas_get_state`
- 中文：读取当前网页画布的节点、连线、选区和视口。
- EN: Read the current canvas's nodes, connections, selection, and viewport.
- 入参 / Params: 无 / none

### `canvas_get_selection`
- 中文：读取当前网页画布选中的节点。
- EN: Read the currently selected nodes on the canvas.
- 入参 / Params: 无 / none

### `canvas_export_snapshot`
- 中文：导出当前画布快照，用于理解布局。
- EN: Export a snapshot of the current canvas to understand its layout.
- 入参 / Params: 无 / none

### `canvas_list_projects`
- 中文：列出用户全部画布（仅标题、创建/更新时间、节点数、连线数），支持搜索与分页；返回的 id 可配合 `site_navigate` 打开。
- EN: List all canvases (title, created/updated time, node/connection counts only), with keyword search and pagination; pair returned ids with `site_navigate` to open one.
- 入参 / Params: `keyword?`, `page?`, `pageSize?`

## 3. 画布写操作 Canvas writing（21）

### `canvas_apply_ops`
- 中文：批量操作当前画布。ops 支持 `add_node`、`update_node`、`delete_node`、`delete_connections`、`connect_nodes`、`set_viewport`、`select_nodes`、`run_generation`。
- EN: Batch-apply canvas operations: `add_node`, `update_node`, `delete_node`, `delete_connections`, `connect_nodes`, `set_viewport`, `select_nodes`, `run_generation`.
- 入参 / Params: `ops: CanvasOp[]`

### `canvas_create_node`
- 中文：创建节点。类型仅限五核心：`text`、`image`、`config`、`video`、`audio`。
- EN: Create a node. Type is limited to the five core types: `text`, `image`, `config`, `video`, `audio`.
- 入参 / Params: `nodeType`(必填/required), `title?`, `x?`, `y?`, `width?`, `height?`, `metadata?`

### `canvas_create_attachment_nodes`
- 中文：把对话中的图片附件创建成真实画布图片节点；返回的节点 ID 可作生成参考图。
- EN: Create real canvas image nodes from chat image attachments; returned node ids can be used as generation reference images.
- 入参 / Params: `attachmentIds[]`(必填/required), `x?`, `y?`, `gap?`, `direction?: row|column`

### `canvas_create_text_node`
- 中文：创建单个文本节点。
- EN: Create a single text node.
- 入参 / Params: `text?`, `title?`, `x?`, `y?`, `width?`, `height?`

### `canvas_create_text_nodes`
- 中文：批量创建文本节点，适合标题、段落、脚本等内容块。
- EN: Create multiple text nodes in batch — suited for titles, paragraphs, scripts, and other content blocks.
- 入参 / Params: `items[]{text, title?, x?, y?, width?, height?}`(≥1), `x?`, `y?`, `gap?`, `direction?`

### `canvas_create_config_node`
- 中文：创建生成配置节点，可指定模式与生成参数，可选立即触发生成。
- EN: Create a generation config node with mode and options; optionally run it immediately.
- 入参 / Params: `prompt?`, `mode?: text|image|video|audio`, `title?`, `x?`, `y?`, `width?`, `height?`, `autoRun?`, 生成参数 `model? size? quality? count? seconds? vquality? generateAudio? watermark? videoMode? audioVoice? audioFormat? audioSpeed? audioInstructions?`

### `canvas_create_image_prompt_flow`
- 中文：创建提示词文本节点 + 图片生成配置节点并自动连线，可选立即生图。
- EN: Create a prompt text node plus an image generation config node, auto-connected; optionally run immediately.
- 入参 / Params: `prompt`(必填/required), `x?`, `y?`, `autoRun?`, 同上生成参数 / same generation options as above

### `canvas_create_generation_flow`
- 中文：创建通用生成流程：提示词节点、配置节点、参考节点连线，可用于文案/生图/视频/音频。
- EN: Create a generic generation flow: prompt node, config node, and reference connections — for text, image, video, or audio.
- 入参 / Params: `prompt`(必填/required), `title?`, `x?`, `y?`, `mode?`, `autoRun?`, `referenceNodeIds[]?`, 同上生成参数 / same generation options

### `canvas_generate_text`
- 中文：创建文本生成流程并立即触发生成。
- EN: Create a text generation flow and start it immediately.
- 入参 / Params: `prompt`(必填/required), `title?`, `x?`, `y?`, `referenceNodeIds?`, 生成参数 / generation options

### `canvas_generate_image`
- 中文：创建图片生成流程并立即触发生成。
- EN: Create an image generation flow and start it immediately.
- 入参 / Params: 同 `canvas_generate_text` / same as `canvas_generate_text`

### `canvas_generate_video`
- 中文：创建视频生成流程并立即触发生成。
- EN: Create a video generation flow and start it immediately.
- 入参 / Params: 同 `canvas_generate_text` / same as `canvas_generate_text`

### `canvas_generate_audio`
- 中文：创建音频生成流程并立即触发生成。
- EN: Create an audio generation flow and start it immediately.
- 入参 / Params: 同 `canvas_generate_text` / same as `canvas_generate_text`

### `canvas_update_node`
- 中文：更新节点基础字段或 metadata。
- EN: Update a node's base fields or metadata.
- 入参 / Params: `id`(必填/required), `patch?`, `metadata?`

### `canvas_update_node_text`
- 中文：更新文本节点内容和标题。
- EN: Update a text node's content and title.
- 入参 / Params: `id`(必填/required), `text`(必填/required), `title?`

### `canvas_move_nodes`
- 中文：移动一个或多个节点，支持绝对坐标或 dx/dy 偏移。
- EN: Move one or more nodes, by absolute position or dx/dy offset.
- 入参 / Params: `items[]{id, x?, y?, dx?, dy?}`(≥1)

### `canvas_resize_node`
- 中文：调整节点尺寸。
- EN: Resize a node.
- 入参 / Params: `id`, `width`, `height`, `freeResize?`

### `canvas_delete_nodes`
- 中文：删除指定节点及相关连线。
- EN: Delete the given nodes and their connections.
- 入参 / Params: `ids[]`(≥1)

### `canvas_connect_nodes`
- 中文：批量连接节点。
- EN: Connect nodes in batch.
- 入参 / Params: `connections[]{fromNodeId, toNodeId}`(≥1)

### `canvas_select_nodes`
- 中文：设置当前选中节点。
- EN: Set the current selection.
- 入参 / Params: `ids[]`

### `canvas_set_viewport`
- 中文：调整画布视口（平移/缩放）。
- EN: Set the canvas viewport (pan/zoom).
- 入参 / Params: `viewport{x, y, k}`

### `canvas_run_generation`
- 中文：触发指定节点生成，通常用于配置节点或文本/图片/视频/音频节点。
- EN: Trigger generation on a node — typically a config, text, image, video, or audio node.
- 入参 / Params: `nodeId`(必填/required), `mode?`, `prompt?`

## 4. 生成状态 Generation status（1）

### `generation_get_status`
- 中文：查询当前活动网页的生成任务状态；默认返回画布与两个工作台的最近任务，可用 `scope` 过滤，`taskId` 查工作台任务，`nodeIds` 查画布节点。
- EN: Query generation task status. Defaults to recent canvas and workbench tasks; filter with `scope`, query workbench tasks by `taskId`, canvas nodes by `nodeIds`.
- 入参 / Params: `scope?: all|canvas|image|video`, `taskId?`, `nodeIds[]?`, `limit?`

## 5. 工作台 Workbench（4）

### `workbench_image_get_config`
- 中文：读取生图工作台的当前参数和可选项（模型、质量、尺寸、宽高比、张数范围），调用生成前先了解可选值。
- EN: Read the image workbench's current parameters and allowed values (model, quality, size, aspect ratio, count range) before generating.
- 入参 / Params: 无 / none

### `workbench_image_generate`
- 中文：在生图工作台填入提示词并按需设置参数，`run` 默认 true 自动点击生成；异步，返回 `taskId` 供 `generation_get_status` 查询。
- EN: Fill the image workbench prompt and options; `run` defaults to true and clicks generate. Async — returns a `taskId` for `generation_get_status`.
- 入参 / Params: `prompt`(必填/required), `model?`, `quality?`, `size?`, `count?`, `run?`

### `workbench_video_get_config`
- 中文：读取视频创作台的当前参数和可选项（模型、比例、时长、清晰度、声音与水印开关）。
- EN: Read the video workbench's current parameters and allowed values (model, aspect ratio, duration, resolution, audio and watermark toggles).
- 入参 / Params: 无 / none

### `workbench_video_generate`
- 中文：在视频创作台填入提示词并按需设置参数，`run` 默认 true 自动点击生成；异步返回 `taskId`。
- EN: Fill the video workbench prompt and options; `run` defaults to true and clicks generate. Async — returns a `taskId`.
- 入参 / Params: `prompt`(必填/required), `model?`, `size?`, `seconds?`, `resolution?`, `generateAudio?`, `watermark?`, `mode?: frames|reference`, `run?`

## 6. 提示词与素材 Prompts & assets（3）

### `prompts_search`
- 中文：搜索提示词库（第三方提示词合集），支持关键词/分类/标签与分页，返回标题、提示词、分类、标签、封面等。
- EN: Search the prompt library (third-party prompt collection) by keyword/category/tags with pagination; returns title, prompt, category, tags, cover.
- 入参 / Params: `keyword?`, `category?`, `tags[]?`, `page?`, `pageSize?`

### `assets_list`
- 中文：列出「我的素材」，支持类型过滤与搜索；为控制体积不返回图片/视频原始 data。
- EN: List "My Assets" with type filter and search; raw image/video data is omitted for payload size.
- 入参 / Params: `kind?: all|text|image|video`, `keyword?`, `page?`, `pageSize?`

### `assets_add`
- 中文：向「我的素材」新增素材。`kind=text` 用 `content` 传文本；`kind=image` 用 `imageUrl` 传地址或 dataURL。
- EN: Add an asset to "My Assets". Use `content` for text (`kind=text`); use `imageUrl` (URL or dataURL) for images (`kind=image`).
- 入参 / Params: `kind: text|image`, `title`(必填/required), `content?`, `imageUrl?`, `tags[]?`, `source?`, `note?`

## 已知边界 Known limitations

- 中文：节点类型枚举锁死五核心（`schemas.ts:6`），**不能创建自定义插件节点**（如 `character:role`、`video:film`）；插件节点可被读取与按 id 更新，metadata 全量返回（仅 `content` 超 240 字截断）；`run_generation` 对插件节点会走宿主内置流程，不触发插件自身生成。
- EN: The node-type enum is locked to the five core types (`schemas.ts:6`), so **custom plugin nodes cannot be created** (e.g. `character:role`, `video:film`). Plugin nodes can be read and updated by id; metadata is returned in full (only `content` is truncated at 240 chars). `run_generation` on a plugin node falls into the host's built-in flow and does not trigger the plugin's own generation.
- 中文：**项目级 CRUD 缺失**——没有新建/重命名/删除画布的工具；新建画布只能借助 `site_navigate("/canvas?mode=new")` 触发网页自动流程（默认标题"无限画布 N"）。
- EN: **No project-level CRUD** — there is no tool to create/rename/delete a canvas. Creating relies on `site_navigate("/canvas?mode=new")`, which triggers the web app's auto-create flow (default title "Canvas N").
- 中文：鉴权用 `canvas-agent.json` 的 `token`（查询参数或 `x-canvas-agent-token` 头）；网页侧边栏直连走 HTTP+SSE，属另一条链路（Codex 专属 turn 端点）。
- EN: Auth uses the `token` from `canvas-agent.json` (query param or `x-canvas-agent-token` header). The web sidebar uses a separate HTTP+SSE path with a Codex-specific turn endpoint.
