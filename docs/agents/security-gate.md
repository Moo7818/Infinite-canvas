# 安全门禁 8 步（改动前逐项过）

1. 密钥：无硬编码 Key/Token；`API Key` 仅浏览器本地，前端直连（见 `use-config-store.ts:18`）。
2. 注入：自定义脚本/远端插件源码视为不可信输入（`model-plugin.ts` 沙箱、`plugin-loader.ts:11` Blob 评估），不拼接执行。
3. 外链：远端 URL 下载先校验类型与大小，失败降级远端地址，不无限卡住。
4. CORS/代理：跨域走用户自建转发或 `canvas-proxy`，不内置第三方中转。
5. 存储：大业务数据走 `localforage`，不塞 `localStorage`；存储升级先备份。
6. 日志：错误日志与调试输出脱敏（`apiKey/token/webUrl`），Token 不进 Referer/历史/服务端日志。
7. 权限：本地 Agent Token 随机生成、收紧文件权限，校验 `?token` 或请求头。
8. 边界值：超时/重试/并发变更先说明并确认；轮询未知返回直接报错，不空轮询至超时。
