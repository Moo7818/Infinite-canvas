# 画布 UI 规范

- 遵循 `canvasThemes`/`useThemeStore`/`ConfigProvider` token，不硬编码黑白/stone 颜色。
- 新增按钮/弹窗复用工具栏/节点面板/Modal 视觉。
- 顶部工具栏极简扁平：无边框/无阴影/无胶囊，融入背景，轻微 hover。
- 缩略图非图片类型图标无灰底 `theme.node.fill`，保持干净。
- 操作按钮透明底 `hover:bg-black/5 dark:hover:bg-white/10`，灰色 `activeBg` 仅用于选中态。
- 图片尊重原始比例，非变形需求不自由拉伸。
- 批量/多图/助手面板尽量简洁，不占画布空间。
