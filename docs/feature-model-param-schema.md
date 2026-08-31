# 动态模型参数渲染（feature: dynamic-node-params）

> 分支 `feature/dynamic-node-params`，根 `docs/git-branch-strategy.md:1`。目标：画布节点图像参数选择器等组件按模型 API 实际接受的字段（`aspectRatio`/尺寸）动态渲染。

## 动机

`infinite-canvas/web/src/components/image-settings-panel.tsx:17` 内置固定 `aspectOptions` + 宽高输入，仅适配 OpenAI/Gemini 的 `quality+ratio→像素`。GrsAI `gpt-image-2/vip` 要求 `aspectRatio` 语义不同：`gpt-image-2` 接受比例或 1K 像素，`vip` 只接受 1K-4K 像素且 16 倍数/≤3840/≤3:1。固定面板无法表达，需按模型声明渲染。

## 设计

**数据**（`infinite-canvas/web/src/stores/use-config-store.ts:13`）：
```ts
type ImageSizeMode = "auto" | "ratio" | "pixels" | "ratioOrPixels";
type ChannelImageParams = {
    sizeMode?: ImageSizeMode;     // 尺寸控件渲染/取值模式
    aspectPresets?: string[];      // 比例按钮（覆盖内置列表）
    pixelPresets?: string[];       // 像素档按钮（如 1024x1024,2048x2048）
};
ChannelModel.imageParams?: ChannelImageParams;
```
`normalizeChannelModels` 持久化时保留 `imageParams`；`resolveModelImageParams(config, model)` 未配置时返回 `{ sizeMode: "ratioOrPixels" }`（等价原行为）。

**无后端、无新依赖**：schema 为本地 `localforage` 配置（`config.channelEditor`），不额外获取模型列表。

## 改动文件

- `web/src/stores/use-config-store.ts:13` — 类型 + `resolveModelImageParams` + `normalizeImageParams`
- `web/src/components/image-settings-panel.tsx:36` — `buildAspectOptions` 按 `aspectPresets` 生成按钮；`sizeMode!==pixels` 显示比例区，`sizeMode!==ratio` 显示宽高输入，`pixelPresets` 显示像素按钮组
- `web/src/components/layout/channel-editor-drawer.tsx` — 生图模型行新增「图像参数」入口，Modal 编辑 `sizeMode/pixelPresets/aspectPresets`
- `web/src/i18n/locales/zh-CN.ts:31,482` / `en-US.ts` — image 设置、channelEditor 文案
- 文档：`infinite-canvas/CHANGELOG.md:Unreleased`、`progress/pending-test.{mdx,zh-CN.mdx}` 新增验收项

## 渲染矩阵

| sizeMode | 比例按钮组 | 宽高输入 | 像素档按钮 |
|----------|-----------|---------|-----------|
| `auto` | ✓ | ✓ | 声明时 ✓ |
| `ratio` | ✓ | ✗ | ✗ |
| `pixels` | ✗ | ✓ | 声明时 ✓ |
| `ratioOrPixels`（默认） | ✓ | ✓ | 声明时 ✓ |

## 验收

- 未配置模型面板行为与之前完全一致（回归）
- 配置 `pixels + pixelPresets` 后（vip）：只显示像素档按钮+宽高输入，无比例区
- 配置 `ratio + aspectPresets` 后：只显示自定义比例按钮，无宽高输入
- 渠道编辑器可保存并刷新保持配置

## 后续

模型脚本侧（`model-plugin.ts:119`）已按 `params.size`（像素）适配 GrsAI 两模型，见对话脚本；如需比例透传，imageParams 的 `ratio` 模式下 `requestGeneration` 的 `resolveRequestSize:134` 已把比例换算为像素，脚本直接消费即可。