# 前端规范

- 栈：`Vite + React + React Router + TypeScript + Ant Design + Tailwind + Zustand`。
- AntD 参考 `https://ant.design/llms-full.txt`，结合当前 antd 版本与既有写法。
- 请求统一 `web/src/services/api/`，浏览器直连用户网关，不假设后端。
- 全局状态 `web/src/stores/`，已有 store/hook 直接使用，不透传 props。
- 全局组件/常量/配置就近从全局入口取，不层层传参。
- 重复 UI 副作用（复制/下载/确认）抽 `web/src/hooks/`，非共享状态不进 store。
- 路由 `web/src/pages/`，布局 `web/src/layouts/`，配置 `web/src/router.tsx`。
- 画布：页面 `web/src/pages/canvas/`，组件 `web/src/components/canvas/`，状态 `web/src/stores/canvas/`，工具 `web/src/lib/canvas/`。
- 页面按目录 `web/src/pages/image/index.tsx`，单主组件直接写入口，不拆 `Manager`。
- 禁止简单转发组件 `return <X>{children}</X>`。
- 私有 hook 放页面目录 `admin/assets/use-admin-assets.ts`，共享才放 `hooks/`。
- 共享组件放页面 `components/` 子目录，不放 `admin/components/`。
- 主题统一 `web/src/lib/app-theme.ts`/`AppProviders`/全局 CSS，不写 `dark ? ...` 分支。
- 弹层颜色统一 Alias Token，不在业务组件覆盖。
- 函数组件 + hooks，不新增大型状态方案。
- 图标 `lucide-react` / AntD 图标，文案中文。
- 私有样式 `Tailwind className`，全局 CSS 仅重置/变量/必要覆盖。
- 业务持久化 `localforage`，`localStorage` 仅轻量开关。
