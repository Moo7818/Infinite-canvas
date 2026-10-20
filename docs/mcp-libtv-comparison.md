# libtv MCP 与 infinite-canvas MCP 能力对比分析

> 调研方式：本地只读取证（Qoder CN 会话日志/设置、libtv CLI 技能库、两套 MCP 源码），未发网络请求、未实际调用 MCP。
> 结论可信度标注：85 个工具中 24 个取到了 description/inputSchema 原文，其余 61 个仅按工具名归类（属推断，已注明）。

## 1. 两者是什么

| 维度 | libtv MCP | infinite-canvas MCP |
|---|---|---|
| 本质 | **远程云服务 MCP**（上游 `https://mcp.liblib.tv/mcp`），LibLib 画布平台的服务端能力面 | **本机 canvas-agent 包装的 MCP**（stdio 子进程 → 127.0.0.1:17371），操控的是**浏览器里本地画布**（localforage 存储） |
| 注册证据 | `~/.qoder-cn/settings.json:22-26`（`"LibTV": {"type":"http","url":"https://mcp.liblib.tv/mcp"}`），经 Qoder 本机路由网关（127.0.0.1:12520）按会话转发 | `.opencode/opencode.json:3-11`、`canvas-agent/src/server/mcp.ts:13-32` |
| 工具规模 | **85 个**（早期版本 83 个） | **34 个**（`canvas-agent/src/canvas/schemas.ts:10-45`） |
| 数据归属 | 云端项目/资产（revision 事务 + 幂等键） | 用户浏览器本地 |
| 鉴权 | `X-Api-Key`（网关级）+ liblib 账号 | `canvas-agent.json` token（本机） |
| 同生态 CLI | `~/.libtv/libtv.exe`（独立存在，与 MCP 无进程关系） | 无（网页即界面） |

## 2. libtv MCP 工具面（85 个，按能力模块）

libtv 自述七大业务模块（`get_capabilities` 取证），实际工具分布：

| 模块 | 代表工具 | 说明 |
|---|---|---|
| 画布/项目 | `list_projects` `create_project` `update_project` `read_project` `get_project_snapshot` `project_info` `browse_project_media` `doctor` | 项目级 CRUD 完整，带 **revision 事务**（`expectedRevision=sha256-…`）与幂等重放回执 |
| 节点 | `create_node` `update_node` `delete_node` `read_node` `manage_group` `validate_generation_plan` | `create_node` 原子提交 node+edges+分组布局，`run=true` 直接提交生成；nodeType 含 text/image/video/audio/script/video-clip |
| 生成与任务 | `generation_submit`（幂等提交，返回 task_id）`task_status`（权威对账）`task_cancel` `show_generation_result` `get_draft_video` `promote_draft_video` | **任务状态是服务端权威**，断线可对账；有草稿视频晋级流程 |
| 模型检索 | `search_models`（action=search/schema/recommend-video，带 needs/时长/画幅过滤）`get_model`（按名解析完整参数约束） | Agent 可先查模型再生成，避免盲猜参数 |
| 上传/资产 | `upload_ticket` `upload_complete`（分片上传，单文件 ≤5GB → file_ref）`upload_media` `resource_info` `inspect_media` `search_assets` `apply_asset_to_canvas` | 完整资产库（文件夹 CRUD、节点资产化、资产贴回画布） |
| 语音/音频 | `list_voices` `register_voice`（注册进个人语音库）`set_character_voice` `synthesize_speech` `edit_audio` | 角色音色管理 + 合成 |
| 角色/剧本/分镜 | `list_characters` `save_character` `generate_character_style` `create_script_v2` `create_screenplay` `write_screenplay` `get_screenplay_write_status` | 剧本→分镜完整创作链 |
| 时间线/剪辑/交付 | `read_timeline` `apply_timeline_edit` `export_video` `export_status` `export_readiness` `prepare_project_delivery` | 剪辑合成 + 导出交付 |
| Agent 委托 | `run_agent` `get_agent_status` `steer_agent_run` `stop_agent_run` `resolve_agent_action` `answer_agent_questions` | **平台内建 Agent 委托协议**（启动/转向/停止/问答） |

（⚠ 上表中未标"取证"的工具仅按名归类；标 ⚠ 关键工具如 `generation_submit`/`task_status`/`search_models`/`upload_ticket` 等已在会话日志取到描述与参数原文。）

## 3. infinite-canvas MCP 工具面（34 个，分组速览）

清单全文见 `docs/mcp-tools.md`。分组：站点导航 1 / 画布读取 4 / 画布写操作 21 / 生成状态 1 / 工作台 4 / 提示词与素材 3。

## 4. 能力差异对照

| 能力域 | libtv MCP | infinite-canvas MCP | 差距性质 |
|---|---|---|---|
| 项目/画布 CRUD | ✅ 建/改/读/快照，revision 事务 | ❌ 仅 `canvas_list_projects` 只读；建画布靠 `site_navigate("/canvas?mode=new")` 网页自动流程，无改名/删除 | **结构性缺口**（前次调研已确认） |
| 节点类型 | 6 类核心 + script/video-clip | 5 类核心；**插件节点建不了**（`schemas.ts:6` 枚举锁死） | 结构性缺口（见姊妹篇方案） |
| 生成触发 | `create_node(run=true)` / `generation_submit` 幂等提交 | `canvas_run_generation` / `canvas_create_*_flow` | 基本对齐，但无幂等键 |
| 任务状态 | **服务端权威** `task_status` 对账，断线可恢复 | `generation_get_status` 依赖浏览器在场推送；网页关闭即失联；插件节点不认（只写 `metadata.generating`） | 可靠性差距 |
| 模型发现 | ✅ `search_models`/`get_model` 参数 schema 可查 | ❌ 只能 `workbench_*_get_config` 读当前页选中项 | 可借鉴 |
| 素材上传 | ✅ 分片上传 + file_ref + 资产库 | ⚠ 仅 `canvas_create_attachment_nodes`（依赖侧边栏 turn 附件，非 Codex 客户端用不了）+ `assets_add`（URL/dataURL） | 可借鉴 |
| 生成前校验 | ✅ `validate_generation_plan` | ❌ 无 | 可借鉴 |
| 角色/剧本/分镜/剪辑/交付 | ✅ 全链路 | ❌ 无（画布只管到生成节点为止；这些恰是本仓库插件层在补的：`character:role`/`scene:view`/`prop:item`/`grid:board`/`video:film`） | 定位不同 |
| Agent 委托协议 | ✅ run/steer/stop/answer 内建 | ⚠ 部分（MCP 本身即委托面；停止只有 `/agent/codex/interrupt` Codex 专属） | 部分缺口 |
| 部署 | 云端 SaaS，任意客户端可接 | 本机 agent 枢纽 + 浏览器画布（部署无关，但必须本机有浏览器连接，见前次问答） | 定位不同 |

## 5. 对本仓库的启示（按可落地性排序）

1. **`get_capabilities` 模式**：给 infinite-canvas MCP 加一个"能力自描述"入口，Agent 一次调用即知可用节点类型/边界，比读文档稳定（对应候选工具 `canvas_list_node_types`）。
2. **`task_status` 权威对账模式**：当前生成状态完全依赖浏览器在线推送；可让 canvas-agent 服务端持久化最近任务快照（taskId→nodeId→状态），网页断连后仍可回答"最后已知状态"。
3. **`generation_submit` 幂等键**：Agent 重试/超时重发时防重复生成，成本极低（入参加 `idempotencyKey`）。
4. **`search_models`/`get_model` 模式**：把生图/生视频可用模型与参数约束做成只读 MCP 工具，消灭 Agent 盲猜模型名。
5. **`validate_generation_plan` 模式**：生成前校验（参考图存在性、参数范围），失败早于扣费。
6. **项目级 CRUD**：libtv 证明了"建/改/读画布"是 Agent 编排的基础能力，本 MCP 缺口应优先补（`canvas_create_project`/`canvas_rename_project`，先前已单独提案待拍板）。

## 6. 证据文件（本地）

- `C:\Users\Administrator\.qoder-cn\settings.json:22-26`（LibTV 远程 http 登记）
- `C:\Users\Administrator\.qoder-cn\logs\runs\2026-10-20T16-48-46-757+08-00-7zfw64-p30856\manifest.json:38,42`（网关 url + 服务器名单）
- `C:\Users\Administrator\.qoder-cn\projects\D--Dev-project-------\07e4b8c5-*.jsonl`（85 工具全量名单 + 24 条描述/schema + 实际调用记录）
- `D:\Opencode project\New\.opencode\skills\libtv-cli\SKILL.md` 及 `commands/*.md`（libtv CLI 能力地图）
- `C:\Users\Administrator\.libtv\libtv.exe`（本机 CLI 实物，约 61MB）
- `infinite-canvas/canvas-agent/src/canvas/schemas.ts`（本 MCP 工具权威表）
