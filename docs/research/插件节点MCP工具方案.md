# 基于二次开发插件节点新增 MCP 工具方案

> 前置调研已完成（只读取证，全部带文件:行号）。本文为设计文档，未拍板不动代码。
> 关联：`docs/mcp-tools.md`（现有 34 工具与已知边界）、`docs/plugin-dev-guide.md`（插件契约）。

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

### 候选 2：`canvas_create_plugin_node`（写，补"建插件节点"缺口）
- 入参：`{ type: string（开放字符串）, title?, x?, y?, width?, height?, metadata? }`。
- 行为：新工具分支归一成 `add_node`；**浏览器侧对未注册类型改为报错**（消掉 `canvas-agent-ops.ts:46` 静默回退坑）。
- 备选更小改法：`nodeTypeSchema` 直接放宽为 `z.string()`（同时影响 `canvas_create_node` 与 `add_node` op）——必须配套浏览器校验。
- 注意：是否纳入浏览器确认门（`agent-event-formatters.ts:507-509` 现仅覆盖 apply_ops/create_attachment_nodes）。

### 候选 3：`canvas_run_plugin_generation`（真正触发插件生成，需契约拍板）
- 入参：`{ nodeId, prompt? }`。落地三选一（侵入度递增）：
  1. **契约钩子**：`CanvasNodeDefinition` 增 `generate?(ctx, opts)`（SDK+宿主两份契约同步），5 个插件把面板闭包提升为定义级实现，宿主 `handleGenerateNode` 前置分支调用。最正。
  2. **metadata 触发位**：新 op 写 `metadata.agentGenerateAt/prompt`，插件 Panel useEffect 监听。不动 SDK，但要改 5 个插件。
  3. 复用 `writeBackToSelf` 宿主路径：零插件改动，但只能拼原始 prompt，**结构化字段与参考图序不参与，产出质量不一致，不推荐**。
- 必须同批处理：`:2443-2450` type 改写坑、`hasTargetHandle:false` 连线语义、插件重打包（`build.mjs`）。

**配套可选**：给插件节点加状态可查——`generation_get_status` 同时认 `metadata.generating`（或插件生成时也写 `metadata.status`），一行策略改动即可让插件节点进入生成状态查询。

## 5. 建议节奏

候选 1（纯只读）→ 候选 2（补齐创建，处理静默回退坑）→ 候选 3（需产品/契约拍板）。候选 1+2 只动 canvas-agent 服务端 + 宿主浏览器层，不动 5 个插件本体；候选 3 涉及 SDK 契约双同步与 5 插件重打，建议单独排期。
