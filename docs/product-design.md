# 产品设计

## 定位

面向图片创作的开源无限画布工作台（`infinite-canvas/README.md:25`）：把 **画布编排 + AI生图/图生图/参考图编辑 + 对话助手 + 提示词库 + 素材沉淀** 放在同一界面，支持多画布项目、节点连线、批量结果横向展开。

## 核心链路

1. **配置**：`/config` 多渠道 `ModelChannel`（`use-config-store.ts:18`）按 `channelId::model` (`encodeChannelModel:292`) 选模型，支持 `openai/gemini` 双协议 + 用户JS覆写 (`resolveModelScript:183`)。
2. **创作**：画布 `config`/`text` 上游经 `canvas-resource-references.ts` 组装 `prompt+references` → `services/api/image.ts:716 requestGeneration` 按 `apiFormat` 分发（OpenAI `POST /v1/images/generations|edits` + `quality/size` 规整 `122/134`；Gemini `v1beta/models:generateContent`），`metadata.status=loading→success` 并批量创建下游图像节点。
3. **素材**：`services/image-storage.ts:27 uploadImage` 先 `fetch Blob→localforage image_files`，跨域失败降级远端URL，`asset-store` 沉淀复用。
4. **提示词库**：7个 `yukkcat/image-prompts` 内置源 (`prompt-source-presets.ts:26`)，`use-prompt-source-scheduler.ts:37` 每60s检查到期源（默认30min `stores/use-prompt-source-store.ts:14`），`localforage prompt_cache` 离线可用。
5. **助手**：右侧Agent常驻面板（`stores/use-agent-store.ts` SSE），本地 `canvas-agent 127.0.0.1:17371` 将 Codex/Claude 封装为MCP，8种 `CanvasAgentOp` 操控画布，支持 `/`选Skill、`@`插素材。

## 亮点

- **画布即工作流**：连线即表达“提示词+参考图”组合，批量结果自动横铺，符合视觉发散-收敛节奏（`docs/content/docs/overview/features.mdx`）。
- **零后端开箱**：静态托管即用，300+ OpenAI兼容中转即插，`localforage` 分店（`app_state/image_files/logs`）+ 400ms节流，工程克制。
- **插件最小暴露**：`CanvasNodeContext` 8能力（CRUD/applyOps/ai/storage/emit），不直接给 `apiKey`，官方5插件（html/markdown/svg/panorama/sticky-note）打进 `plugins-dist` 孤儿分支，不污染 `main`。
- **主题一致**：`canvasThemes + AppProviders` 统一 Token，顶部极简扁平、无胶囊背景（`AGENTS.md:50`）。

## 不足

- **纯本地数据**：清缓存即丢项目，WebDAV可选且无冲突合并；协作/分享薄弱。
- **编排可控性**：自由布局易成“意大利面”，缺自动排布（dagre）、对齐分布、组折叠/批量导出。
- **可观测性**：失败仅 `errorDetails` 字符串，缺队列/重试对比/Seed/参考图权重透出，多图占画布空间大。
- **Agent门槛**：需 `npx canvas-agent` + 手填 `url/token`，对非技术用户高。
- **安全裸面**：3处“设计即风险”同域可窃 `apiKey`，官方已在 `SECURITY.md:34` 声明信任模型，`AGENTS.md:130` 要求二开隔离。
- **供应链**：`bun.lock` 镜像源 + 无PR审计，发布可信度待加固。
