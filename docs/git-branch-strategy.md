# Git 与上游同步策略

## 仓库边界

这是一个 Git 仓库，包含协作层和产品层：

| 路径 | 职责 | 发行包 |
|------|------|--------|
| 根 `AGENTS.md`、`docs/`、`.opencode/` | 二次开发规则、分析、路线和 Agent 配置 | 不包含 |
| `infinite-canvas/` | 可构建、可部署的产品树，含上游代码与本地产品改动 | 包含 |

`infinite-canvas/` 是 vendor copy，不是 Git submodule，也不是已建立 subtree 历史的目录。上游仓库把产品文件放在仓库根，本仓库把同一产品树放在 `infinite-canvas/`；因此不能把 `upstream/main` 直接 merge 到本仓库，也不能把两边路径当成相同路径处理。

## 代码归属

| 范围 | 归属与规则 |
|------|------------|
| `infinite-canvas/web/`、`infinite-canvas/canvas-agent/`、`infinite-canvas/canvas-proxy/` | 上游产品代码。当前分支含本地宿主改动；以提交历史和上游基线逐项识别，不能假设目录是干净镜像。 |
| `infinite-canvas/plugins/canvas/sdk/`、`registry/`、上游示例插件 | 上游插件基础设施。改契约、官方清单或构建时评估对所有插件和发布流程的影响。 |
| `infinite-canvas/plugins/canvas/character/`、`grid/`、`prop/`、`scene/`、`video/`、`shared/` | 本仓库自研产品插件与共享包。具体实现优先留在插件层。 |
| 根 `docs/`、`AGENTS.md`、`.opencode/` | 本仓库协作层；不得成为产品构建或运行时依赖。 |

目录平级不代表归属相同。遇到归属不明的文件，先查 `git log -- <path>`、对应上游基线和 README/CHANGELOG；不要仅按目录名推断。

## 分支和变更

| 分支 | 用途 |
|------|------|
| `main` | 稳定发布线 |
| `develop` | 集成线 |
| `feature/<topic>` | 单项功能，从 `develop` 开始 |
| `docs/<topic>` | 大型文档整理 |
| `sync/upstream-<version>` | 上游基线同步 |
| `hotfix/<topic>` | 从 `main` 修复，再按流程回合 `develop` |

小步提交，格式 `feat/fix/docs/chore: 中文一句话`。一个提交聚焦同一目的；产品代码与根协作文档若属于不同目的，分开提交。合并受保护分支前走 PR；不对 `main` 或 `develop` force-push。

## 上游同步

当前 `infinite-canvas/` 的上游基线为 v0.19.0（上游提交 `dab19adc0847e32e39b7fc8ff90cb392561fb826`）；产品 `VERSION` 为 v0.19.0，包含本仓库发行记录。基线升级后同步更新此处和 `docs/upstream-summary.md`。

1. 从 `develop` 建 `sync/upstream-<version>`，检查工作区并 fetch `upstream`。
2. 以记录的上游基线和目标 commit 比较，先审阅变更清单。可在同步分支上将上游根路径的补丁加到产品前缀：

   ```bash
   git diff --binary <recorded-upstream-base> upstream/main -- . | git apply --directory=infinite-canvas
   ```

   该命令会修改工作区；先确认当前分支与工作区干净，并只在同步分支执行。补丁应用失败时停止并手动逐项合并，禁止用强制覆盖掩盖冲突。
3. 逐个处理冲突。保留本地插件和产品改动；上游删除/重命名文件时，确认本地是否依赖或有本地改造，不做盲目覆盖。
4. 核对 `VERSION`、产品 CHANGELOG、构建入口、插件契约及自研插件；记录新基线 SHA 和未解决差异。
5. 提交同步分支并开 PR 到 `develop`。禁止直接在 `develop` 上覆盖或合入上游根树。

上游同步是一次产品代码变更：需要用户要求的验证或发布检查时再运行，并在 PR 中报告实际结果。Fetch 只更新远端跟踪信息，不代表本地 vendor copy 已同步。

## 产品版本与发行树

`infinite-canvas/VERSION` 和 `CHANGELOG.md` 管产品版本记录。用户可见的二次开发功能写入产品 `Unreleased`；纯协作文档变更不写入产品 CHANGELOG。发布前按 `docs/agents/workflow.md` 审查。

发行 tag 必须指向 `infinite-canvas/` 的 subtree split，使下载源码只含产品文件。示意流程：

```bash
git checkout main
git subtree split --prefix=infinite-canvas main -b product-split
git tag -a vX.Y.Z product-split -m "vX.Y.Z: 发布说明"
```

创建/推送正式 tag 属于发行操作，按任务授权执行。不要把根 `docs/`、`.opencode/` 或仓库级 `AGENTS.md` 带入产品发行树。历史上已发布 tag 的来源按各自记录处理，不重写旧 tag。

## Remote 约定

* `upstream` 指向上游公开仓库，团队约定只 fetch，不向上游推送。
* `origin` 指向本仓库协作远端。推送、发布及改写远端历史遵循用户授权和仓库权限。
* 远端配置本身不等于权限策略；每次 Git 操作前核对当前分支、工作区和目标 remote。
