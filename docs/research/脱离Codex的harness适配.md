# 脱离 Codex：其他 harness 适配方案调研

> 调研范围：`infinite-canvas/canvas-agent/src/`（上游 v0.19.0）+ 本仓库 MCP 客户端注册实例。全部结论带文件:行号。
> 结论先行：**MCP 工具层对任意 MCP 客户端（harness）开放，接入方式协议无关；Codex 独占的只是侧边栏多轮体验（turn 管线）。** 存在三条适配路线，工作量 2-5 天 / 1-2 周 / 2-4 周递增。本文不绑定任何特定目标平台，方案对 Claude Code、Codex 之外的 CLI/SDK 类 harness 一律通用。

## 1. Codex 耦合点清单（程度分级）

**硬依赖（侧边栏 turn 管线唯一实现）**：
- `agent/codex-client.ts:69-105` spawn `codex app-server --stdio`；`:102-293` 全套私有 JSON-RPC（thread/start·resume·fork、turn/start·interrupt、model/list、skills/*）；`:280-293,:663-682` app-server 反向审批请求 → SSE `codex_approval`；`:777-814` 向 Codex thread 注入 infinite-canvas MCP 与 approval 配置；`:830-866` 事件归一化。
- `agent/codex-protocol.ts:60-158` 私有协议类型；`agent/codex.ts`（队列/单例/线程生命周期/Skill 草稿）；`agent/codex-history.ts`（历史 = Codex rollout 投影，标题硬编码 "Codex"）；`agent/codex-event-history.ts:12` 落盘 `~/.infinite-canvas/codex-event-history.json`。
- `server/http.ts`：`/agent/codex/*` 全部端点（:173-422，turn 在 :292-400），事件广播作用域由 `codexBusy` 决定（:38）。
- 依赖：`canvas-agent/package.json:26` `"@openai/codex": "0.146.0"` + `version-check.ts` 启动校验。

**软耦合（命名/词表 Codex 化，语义通用）**：
- `canvas/session.ts`：`CodexState/codexBusy/codexMutation/codexReplayEvents` 等状态机本 harness 无关，只是命名；`AGENT_PROTOCOL_VERSION = 6`（:26，前端版本不匹配即强断连）。
- 前端：`services/api/canvas-agent.ts:67-116` Codex 路径；`local-agent-panel.tsx` 多处；i18n 大量 "Codex" 文案与 effort/permission 词表。

## 2. Claude 适配现状（骨架已有，离可用差整条管线）

已实现（`agent/claude.ts`，共 56 行）：spawn `claude -p --output-format stream-json --allowedTools mcp__infinite-canvas__*`，stdout 按 JSON 行 emit；`http.ts:423-426` 只有 `/agent/claude/turn` 一个极简端点。

差距 12 项（摘要）：① 事件未归一成 `turn.*/item.*` 协议（前端时间线/思考卡/计划卡全渲染不出）；② 无 thread/turn 身份（重放键失效）；③ 不接会话状态机；④ 无并发锁/一致性校验；⑤ 无历史多轮；⑥ 无中断（不保存 ChildProcess）；⑦ 无权限确认流（只靠 allowedTools 放行）；⑧ 无附件管线；⑨ 无前端 harness 开关（模型列表硬走 `/agent/codex/models`）；⑩ 无 Skill；⑪ 无测试；⑫ 官方定位：README:143-159 明示"当前网页侧边栏只开放 Codex"，规划要求用 Claude Agent SDK 而非 CLI（`local-agent-integration-plan.mdx:16,38`，交付阶段 3）。

## 3. MCP-only 模式：其他 harness 今天能拿到什么

**能拿（全量工具层能力，对所有客户端一致）**：34 工具全部读写画布/工作台/生成；**浏览器写操作确认卡对任何 harness 的 MCP 调用都生效**（`agent-event-formatters.ts:507-509` 确认门不是 Codex 专属）；多轮上下文由 harness 自己承担。接入是纯协议行为：README:147-157 官方给出 Claude Code `claude mcp add` 接法，本仓库亦有任意 MCP 客户端的注册实例（`.opencode/opencode.json:3-11`，仅作示例，其他客户端同理——stdio 起 `npx -y @basketikun/canvas-agent@latest mcp` 即可）。

**拿不到（侧边栏专属）**：过程时间线（思考/计划/工具卡）；多轮会话历史/线程列表；权限审批卡（MCP-only 场景由客户端自身策略处理）；图片附件管线（`canvas_create_attachment_nodes` 依赖 Codex turn 附件，`session.ts:339-372`）；模型/力度/权限选择；停止按钮。

## 4. 三条适配路线

### 方案 a：纯 MCP 增强（2-5 天，零协议风险，全客户端受益）
把 turn 级能力沉淀成 MCP 工具：附件入口 harness 无关化（`session.ts:339-372` 接受 dataUrl 而非仅 turn 附件）、会话/时间线只读工具、`agent_interrupt` 等。改动集中在 `schemas.ts` + `session.ts`，不动协议不动前端。
- 收益：任意 MCP 客户端（Claude Code、SDK 类 harness 等）立即补齐附件等缺口，与确认卡天然兼容。
- 风险：工具数已 34（token 成本）；时间线类"会话感"体验 MCP 单次调用表达力有限。

### 方案 b：补齐 `/agent/claude/turn` 成通用 turn 端点（1-2 周）
`claude.ts` 补事件归一化（stream-json → `turn.*/item.*`）、状态机接入、中断、权限流（Claude Agent SDK `canUseTool`，官方规划方向）、历史持久化；前端加 harness 开关与条件渲染。该通用端点天然是后续任意 harness（CLI 或 SDK 类）的接入点。
- 风险：`claude -p` 一次性进程，多轮需 resume/Agent SDK；Codex 专属 UI 需条件化，回归面较大。

### 方案 c：harness-neutral 抽象层（2-4 周）
新建 `agent/harness.ts` 接口（startThread/startTurn/interrupt/approve/mapEvents…），Codex/Claude 收敛为实现；路由去 Codex 前缀；`codex_state`→`agent_state` 等改名属**破坏性协议变更**（升 `AGENT_PROTOCOL_VERSION`，旧面板强断连）。
- 风险：`http.ts`/`session.ts` 是上游热点文件，后续上游同步冲突最高；三个大测试文件断言需全改。**仅在确认长期维护多 harness 时做。**

## 5. 接侧边栏级体验的通用技术路径（已有验证样例）任何具备"本地服务 + SSE 事件流 + 会话 API + 权限确认端点"四件套的 harness，都可仿 Codex 适配器接入侧边栏。已在仓库内验证的样例（以 opencode SDK 为例，仅作能力模板，不代表目标平台）：

`@opencode-ai/sdk@1.18.30` 在依赖树中（`.opencode/package-lock.json:129-131`），其能力面：`createOpencodeServer`（`node_modules/@opencode-ai/sdk/dist/server.d.ts:17`）、SSE 事件流（`message.part.updated`/`session.status`/`session.idle`）、会话多轮（`session.create/prompt/abort/fork/messages`）、**权限确认流**（`permission.updated` + 回执端点 `POST /session/{id}/permissions/{permissionID}`）。

**通用路径**：新增 `canvas-agent/src/agent/<harness>.ts` 适配器——起 harness 本地服务 → 创建会话并投递 prompt → 订阅事件流，映射为现有 `turn.*/item.*` 与审批卡（即落方案 b 的通用 turn 端点后，所有 harness 按同一映射表接入）。
- 风险：各 SDK 迭代快；客户端侧作为 MCP 消费端调画布工具的审批策略需逐家确认。

## 5.1 方案 b 实施状态（opencode 已落地）

MVP 已实现并完成端到端验收（保持端点路径与事件合同不变）：

- **分派**：`config.ts` 新增 `harness` 字段与 `agentHarness()`，默认 `opencode`，显式 `"harness": "codex"` 回退；`server/http.ts` 全部 `/agent/codex/*` 端点改指 `agent/runtime.ts` 分派层；新适配器为 `agent/opencode.ts`（镜像 Codex 对外接口）+ `agent/opencode-client.ts`（SDK spawn + SSE 事件泵归一化）。
- **服务拉起**：SDK `createOpencode` spawn `opencode serve`（固定端口 17372），`OPENCODE_CONFIG_CONTENT` 注入 infinite-canvas MCP（扁平 `mcp.<name>` 形状，`mcp.servers.<name>` 会在 1.x CLI 校验失败导致所有端点 500）。
- **turn 模型**：同步 `session.prompt`（1.x CLI 没有 `message-async` 异步端点，SDK 路径会命中 SPA 兜底 HTML）；`messageID` 必须以 `msg` 开头否则 400；终态由事件泵 `session.idle`/`session.error` 驱动，`turnId` 用 user message id。
- **事件泵**：`/event` SSE 必须 `query.directory` 指定工作空间目录订阅，否则只收到 `server.*` 全局事件、会话级事件全部缺失；SDK `RequestResult` 非 throw（错误以 `{error}` 字段返回）必须自行解包。
- **验收结论**：models/threads/turn 门禁/流式 `turn.*/item.*`/`mcp_tool_call`/中断/历史回读均通过（免费模型验证，如 `opencode/minimax-m3.1-flash-free`）；审批卡与 usage 未验证；共享 `opencode.db` 下 npm 1.17.10 CLI 写旧 `session` 表导致 `session_message` 外键失败，需 1.19.3+（桌面版 2.1 写 `session_v2`）。
- **遗留**：opencode 二进制来源待定（升级全局 npm / 配置 `opencodeBin`）；前端仍是 Codex 词表（文案层面）。

## 6. 建议

**a → b → (视需求) c**：a 立即做（顺手可捎上插件 MCP 工具方案，两者都动 `schemas.ts`/`session.ts`）；b 按官方规划用 Claude Agent SDK 补齐，做完后其余 harness 按第 5 节通用路径做适配器皆为增量工作；c 仅长期多 harness 战略下启动，事件名尽量"只增不改"规避协议升版。
