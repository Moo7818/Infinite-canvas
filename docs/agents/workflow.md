# 文档/发版/审查规范

## 文档

* 根 README 保持简洁（介绍/核心功能/快速开始/文档入口）。
* `docs/index.md` 为唯一全量索引；上游用户文档指路 `docs/upstream-summary.md`，不复制原文。
* 重大改动（影响用户可感知行为）完成后，在 `infinite-canvas/CHANGELOG.md` 的 `Unreleased` 追加一句中文记录，按 `[新增]/[调整]/[修复]/[优化]` 分类；纯内部重构可不记。
* 上游 `docs/content/docs/progress/`（todo/pending-test）只记录上游事项；二次开发待办走 `docs/roadmap.md`。

## 发版

* `CHANGELOG Unreleased` 整理成版本记录（保留空 `Unreleased`）→ 升 `infinite-canvas/VERSION` → 全量提交 → 打 `v*` tag。
* tag 打在 `infinite-canvas/` 子树的 subtree split 上，发布产物不含根二次开发层（流程见 `../git-branch-strategy.md`「发布产物只含产品层」）。
* 不执行编译/测试/构建（用户明确要求除外）。

## PR 审查

* “需求价值”与“实现质量”分开判断，分别给结论；实现差≠需求不需要。
* 无法确定需求价值时问用户，不凭代码质量/规模推断。
* 实现质量查：正确性、安全、改动范围、重复代码、无关文件、结构复用、可维护性、测试文档、与 `main` 冲突。
* 需求有价值但实现不合格：要求修改/提取思路重做/转入待办，不直接否定需求；关闭 PR 前向用户说明四项（价值/质量/可保留思路/建议处理）并取得确认。
* 合并进 `main` 前说明修复内容、测试结果、风险冲突并取得同意；force-push 他人分支同样先同意。
