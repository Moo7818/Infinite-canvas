# Git 分支策略

> 仓库根 `D:/Dev_project/infinite-canvas-main` 已 `git init`，`infinite-canvas/` 为上游开源子目录（`v0.16.0`），根 `docs/` 与 `AGENTS.md` 为二次开发层。

## 分支

| 分支 | 用途 | 保护 |
|------|------|------|
| `main` | 稳定可发布，`infinite-canvas` 同步上游后经 PR 合入 | 需 PR + `ci` 绿 |
| `develop` | 日常集成，二次开发主干 | 需 PR |
| `feature/*` | 单功能分支，从 `develop` 切 | 用后删除 |
| `hotfix/*` | 线上紧急修复，从 `main` 切 | 合回 `main+develop` |
| `release/*` | 发版冻结，从 `develop` 切 | 仅修 bug |

默认 `main` 为 `master` 重命名后目标（首次提交后执行 `git branch -m master main`）。

## 工作流

```
feature/xxx ──PR──► develop ──PR──► main ──tag v0.16.1──► 发布
hotfix/xxx  ──PR──► main ────────┬──► develop
```

- 小步提交，`feat/fix/docs/chore: 中文归纳`，关联 `AGENTS.md:68 CHANGELOG Unreleased [新增/调整/修复/优化]`。
- 同步上游：`git remote add upstream https://github.com/basketikun/infinite-canvas.git`，`git fetch upstream && git merge upstream/main --allow-unrelated-histories` 到 `develop` 分支解决冲突，`VERSION` 按 `AGENTS.md:73 发版本流程` 递增打 `v*` tag。
- 发布：`docs/content/docs/progress/pending-test.mdx` 绿 → 整理 `CHANGELOG:73` → 升 `VERSION` → `git commit -a` → `git tag v0.x.x` → `git push origin main --tags`。

## 提交与合并

- 禁止 `git push -f` 到 `main/develop`，`force-push` 仅限个人 `feature/*` 且 PR 内说明影响（`AGENTS.md:81`）。
- 合并前本地 `MSYS_NO_PATHCONV=1 docker run ... bun run typecheck` 与 `gitleaks` 绿。
- 二次开发不改 `infinite-canvas/` 源码时，新增代码放根 `apps/web|api` 与 `docs/`，避免污染上游目录。

## 远端

- `origin`：自建私有仓库（待配置 `git remote add origin <url>`）
- `upstream`：`basketikun/infinite-canvas`

> 策略路径已暴露于 `AGENTS.md` 发版本流程/项目注意事项，详见本文档。
