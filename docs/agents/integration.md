# 集成指引（二次开发优先顺序）

1. **节点插件优先**：`infinite-canvas/plugins/canvas/sdk/src/define-plugin.ts:1` 定义插件，`"<pluginId>:<name>"` 类型（`types/canvas.ts:21`），经 `node-registry.ts` 注册；远端 URL 动态安装/启用/更新/卸载。
2. **模型渠道次之**：新中转先写自定义调用脚本（`services/api/model-plugin.ts` 注入 `http/poll/sleep/signal/onDelta/onProgress`），跑通再进 `use-config-store.ts` 预设。
3. **改上游源码最后**：保持改动面最小，沿用 `canvas-agent-ops.ts:7` 同一套操作语义；画布节点渲染改 `components/canvas/canvas-node.tsx`，生成链路改 `canvas-node-generation.ts`。
4. **本地 Agent**：`canvas-agent/src/server/http.ts:18`（`127.0.0.1:17371`）+ `src/canvas/session.ts`；前端经 `services/api/canvas-agent.ts`。
5. **跨域**：浏览器直连被拦时用自建转发或 `canvas-proxy`，不假设项目后端。
