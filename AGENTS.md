# AGENTS.md

> 渐进式披露入口：本文仅暴露路径，细节按需加载 `docs/agents/*` 与 `docs/*`。禁止在入口堆长文本，高耦合内容已下沉至独立文档。

## 优先级

1. 先读现有代码，再动手改，沿用已有结构
2. 遵循 `AGENTS.md` 入口，其次用户当前消息，细节见下表具体文档

## 路由

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
| 架构/技术栈/产品/路线 | `docs/architecture.md:1`, `docs/tech-stack.md:1`, `docs/product-design.md:1`, `docs/roadmap.md:1` |
| 人机视频工厂背景 | `docs/project-background.md:1` |
| 动态模型参数 schema | `docs/feature-model-param-schema.md:1` |
| 文档总览索引 | `docs/index.md:1`（唯一不沉底的全量索引） |
| 人机视频工厂背景 | `docs/project-background.md:1` |

## 约束

- 按需加载：仅读与当前任务相关的文档，不预读全量
- 修改时同步更新对应 `docs/agents/*`，保持入口与细节一致
- 不在 `AGENTS.md` 新增长段细节，新增规则写入最相关的 `docs/agents/*`

## 保留在 `infinite-canvas/` 内的同步副本

`infinite-canvas/AGENTS.md:1` 为上游约束，根 `AGENTS.md` 为本仓库二次开发入口，互不覆盖。
