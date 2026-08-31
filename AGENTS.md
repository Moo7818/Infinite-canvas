# AGENTS.md

本文档用于约束本项目中的 AI / 自动化开发行为。开发时优先遵循本文件，其次遵循用户当前消息。

## 基本原则

- 先读现有代码，再动手修改，优先沿用项目已有结构和写法。
- 写代码保持最少行数，能简单实现就不要引入复杂抽象。
- 标准格式、协议、解析、压缩、加密、日期等通用能力优先使用成熟稳定的库，不要手写底层实现，除非用户明确要求或项目已有实现必须沿用。
- 不要为了“兼容更多场景”写大量分支，只实现当前明确需要的功能。
- 项目尚未上线，不需要兼容旧数据；本地存储结构调整时直接按新设计修改，不写旧字段兼容或数据迁移兜底，除非用户明确要求。
- 每次写完代码，不需要检查语法，不需要执行构建，用户会自己做。
- 不要改无关文件，不要顺手重构。
- 如果工作区已有用户改动，不要回滚，不要覆盖；只在必要范围内追加修改。

## 反复提醒沉淀

- 如果开发过程中总是遇到某个问题，或者用户反复提醒同一个注意事项，需要把该注意事项补充到本文件。
- 补充时写成明确、可执行的规则，避免只写模糊描述。
- 新规则应放到最相关的章节；找不到合适章节时放到“项目注意事项”。

## 前端规范

- 前端使用 Vite、React、React Router、TypeScript、Ant Design、Tailwind、Zustand。
- 编写 Ant Design 相关代码时，参考 https://ant.design/llms-full.txt 理解组件 API、示例和设计规范，并优先结合项目当前 antd 版本与既有写法。
- 外部服务请求统一放在 `web/src/services/api/`，由浏览器前端直连，不假设存在项目后端。
- 全局或跨页面状态优先放在 `web/src/stores/`。
- 已经放在全局 store 或全局 hook 中的状态/动作，组件需要时直接使用对应 store/hook，不要为了“纯组件”层层透传 props；避免一个组件传递过多参数。
- 全局组件、全局常量、全局配置等全局性质的内容不要作为 props 或参数层层传递；哪里需要就在哪里直接从对应全局入口获取。
- 多个页面重复出现的 UI 副作用动作，例如复制文本并提示、下载并提示、统一确认弹窗，优先抽成 `web/src/hooks/` 下的全局 hook；不要放进 store，除非它确实是需要共享/订阅的状态。
- 路由页面放在 `web/src/pages/`，页面布局放在 `web/src/layouts/`，路由配置放在 `web/src/router.tsx`。
- 画布页面放在 `web/src/pages/canvas/`，画布组件放在 `web/src/components/canvas/`，画布状态放在 `web/src/stores/canvas/`，画布工具函数放在 `web/src/lib/canvas/`。
- 页面按目录组织，例如 `web/src/pages/image/index.tsx`；页面里只有一个主业务组件时直接写在对应页面入口中，不要单独拆 `Manager` 组件再传一堆 props。
- 不要新增只做简单转发的组件，例如只 `return <X>{children}</X>` 或只换个名字透传 props；直接在使用处使用真实组件或把逻辑写进当前文件。
- 页面私有 hook 放在对应页面目录下，例如 `admin/assets/use-admin-assets.ts`；只有多个页面真实复用的 hook 才放到外层 `hooks/`。
- 管理后台页面私有组件放到各自页面目录的 `components/` 下，例如 `admin/assets/components/`、`admin/prompts/components/`；不要为了单页面使用放到 `admin/components/` 共享目录。
- 管理后台主题、背景、卡片阴影、表格配色等统一在 `web/src/lib/app-theme.ts`、`AppProviders` 或必要的全局 CSS 作用域中配置；页面私有组件不要自己写 `dark ? ...` 主题分支。
- Ant Design 的 Dropdown、Menu、Select、Cascader、TreeSelect 等弹层背景、悬停态和选中态颜色统一通过 `web/src/lib/app-theme.ts` 的全局 Alias Token 与组件 Token 配置；不要在业务组件内为单个弹层覆盖颜色。
- 组件优先使用函数组件和现有 hooks，不新增大型状态管理方案。
- UI 图标优先使用 `lucide-react` 或项目已经使用的 Ant Design 图标。
- 页面文案保持中文。
- 不要在组件里堆太多无关逻辑；复杂逻辑优先抽成同目录工具函数或小组件。
- 样式优先由组件自己管理；组件私有样式优先使用 Tailwind className 或少量内联 style，不要为单个组件新增大量全局 CSS。
- 全局 CSS 只放基础变量、全局重置、跨页面通用样式和少量第三方组件必要覆盖；不要在 `globals.css` 堆页面私有样式。
- 代码尽量短小直接，少拆不必要组件，少做多层 props 传递，避免为了抽象堆出更多代码。
- 前端业务数据需要浏览器本地持久化时，默认使用 `localforage`；`localStorage` 只用于极小的简单配置，不要用来保存业务列表、生成记录、图片、base64 或大 JSON。

## 画布 UI 规范

- 做 canvas 前端 UI 时必须遵循当前画布主题。
- 优先使用 `canvasThemes`、`useThemeStore` 或 Ant Design `ConfigProvider` token。
- 不要硬编码黑白、stone、slate 等颜色导致浅色/深色主题不一致。
- 新增画布按钮、弹窗、浮层时，尽量复用已有工具栏、节点面板、Modal 的视觉风格。
- 画布顶部工具栏和状态信息优先采用极简扁平风格：无边框、无阴影、无胶囊背景，融入整体背景，弱化按钮感，仅保留轻微 hover 反馈，保持简洁现代、低视觉重量。
- 左侧画布面板等列表里的节点/元素缩略图容器，非图片类型（文本、配置、视频、音频等）不要使用 `theme.node.fill`（`#e7e5df`/`#292524`）这类灰色背景，图标直接无背景展示，尽量不要给多余底色，保持干净。
- 画布内的操作按钮（如面板里的「添加」「导出」「选择」等）默认用扁平无底色样式：透明背景、仅 `hover:bg-black/5 dark:hover:bg-white/10` 轻微反馈，靠图标+文字表达，不要用 `theme.toolbar.activeBg`（`#e7e5df`/`#3a3631`）或 `theme.node.fill` 之类的灰色作为按钮填充底色。灰色 `activeBg` 只允许用于「选中态」等需要表达状态的高亮，不要当普通装饰底色。
- 图片节点尺寸逻辑要尊重原始比例，除非功能明确要求自由变形。
- 批量生成、多图展示、助手面板等画布交互要尽量简洁，不要占用过多画布空间。

## 文档规范

- README 保持简洁，只放项目介绍、核心功能、快速开始和文档入口。
- `docs/index.md` 放给 AI 使用的文档索引，不要再放到 `docs/content/docs/` 内容目录里。
- 详细功能介绍写到 `docs/content/docs/overview/features.mdx`。
- 后续待办写到 `docs/content/docs/progress/todo.mdx`。
- 已实现但还需要用户测试确认的事项写到 `docs/content/docs/progress/pending-test.mdx`。
- `docs/content/docs/progress/pending-test.mdx` 用来记录这个版本实际做了哪些可测试变更；`CHANGELOG.md` 的 `Unreleased` 只保留对这些变更的版本级归纳，避免逐条照搬实现细节。
- 每次重大改动（新增/调整/删除功能、接口或工具，影响用户可感知行为）完成后，都要在 `CHANGELOG.md` 的 `Unreleased` 追加一条记录，按 `[新增]` / `[调整]` / `[修复]` / `[优化]` 前缀分类，用一句中文归纳；纯内部重构、格式化、无用户可感知影响的小改动可不记。
- 每次 todo 事项完成后，先从 `docs/content/docs/progress/todo.mdx` 移到 `docs/content/docs/progress/pending-test.mdx`，不要直接写进正式功能说明；用户确认测试通过后再更新 `docs/content/docs/overview/features.mdx`。
- 每次任务完成前，都要根据实际变更检查并更新 `docs/content/docs/progress/todo.mdx` 和 `docs/content/docs/progress/pending-test.mdx`；如果功能或待办没有变化，也要确认无需修改。
- 文档不要写过期日期；除非用户明确要求记录具体时间。

## 发版本流程

- 发版本时，先把 `CHANGELOG.md` 的 `Unreleased` 变更整理成新的版本记录，并保留空的 `Unreleased` 标题。
- 按当前版本号提升一个版本，更新根目录 `VERSION`。
- 将当前未提交的代码全部提交到 Git。
- 提交完成后，给当前提交打最新版本号对应的 tag，例如 `v0.0.5`。
- 发版本流程中不要执行编译、测试或构建，除非用户明确要求。

## PR 审查与处理

- 审查 PR 时必须把“需求价值”和“实现质量”分开判断，分别给出结论；实现差不等于需求不需要，需求有价值也不等于当前代码可以合并。
- 需求价值需要单独结合项目方向、用户场景、现有能力和后续规划判断；无法从项目上下文确定是否需要时，必须询问用户，不得仅凭代码质量、作者或改动规模推断需求不需要。
- 实现质量重点检查正确性、安全性、改动范围、重复代码、无关文件、现有结构复用、可维护性、测试与文档以及与最新 `main` 的冲突。改动几十个文件、疑似 AI 批量生成、重复代码多只能作为重点复核或拒绝当前实现的信号，不能单独作为放弃需求的依据。
- 对“需求有价值但实现不合格”的 PR，优先考虑要求作者修改、提取可用思路后自行重做，或把需求保留到 issue/todo；不要直接把需求一起否定。
- 建议关闭 PR 前，必须先向用户分别说明需求价值、实现质量、可保留的思路和建议处理方式，并取得用户明确确认；批量关闭时也要让用户能看清每个 PR 的需求是否仍需保留。
- 可以先在独立分支审查、修复、测试和准备提交；任何合并进 `main` 的操作都必须先说明修复内容、测试结果、风险与冲突，并取得用户明确同意。需要 force-push PR 作者分支时也必须提前说明影响并取得同意。

## 项目注意事项

- 新增或调整超时、重试次数、大小限制、并发上限等会改变实际行为的边界值前，必须先向用户说明适用环节、默认值和失败后的处理方式，并取得确认；不要把经验值当成纯内部实现静默加入。
- 当前画布项目和“我的素材”主要保存在浏览器本地，不要在文档中误写成已支持云同步。
- 当前 AI API Key 存在浏览器本地，并由前端直接请求 OpenAI 兼容接口；涉及安全说明时要写清楚。
- Docker 静态资源路径目前仍是待办项，文档中不要过度承诺生产部署已经完全验证。
- Agent 对话消息必须同时按 `threadId`、`turnId` 和 `itemId` 归属；实时事件只用于补充未物化的 turn，历史快照成为权威后不得重复合并同一条消息。
- Agent 通信协议版本与消息存储版本必须独立管理；消息存储格式升级时必须先备份再迁移，遇到未知版本、损坏清单或冲突备份时拒绝覆盖原文件，不得按记录数量或文件大小静默裁剪历史元数据。
- 本地启动或浏览器验收时不要关闭用户已经打开的浏览器窗口或标签页；需要自动化验证时使用独立测试页面，避免打断用户当前页面和对话状态。

## 第三方集成前安全门禁（8 步）

> 本节为集成/二次开发必经流程。任一步不通过即阻断部署，修复后重新走完整流程。所有判定留痕到 `docs/content/docs/progress/pending-test.mdx`。

### ① 最近维护
- 判定：`VERSION` 当前 `v0.16.0`（2026-08-18），`CHANGELOG.md:1` 的 `Unreleased` 有 15 条待发布变更；镜像与 Pages 均以 `v*` tag 触发；`SECURITY.md:5` 声明仅 `main` 与最新 tag 受支持。
- 门槛：近 90 天有提交且 `Unreleased` 非空视为活跃；若超过 180 天无发版，集成时必须先在孤立分支做回归测试，再决定是否 fork 自维护。
- 动作：发版前执行发版本流程 5 步；本地未关联 git（`git status` 报 `not a git repository`）时先 `git init` 并绑定远端，再做审查。

### ② 已知漏洞
- 判定：本仓库未申请 CVE，`SECURITY.md:34` 明确插件“跑在页面内可访问 API Key”为设计权衡，不算漏洞；`web/package.json:14` 与 `canvas-agent/package.json:24` 无历史漏洞通告，但未跑 `npm audit`/`bun audit`，不能视为已审计。
- 门槛：引入前必须跑 `bun audit`（web）与 `npm audit`（canvas-agent、plugins/canvas/*），高危/严重直接阻断；`SECURITY.md:10` 私有上报通道必须可用，否则先补齐。
- 动作：CI 增加 `audit` job，失败阻断合并；记录审计命令与结果到 pending-test。

### ③ 依赖是否可信
- 判定：`web/bun.lock:58` 约 640 行指向 `https://registry.npmmirror.com`，非官方 `registry.npmjs.org`；`web/package.json:22` 锁死 `react@19.2.5`、`antd@^6.4.2`、`axios@^1.16.0` 等主包，`canvas-agent` 锁 `express@^5.1.0`、`@openai/codex@0.146.0`；直连依赖约 25 个，无废弃包，但镜像源增加供应链劫持面。
- 门槛：生产构建必须校验 `bun.lock`/`package-lock.json` 完整性（`--frozen-lockfile`），禁止 `--ignore-scripts` 绕过；引入新依赖需说明来源、许可、周更与维护者；`npmmirror` 仅限国内 CI 缓存，发布产物以官方源二次校验。
- 动作：`.npmrc` 固定 `registry=https://registry.npmjs.org`，CI 另配 `npm_config_registry` 覆盖；新增依赖同步更新 `docs/content/docs/progress/todo.mdx`。

### ④ CI/CD 有没有问题
- 判定：`.github/workflows:1` 4 个 workflow 均仅 `push tags v*` 与 `workflow_dispatch` 触发，`docker-image.yml:8`/`docs-docker-image.yml:6` 使用 `contents: read` + `packages: write` 最小权限，`github-pages.yml:9` 需 `pages: write` + `id-token: write`；`Dockerfile:2` 两阶段构建（`oven/bun:1.3.13` → `nginx:1.27-alpine`），`nginx.conf:1` 静态托管 + SPA 回退；无分支 PR 的 CI 覆盖。
- 门槛：为 `pull_request` 补 `build + typecheck + audit + docker build --dry-run`；`publish-plugins.yml:39` 的 `GH_TOKEN` 推 `plugins-dist` 孤儿分支需分支保护；`docker-compose.yml:3` 的 `ghcr.io/basketikun/infinite-canvas:latest` 固定 digest 部署，禁止 `latest` 裸跑生产。
- 动作：新增 `ci.yml`（PR 触发），保留 tag 发布链路不变；镜像发布后记录 digest 到 `VERSION` 与 changelog。

### ⑤ 搜索 secrets
- 判定：`grep` 全库未发现硬编码 `sk-`、AWS Key、`ghp_`；`web/src/services/api/image.ts:341` 等 `Bearer ${config.apiKey}` 均取自用户本地 `use-config-store.ts:332`，经 `buildApiUrl` 直连用户自有网关；`canvas-agent/src/config.ts:8` token 为 `crypto.randomBytes(18).toString("hex")` 本地生成、`0600` 落盘；`web/docker-entrypoint.sh:12` 对 `ANALYTICS_*` 做 `tr -cd 'A-Za-z0-9-'` 消毒。
- 门槛：禁止提交 `.env`、明文 Key、临时 token；`canvas-agent` 日志已走 `canvas-agent/src/utils/agent-runtime.ts:4` 的 `redactAgentLog`（Bearer/sk- 脱敏），但落盘日志仍属敏感，需确认日志轮转与访问权限。
- 动作：CI 加 `gitleaks`/`trufflehog` 扫描；文档与错误上报必须脱敏，`SECURITY.md:13` 的上报模板作为唯一入口。

### ⑥ 搜索危险代码
- 阻断项 1 — 任意脚本执行：`web/src/services/api/model-plugin.ts:119` `new Function(... "use strict"; return (async () => { ${args.script} })() )` 将用户自定义模型脚本以 `apiKey/baseUrl/signal/http/request/poll` 为参数直接执行；脚本由用户在配置页粘贴，属预期功能但等价于页面内 RCE。
- 阻断项 2 — 插件任意代码：`web/src/lib/canvas/plugin-loader.ts:12` `new Blob([source], {type:"text/javascript"})` + `import(/* @vite-ignore */ url)` + `getPluginRuntime()` 将远端 `source`（`WEB/src/lib/canvas/plugin-registry.ts:18` 拉取的 `registryUrl` 或用户输入 URL）以宿主 `React` 上下文执行；`SECURITY.md:34` 已声明此为信任模型。
- 阻断项 3 — XSS 面：`plugins/canvas/svg/src/index.tsx:70` `dangerouslySetInnerHTML={{__html: svg}}`（`svg` 来自 `metadata.content` 或上游文本节点，无消毒）、`plugins/canvas/markdown/src/index.tsx:61` `el.innerHTML = html`（`marked@14` 经 `esm.sh` CDN 动态拉取，`htmlCache` 不消毒）。
- 门槛：上述三项在集成场景必须做隔离：a) `runModelPlugin` 仅允许受信管理员保存脚本，脚本需展示源码并二次确认，运行时在 Web Worker 或 iframe 沙箱执行，禁止直接 `new Function` 跑在主线程；b) 远程插件强制 `url allowlist` + `SRI/subresource` 校验，默认禁用、安装前显式警告（已实现需保留）；c) Markdown 启用 `marked` 的 `sanitize` 或 `DOMPurify`，SVG 走 `DOMPurify` 白名单并剥离 `<script>/<foreignObject>` 与事件属性。
- 其他：`canvas-agent/src/server/http.ts:498` 的 `spawn("explorer.exe"/"open"/"xdg-open")` 与 `canvas-agent/src/agent/codex-client.ts:71` 的 `spawn(codex app-server)` 为本地 Agent 预期行为，二次开发若不使用 canvas-agent 可裁剪该模块以缩小攻击面。

### ⑦ 沙箱运行
- 判定：本仓库为纯静态前端 + 本地 Agent，无服务端持久化；`web/dist` 未生成，`tsc --noEmit` 需经 `bun install`；`Dockerfile:10` 的 `bun run build` 与 `nginx.conf:7` 的 `try_files $uri /index.html` 为沙箱基线；当前 Windows 环境因 `MSYS_NO_PATHCONV` 路径转换导致 `docker run -w /app/web` 型沙箱直接运行失败，已改为静态审查 + 容器 `ls /app/web` 探测代替。
- 门槛：沙箱必须满足：a) `docker compose up -d` 在隔离网络一次性拉起，端口仅 `127.0.0.1:3000`；b) `web` 容器以只读文件系统 + `no-new-privileges` 运行；c) 自动化用独立测试页（见“项目注意事项”最后一条），不碰用户已打开窗口。
- 动作：沙箱脚本 `MSYS_NO_PATHCONV=1 docker run --rm -v "D:/Dev_project/infinite-canvas-main:/app" oven/bun:1.3.13 sh -c "bun install --frozen-lockfile && bun run build"` 跑通后，再执行 `npx tsc --noEmit` 与 `playwright` 烟测；日志与产物落 `docs/content/docs/progress/pending-test.mdx`。

### ⑧ 再决定是否部署
- 通过条件（全部满足）：① 维护活跃或已 fork 自维护；② `audit` 无高危；③ 锁文件校验通过且 registry 可信；④ PR 级 CI 绿；⑤ secrets 扫描绿；⑥ 三项危险代码已按门槛隔离或接受风险并书面确认；⑦ 沙箱构建与烟测绿。
- 本项目当前结论：**有条件通过**。功能与活跃度满足二次开发，但 ⑥ 的三项为已知的“设计即风险”：自定义脚本 `new Function`、远程插件 `Blob import`、Markdown/SVG 的 `innerHTML`。若直接以官方默认配置部署到多用户生产环境，任意用户可借脚本/插件窃取同域下其他用户的 `localforage` 数据与 API Key。
- 部署建议：a) **单用户/内网二次开发**：可部署，保留 `SECURITY.md:42` 的“仅安装可信插件”警告，关闭匿名用户保存脚本/安装插件的入口；b) **多租户/SaaS 化**：必须先完成 ⑥ 的三项改造（Worker 沙箱 + 插件 allowlist/SRI + DOMPurify），并将 `web/src/services/api/request.ts:5` 的直连模式改为经后端代理隐藏 `apiKey`，否则不建议部署；c) 无论哪种，先在沙箱跑通 ⑦，再按“发版本流程”打 `v0.16.1` tag 发布，避免以 `latest` 裸跑。

## 二次开发集成指引

- 优先沿用现有结构：画布 `web/src/pages/canvas/`、`web/src/components/canvas/`、`web/src/stores/canvas/`，工具 `web/src/lib/canvas/`，接口 `web/src/services/api/`。
- 新增能力优先走插件 SDK（`plugins/canvas/sdk/src/define-plugin.ts:1` + `plugins/canvas/template`），而非改核心渲染链路；官方插件发布走 `plugins-dist` 孤儿分支，不进 `main`。
- 浏览器持久化继续用 `localforage`（`web/src/services/image-storage.ts:10` 示范），`localStorage` 仅存轻量开关（面板宽度、locale）；不要把业务大 JSON 塞 `localStorage`。
- AI 调用保持“前端直连用户网关”模型（`web/src/stores/use-config-store.ts:389` 的 `buildApiUrl`），如需隐藏 Key 则新增后端代理层并同步更新 `SECURITY.md` 与 README 的安全声明。
