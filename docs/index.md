# Infinite Canvas · 根文档索引

> 项目实体位于 `infinite-canvas/` 子目录（`VERSION:1 v0.16.0`），根 `docs/` 为二次开发分析层，与 `infinite-canvas/docs/` 官方文档解耦。

## AI 行为约束（渐进式入口）

> 根 `AGENTS.md:1` 为入口，只暴露路径；约束细节按需加载 `docs/agents/*:1`。**不要**在 `AGENTS.md` 或 `docs/agents/intro` 存长文本。

| 关注点 | 实际文档 |
|--------|----------|
| 基本原则与沉淀 | `docs/agents/principles.md:1` |
| 前端规范 | `docs/agents/frontend.md:1` |
| 画布 UI | `docs/agents/canvas-ui.md:1` |
| 文档/发版/审查 | `docs/agents/workflow.md:1` |
| 项目注意事项 | `docs/agents/project-notes.md:1` |
| 安全门禁 8 步 | `docs/agents/security-gate.md:1` |
| 集成指引 | `docs/agents/integration.md:1` |
| 分支策略 | `docs/git-branch-strategy.md:1` |

## 分析文档

| 文档 | 说明 |
|------|------|
| [功能：动态模型参数 schema](./feature-model-param-schema.md) | **新增** 画布节点按模型 `imageParams` 声明动态渲染参数选择器 |
| [项目背景：人机共创视频工厂](./project-background.md) | 全流程人机共创目标、资产统一模型、阶段化UI+终局画布+opencode编排 |
| [架构设计](./architecture.md) | 分层架构、数据流、画布引擎、Agent/插件子系统 |
| [技术栈](./tech-stack.md) | 前端/本地Agent/构建/持久化/依赖可信度 |
| [产品设计](./product-design.md) | 定位、核心链路、亮点与不足 |
| [二次开发路线](./roadmap.md) | 7 大方向 + 安全门禁落地清单 |

**快速定位**：`infinite-canvas/web/src/router.tsx:15` 定义 8 路由；二次开发优先走插件 SDK `infinite-canvas/plugins/canvas/sdk/src/define-plugin.ts:1`。
