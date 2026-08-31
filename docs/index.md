# Infinite Canvas · 根文档索引

> 项目实体位于 `infinite-canvas/` 子目录（`VERSION:1 v0.16.0`），根 `docs/` 为二次开发分析层，与 `infinite-canvas/docs/` 官方文档解耦。

| 文档 | 说明 |
|------|------|
| [项目背景：人机共创视频工厂](./project-background.md) | **新增** 全流程人机共创目标、资产统一模型、阶段化UI+终局画布+opencode编排 |
| [架构设计](./architecture.md) | 分层架构、数据流、画布引擎、Agent/插件子系统 |
| [技术栈](./tech-stack.md) | 前端/本地Agent/构建/持久化/依赖可信度 |
| [产品设计](./product-design.md) | 定位、核心链路、亮点与不足 |
| [二次开发路线](./roadmap.md) | 7 大方向 + 安全门禁落地清单 |

**快速定位**：`infinite-canvas/web/src/router.tsx:15` 定义 8 路由；全局约束见根 `AGENTS.md:100` 的 8 步安全门禁；二次开发优先走插件 SDK `infinite-canvas/plugins/canvas/sdk/src/define-plugin.ts:1`。
