# 二次开发路线

> 这是候选方向与未完成事项，不代表已排期。新增/调整边界值（超时/重试/并发/上限）时先说明适用环节、当前值、拟改值和失败语义；可能显著增加成本或重复任务时取得用户确认。

## 方向

1. **节点插件批建**：走 `plugins/canvas/sdk`（`define-plugin.ts:1`），类型 `"<pluginId>:<name>"`（`types/canvas.ts:21`），注册经 `node-registry.ts`；详见技术报告（插件主题）。
2. **渠道与模型适配**：新中转站先写自定义调用脚本（`services/api/model-plugin.ts`），跑通再考虑进 `use-config-store.ts` 预设。
3. **画布交互打磨**：工具栏极简扁平、无多余底色，遵循 `agents/canvas-ui.md`；图片节点尊重原始比例。
4. **素材与同步**：评估 IndexedDB 格式变更对现有本地数据的影响并说明恢复办法；WebDAV 同步链路按需补测试。
5. **本地 Agent 深化**：`canvas-agent/src/canvas/session.ts` 多 Tab 会话与 Codex 状态机，按需扩展 tool。
6. **部署硬化**：Docker 静态资源路径待办、Vercel/Render 验证结论沉淀到 `upstream-summary.md`。
7. **文档与发版纪律**：重大改动记 `CHANGELOG Unreleased`（上游文件 `infinite-canvas/CHANGELOG.md`），待办流转按 `agents/workflow.md`。

## 插件待办（未完成项；实现前回查当前代码）

1. 验证 async 生效（§`grsai-integration.md:4` 三步确认法）→ `lastTaskId` 落盘：拿到 `first.id` 即写 `metadata`，刷新后自动 GET `/v1/api/result` 续查（幂等查询）。
2. 插件图片版本目前可能把 dataURL 放入 metadata；评估宿主 `storeImage`/按 key 引用方案，优先考虑导出、同步、清理和失败恢复。
3. 评估生成脚本建任务阶段的超时策略；确认超时是否可能导致后台任务已创建，避免把超时误提示为“未创建”并诱发重复付费请求。
4. `plugins/canvas/shared` 已抽取通用能力；三类表单进一步 schema 驱动仍是候选项，需先证明字段结构稳定且抽象可减少重复。
5. `modelAllow` 已可通过 metadata 覆盖默认筛选；待办限于是否提供用户可发现的配置 UI，不再描述为完全不可配置。

## 非目标

* 不自建后端中转（除非跨域/密钥场景明确要求，此时优先 `canvas-proxy` 方案）。
* 不为尚未提出的兼容场景预先堆分支；涉及可能保留的用户数据时先评估迁移/备份，再选择兼容或明确不兼容策略。
