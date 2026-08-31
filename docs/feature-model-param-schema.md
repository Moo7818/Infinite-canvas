# 动态模型参数渲染（feature/dynamic-node-params·重设计）

> 分支 `feature/dynamic-node-params`，根 `docs/git-branch-strategy.md:1`。目标：画布节点参数选择器等组件按**渠道模型自定义参数声明**动态渲染，适配任何模型的真实接口字段（如 GrsAI 的 `aspectRatio`），不再绑死画布内置的 `quality/size/count/background` 面板。

## 动机与回退

上一版「固定控件+预设组合」（`imageParams{sizeMode,aspectPresets,pixelPresets}`）仍绑定内置面板语义：`quality` 是画布固有项、GrsAI 根本没有；宽高比枚举也是内置的（含 2k/4k 组合），与接口文档不一致。已 `git revert a4d706b`（提交 `5663945`）撤销，改为**全自定义参数控件**方案。

## 设计

**数据**（`infinite-canvas/web/src/stores/use-config-store.ts:12`）：

```ts
type CustomParamControl =
    | { key: string; label: string; type: "select"; options: string[]; placeholder?: string }
    | { key: string; label: string; type: "number"; min?: number; max?: number }
    | { key: string; label: string; type: "text";    placeholder?: string };

ChannelModel.customParams?: CustomParamControl[];
AiConfig.customParams?: Record<string, string>;   // 取值；节点级 metadata.customParams 覆盖
```

- `normalizeChannelModels` 持久化时保留 `customParams`；`resolveModelCustomParams(config, model)` 取当前模型声明（未声明返回空 → 走原固定面板，零回归）
- 值经 `metadata.customParams`（`types/canvas.ts` 新增）→ `buildGenerationConfig`/`buildNodeConfig` 并入 `AiConfig.customParams` → `runModelPlugin` 以 `params.<key>` 透传脚本；图像/视频/音频脚本分支均已合并 `...(config.customParams || {})`

**渲染**（`web/src/components/model-params-panel.tsx:11`）：
- `ModelParamsPanel`：拉取、数字、文本三种控件按声明渲染；select 显示为枚举按钮组（即接口文档枚举），number/text 为输入框
- 弹层入口 `canvas-image-settings-popover.tsx:25`：模型声明了 `customParams` → 只显示 `ModelParamsPanel`（按钮摘要用取值）；未声明 → 原 `ImageSettingsPanel`（quality/size/count/background）

**编辑入口**（`channel-editor-drawer.tsx`）：每个模型行新增「自定义参数」按钮 → Modal 内可增删控件（类型/键/名称/选项），保存写入 `model.customParams`。

## GrsAI 配置表

见 `docs/grsai-channel-import.json`：

- `gpt-image-2`：`customParams=[{key:aspectRatio,label:比例,type:select,options:[auto,1:1,16:9,...,1024x1024]}]`（无质量）
- `gpt-image-2-vip`：`customParams=[{key:aspectRatio,label:像素档位,type:select,options:[文档像素全表]}]`
- 脚本统一读 `params.aspectRatio`，`POST {baseUrl}/v1/api/generate`，`replyType=json`，含 async poll 兜底。

## 改动文件

- `web/src/stores/use-config-store.ts`（类型/归一化/resolve）
- `web/src/types/canvas.ts`（metadata.customParams）
- `web/src/components/model-params-panel.tsx`（新）
- `web/src/components/canvas/canvas-image-settings-popover.tsx`（按声明切换/摘要）
- `web/src/components/canvas/canvas-node-prompt-panel.tsx`（buildNodeConfig 合并 + onCustomParamsChange）
- `web/src/components/layout/channel-editor-drawer.tsx`（自定义参数编辑器 Modal）
- `web/src/lib/canvas/canvas-generation-helpers.ts`、`web/src/services/api/{image,video,audio}.ts`（customParams 透传）
- `web/src/i18n/locales/{zh-CN,en-US}.ts`
- 文档：`infinite-canvas/CHANGELOG.md:Unreleased`、`progress/pending-test.{mdx,zh-CN.mdx}`
- 导入表：`docs/grsai-channel-import.json`

## 比例 + 分辨率 → 像素（脚本换算）

vip 模型 UI 只暴露两个枚举控件：`aspectRatio`（比例列表）与 `resolution`（1K/2K/4K），由**调用脚本**按文档「VIP 比例参考表」把 比例×档位 换算成像素后填入 `aspectRatio`（`vipPixels()` 查表，兜底 `2048x2048`）。`gpt-image-2` 接口接受比例，脚本直接透传 `params.aspectRatio`。

`select` options 另保留 `label=value` 语法（面板显示 label、发送 value），供无脚本换算需求的模型直接枚举「显示值=发送值」。

## 验收

- 未配置 customParams 的模型：面板行为与回退前完全一致（回归）
- `gpt-image-2-vip`：节点图像设置只显示「比例」+「分辨率」两组枚举（无质量/透明区），脚本按文档 VIP 表换算为像素后请求成功
- 渠道编辑保存后刷新保持；节点取值透传脚本 `params.aspectRatio`
- `bun run typecheck` 绿