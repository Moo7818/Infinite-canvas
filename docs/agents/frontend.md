# 前端规范（上游 v0.18.0 实测）

* 技术栈：Vite 7、React 19、React Router 7、TypeScript、Ant Design 6、Tailwind 4、Zustand 5（`infinite-canvas/web/package.json:14`）。
* Antd 代码参考 `https://ant.design/llms-full.txt`，并结合当前版本与既有写法。
* 外部请求统一 `web/src/services/api/`，浏览器直连，不假设后端。
* 全局/跨页状态放 `web/src/stores/`；store/hook 已有状态直接用，不层层透传 props。
* 重复 UI 副作用（复制+提示、下载+提示、确认弹窗）抽 `web/src/hooks/` 全局 hook；非共享状态不进 store。
* 路由页 `web/src/pages/`，布局 `web/src/layouts/`，配置 `web/src/router.tsx:15`；画布页 `pages/canvas/`、组件 `components/canvas/`、状态 `stores/canvas/`、工具 `lib/canvas/`。
* 页面按目录组织（`pages/image/index.tsx`）；单主组件直接写入口，不拆转发 `Manager`；不新增纯转发组件。
* 页面私有 hook/components 放各自页面目录；多页复用才上移。
* 管理后台主题/弹层配色统一 `web/src/lib/app-theme.ts` 与全局 Token；业务组件不单覆盖、不写 `dark ? ...` 分支。
* 函数组件 + 现有 hooks，不新增大型状态方案；图标 `lucide-react` 或已用 Antd 图标；文案中文。
* 私有样式 Tailwind/inline；`globals.css` 只放变量/重置/跨页通用；复杂逻辑抽同目录工具/小组件。
* 持久化默认 `localforage`（`web/src/lib/localforage-storage.ts`）；`localStorage` 只放极小配置。
