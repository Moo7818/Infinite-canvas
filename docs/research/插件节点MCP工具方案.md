# 基于二次开发插件节点新增 MCP 工具方案

> 前置调研已完成（只读取证，全部带文件:行号）。本文为设计文档，未拍板不动代码。
> 关联：`docs/mcp-tools.md`（工具清单与已知边界）、`docs/plugin-dev-guide.md`（插件契约）。
> **实现状态（2026-10-21）**：候选 1（`canvas_list_node_types`）与候选 2（5 个语义创建工具 + `add_node` 未注册类型报错 + `generation_get_status` 认 `generating/generateError`）已在 `feat/mcp-plugin-tools` 分支实现，工具总数 34 → 39；候选 3 仍待契约拍板。

## 1. 现状：5 个自研插件节点

安装清单：`infinite-canvas/web/public/plugins/index.json:1-7`（plugin-loader.ts:122 自动发现）。

| nodeType | 功能 | 生成方式 | 关键 metadata |
|---|---|---|---|
| `character:role` | 角色设定图 | Panel 内闭包 `generate` → `ctx.ai.generateImage(prompt,{references})` | `name/age/traits/style/faceText/faceImages(≤3)/outfitText/outfitImages(≤2)/…`；运行态 `generating/generateError/versions[]` |
| `scene:view` | 场景图 | 同上 | `name/time/style/envText/envImages/lightText/lightImages/camera/…` |
| `prop:item` | 道具图 | 同上 | `name/category/style/materialText/materialImages/detailText/…` |
| `grid:board` | 2×2 宫格调度 | `generateText` 扩写 → `generateImage`（引用上游角色/空间节点） | `castIds[]/spaceId/doc` |
| `video:film` | 影片生成 | `ctx.ai.generateVideo(prompt,{references,model,size,seconds})` | `name/model/ratio/seconds/prompt/refs[]` |

**关键事实**：
- 生成入口是各自 Panel 组件里的 **React 闭包**，`CanvasNodeDefinition` 契约（`web/src/types/canvas-plugin.ts:104-131`）**没有外部可调的 generate 钩子**。
- 结果统一写 `metadata.versions[] + activeVersionId + content`（`shared/src/versions.ts:36-47`），生成中标 `metadata.generating`（**不是**宿主的 `metadata.status`）。
- 宿主事件总线 `canvas-event-bus` 只有插件侧接线，宿主从不 emit——**没有"宿主→插件"触发通道**。

## 2. MCP 链路：新增工具要改什么

链路全景（服务端 → 浏览器）：
```
mcp.ts:13 注册（遍历 toolNames）→ http.ts:172 /api/tools → session.ts:440 zod 校验
→ SITE_TOOLS 直接转发 | 读类服务端自算 | 其余 operations.ts 归一成 canvas_apply_ops
→ SSE tool_call → local-agent-panel.tsx:793 确认门（仅 apply_ops/create_attachment_nodes）
→ canvas-agent-ops.ts 执行 → use-agent-bridge.ts:43 拦 run_generation → project.tsx:2311 handleGenerateNode
```

**形态 A：site tool（浏览器内执行，适合只读/需 registry 的操作）**——改 7 处：
`schemas.ts`（toolNames/toolInputSchemas/toolDescriptions）、`session.ts:28 SITE_TOOLS`、`agent-site-tools.ts`（名称/标签/switch）、`codex-history.ts:700-739` 中文展示名、i18n zh/en、`docs/mcp-tools.md`、`session.test.ts`。
免改：`mcp.ts`（循环注册）、`http.ts`（通用端点）、Claude/Codex 白名单（都是通配/整包授权）。

**形态 B：画布写操作**——改：`schemas.ts` + `operations.ts:10-71` 分派 + 视情况 `canvas-agent-ops.ts`（联合类型与分支）+ 需副作用则 `use-agent-bridge.ts` + 执行处 `project.tsx` + 标签文档。

**两个坑（必须处理）**：
1. `canvas-agent-ops.ts:46` 对未注册类型**静默回退 Text**（node-registry fallback）——放宽服务端枚举必须配套浏览器侧"未知类型报错"。
2. `project.tsx:2443-2450` 的 else 分支会把非核心 type **改写成 text**——任何走 `handleGenerateNode` 的路径都要避开。

## 3. 现有插件经 MCP 的可达边界

**能做**：读（metadata 全量，仅 `content`>240 截断；注意 `versions[]` dataURL 不截断，快照可能很大）；`canvas_update_node` 改任意插件节点字段/metadata（无类型校验）；删除；连线（**不拦 `hasTargetHandle:false`**，5 个插件都声明拒收上游，MCP 仍可连入）。

**不能做**：
- 建插件节点——`nodeTypeSchema` 五核心枚举（`schemas.ts:6`）zod 硬校验，传 `character:role` 直接失败。浏览器侧其实支持（`canvas-agent-ops.ts:46` + `node-registry.ts:46-48`），**唯一闸门在服务端 schema**。
- 触发插件生成——`canvas_run_generation` 落到 `project.tsx:2443-2450` else 分支，**节点 type 被改写成 text（= 毁掉插件节点）**，且走宿主内置流程，不执行插件 `generate`。
- 查插件生成状态——`generation_get_status` 只认 `metadata.status`，插件写的是 `metadata.generating`（`agent-site-tools.ts:93-96`）。
- 可发现性——无 `canvas_list_node_types` 类工具，Agent 不知道有哪些插件类型。

## 4. 候选工具设计（3 个，按落地顺序）

### 候选 1：`canvas_list_node_types`（site tool，只读，零风险）
- 入参：`{ pluginId?: string }`；返回 `listNodeDefinitions()`（`node-registry.ts:42-44`）→ `{type, title, pluginId, defaultSize, hasTargetHandle, resourceKind, showInCreateMenu…}`。
- 改动：形态 A 全套。解决"Agent 不知道有哪些插件节点"的可发现性。

### 候选 2：语义化创建工具——每个插件一个专属工具（已拍板：B 纯语义）
> 形态对比（A 通用 type / C 别名折中 / B 纯语义）已讨论，**拍板取 B**：工具名即意图，Agent 零学习成本，且入参可带插件专属字段一步到位（建出即可生成的非空节点），避免"先建空节点再 update metadata"的绕路。

**工具面（5 个，对齐 5 个插件）**：

| 工具 | 固定 nodeType | 专属入参（对齐插件 Fields） |
|---|---|---|
| `canvas_create_character_node` | `character:role` | `name? age? traits? style? faceText? faceImages[]? outfitText? outfitImages[]? extraText? extraImages[]?` |
| `canvas_create_scene_node` | `scene:view` | `name? time? style? styleImage? envText? envImages[]? lightText? lightImages[]? camera? extraText? extraImages[]?` |
| `canvas_create_prop_node` | `prop:item` | `name? category? style? styleImage? materialText? materialImages[]? detailText? detailImages[]? view? extraText? extraImages[]?` |
| `canvas_create_grid_node` | `grid:board` | `name? castIds[]? spaceId? doc?` |
| `canvas_create_film_node` | `video:film` | `name? model? ratio? seconds? prompt? refs[]?` |

公共入参：`title? x? y? width? height?`；`autoRun?` 暂不设（生成触发归候选 3，避免落到 `:2443-2450` 毁节点坑）。

**行为**：每个工具在 `operations.ts` 归一成 `{type:"add_node", nodeType:<固定>, metadata:<专属字段>}` → 沿用 `applyOps`；**浏览器侧对未注册类型改为报错**（消掉 `canvas-agent-ops.ts:46` 静默回退 Text 坑，插件未加载时报错而不是建错）。

**改动文件（形态 B 全套 ×5）**：`schemas.ts`（toolNames/toolInputSchemas/toolDescriptions 各 +5，专属字段用 zod object 显式建 schema——比通用 metadata 更强的入参校验）、`operations.ts` 归一分支、`codex-history.ts:700-739` 展示名 +5、`agent-event-formatters.ts:507-509` 是否进确认门、i18n、`docs/mcp-tools.md`、`session.test.ts`。

**已知代价（拍板时已知悉）**：
- 工具数 34 → 39（token 成本）；
- **插件清单耦合进 canvas-agent**：插件是 `web/public/plugins/` 动态发现、可热载的，canvas-agent 是独立发版的 npm 包——**以后每装一个新插件，都要给 canvas-agent 加对应工具并发版**。缓解：`canvas_list_node_types` 保证已装插件可发现；新增插件的配套工具进常规发版节奏。
- 可选收口：5 个工具外留一个通用 `canvas_create_plugin_node` 兜底未适配类型（可后补，不阻塞首期）。

### 候选 3：`canvas_run_plugin_generation`（真正触发插件生成，需契约拍板）
- 入参：`{ nodeId, prompt? }`。落地三选一（侵入度递增）：
  1. **契约钩子**：`CanvasNodeDefinition` 增 `generate?(ctx, opts)`（SDK+宿主两份契约同步），5 个插件把面板闭包提升为定义级实现，宿主 `handleGenerateNode` 前置分支调用。最正。
  2. **metadata 触发位**：新 op 写 `metadata.agentGenerateAt/prompt`，插件 Panel useEffect 监听。不动 SDK，但要改 5 个插件。
  3. 复用 `writeBackToSelf` 宿主路径：零插件改动，但只能拼原始 prompt，**结构化字段与参考图序不参与，产出质量不一致，不推荐**。
- 必须同批处理：`:2443-2450` type 改写坑、`hasTargetHandle:false` 连线语义、插件重打包（`build.mjs`）。

**配套可选**：给插件节点加状态可查——`generation_get_status` 同时认 `metadata.generating`（或插件生成时也写 `metadata.status`），一行策略改动即可让插件节点进入生成状态查询。

## 5. 建议节奏

候选 1（纯只读）→ 候选 2（5 个语义创建工具，处理静默回退坑）→ 候选 3（需产品/契约拍板）。候选 1+2 只动 canvas-agent 服务端 + 宿主浏览器层，不动 5 个插件本体；候选 3 涉及 SDK 契约双同步与 5 插件重打，建议单独排期。后续新增插件时，配套语义工具随 canvas-agent 常规发版补齐（候选 2 已确立的耦合代价）。
