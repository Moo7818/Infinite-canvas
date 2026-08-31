# 文档 / 发版 / 审查

## 文档

- `README` 仅介绍+核心功能+快速开始。
- `docs/index.md` 为 AI 索引，不进 `docs/content/docs/`。
- 功能说明 `docs/content/docs/overview/features.mdx`，待办 `progress/todo.mdx`，待测 `progress/pending-test.mdx`，版本归纳 `CHANGELOG.md:Unreleased` 按 `[新增/调整/修复/优化]`。
- `todo→pending-test→features` 流转，任务前检查 `todo/pending-test`。

## 发版

1. 整理 `Unreleased` 为新版本，保留空标题
2. 升 `VERSION`
3. 提交 Git
4. 打 `v*` tag
5. 不执行构建。策略见 `docs/git-branch-strategy.md:1`。

## PR 审查

- 需求价值与实现质量分开判断，分别结论。
- 价值结合项目方向/用户场景判断，不确定则询问用户。
- 质量查正确性/安全性/范围/重复/复用/可维护/测试/冲突。
- 价值有但实现差：要求修改或保留为 issue/todo，不直接否定。
- 关闭前向用户说明价值/质量/保留思路并获确认；`main` 合并需说明修复/测试/风险。
