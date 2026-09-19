# 产品设计（基于上游 v0.18.0 实测）

## 定位

面向图片创作的开源工作台：画布编排 + AI 图片生成 + 参考图编辑 + 对话助手 + 提示词库 + 素材沉淀，同一界面连续迭代视觉方案。

## 核心链路

1. **工作台**：`/` 首页 → `/canvas` 列表 → `/canvas/:id` 单项目（`router.tsx:15`）。
2. **创作页**：`/image` 文生图/图生图、`/video` 视频（含首尾帧/参考模式）、`/prompts` 提示词库、`/assets` 我的素材、`/config` 渠道与模型配置。
3. **画布节点**：image / text / config / video / audio / group（`types/canvas.ts:12`）+ 插件扩展类型；节点经连线传递参考，助手围绕选中与上游节点对话、生图并插回画布。
4. **渠道模型**：`use-config-store.ts:18` 多渠道 `ModelChannel`，`channelMode: local` 前端直连 OpenAI 兼容接口；调用方式可自定义脚本（`model-plugin.ts`）。

## 亮点

* 无后端纯静态部署，Docker/Vercel/Render 三路可跑，运维面小。
* 插件系统允许 URL 动态安装节点类型，二次开发可不 fork 上游源码。
* 本地 Agent 让 Codex/Claude Code 直接操作当前画布，人机同台。

## 不足（写文档时如实表述，不要美化）

* 画布项目与素材主要在浏览器本地，无云同步（WebDAV 仅作跨设备同步手段）。
* `API Key` 存浏览器本地并由前端直连，安全说明必须写清楚。
* 本地存储格式可直接调整，不承诺历史数据兼容。
* Docker 静态资源路径仍是待办，不承诺生产部署已完全验证。
