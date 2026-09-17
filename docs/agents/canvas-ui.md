# 画布 UI 规范

* 遵循当前画布主题：优先 `canvasThemes`、`useThemeStore`、Antd `ConfigProvider` token，不硬编码黑白/stone/slate。
* 新增按钮/弹窗/浮层复用工具栏、节点面板、Modal 既有视觉。
* 顶部工具栏与状态信息极简扁平：无边框、无阴影、无胶囊背景，融入背景，仅轻微 hover 反馈。
* 列表缩略图容器：非图片类型（文本/配置/视频/音频）不用 `theme.node.fill` 灰底，图标无背景展示。
* 画布操作按钮（添加/导出/选择）默认扁平无底色：透明 + `hover:bg-black/5 dark:hover:bg-white/10`；`activeBg` 灰只用于选中态高亮。
* 图片节点尊重原始比例，非明确需求不自由变形。
* 批量生成/多图/助手面板尽量简洁，不挤占画布空间。
