# Git 分支策略（双层目录 vendor copy）

> 仓库根 `D:/Dev_project/infinite-canvas-main` 单仓库管理双层结构：根二次开发层 + `infinite-canvas/` 上游 vendor copy（当前 `v0.18.0`）。

## 远端

| 远端 | 用途 |
|------|------|
| `upstream` | `https://github.com/basketikun/infinite-canvas.git`，只读同步上游 |
| `origin` | 自建私有仓（二次开发推送，待配置 `git remote add origin <url>`） |

`infinite-canvas/` 不做 submodule/subtree：全量拷贝在同一仓库，Windows 摩擦最小，上游同步即一次 merge。

## 分支

| 分支 | 用途 | 保护 |
|------|------|------|
| `main` | 稳定可发布 | 需 PR |
| `develop` | 日常集成、二次开发主干（当前） | 需 PR |
| `feature/*` | 单功能分支，从 `develop` 切，用后删 | — |
| `docs/*` | 文档重建/大改，从 `develop` 切 | — |
| `sync/upstream-*` | 上游同步专用，从 `develop` 切 | — |
| `hotfix/*` | 线上紧急修复，从 `main` 切，合回 `main` + `develop` | — |

## 工作流

```
feature/xxx ──PR──► develop ──PR──► main ──tag v*──► 发布
sync/upstream-vX.Y.Z ──PR──► develop   # 禁止直接在 develop 上 merge upstream
```

* 小步提交，`feat/fix/docs/chore: 中文归纳`。
* 二次开发能走插件 SDK 就不改 `infinite-canvas/web`；必须改上游源码时保持改动面最小。
* `VERSION` 跟随上游（`infinite-canvas/VERSION`），自有改动记 `infinite-canvas/CHANGELOG.md` 的 `Unreleased`（`[新增/调整/修复/优化]` 一句中文）。
* 禁止 `push -f` 到 `main/develop`；force-push 仅限个人 `feature/*` 且提前说明。
* 同步上游：`git fetch upstream` → `sync/upstream-*` 分支 merge `upstream/main` → 解冲突（保二次开发层，`VERSION` 跟上游）→ PR 到 `develop`。
* 发版：`pending-test` 通过 → 整理 `CHANGELOG` → 升 `VERSION` → 全量提交 → 打 `v*` tag（沿用上游发版流程，见 `agents/workflow.md`）。
