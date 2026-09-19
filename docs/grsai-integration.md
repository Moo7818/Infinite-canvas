# Grsai 渠道集成笔记（实测 + 故障判定）

> 调用链：插件 `generate()` → `web/src/pages/canvas/hooks/use-plugin-host.tsx:54` → `web/src/services/api/image.ts:793 requestEdit`（有参考图）→ `web/src/services/api/model-plugin.ts:113 runModelPlugin`（沙箱执行渠道脚本）→ `model-plugin.ts:50 axios POST /v1/api/generate` → 脚本内 `poll()` 轮询 `GET /v1/api/result?id=`。
> 渠道脚本原文见 `docs/assets/grsai-autodl-canvas-config.json`（发行版）；**浏览器里跑的是导入时的快照**，改 json 后必须重导入才生效（URL 安装的插件同理，用安装时持久化的 `source`，见 `plugin-loader.ts:107`）。

## 1 接口行为

* `/v1/api/generate` 的 `replyType` 三值：`json`（同步口，首包直接带最终 `results`）、`stream`、`async`（首包秒回 `{id}`，配套 `GET /v1/api/result?id=` 轮询）。
* 响应结构：`{id, status: running|violation|succeeded|failed, progress, results:[{url}], error}`。
* 任务 id 形如 `14-5f3cf761-...`，前缀数字疑似 worker/队列号。

## 2 async 改造（已实施，待验证）

* 16 个生图脚本（nano×11 + gpt×5）`replyType: json → async`（`b2a37fa`）：慢模型不断连，首包秒回 id 后走既有轮询；`collect()` 本就兼容"首包成功"与"首包 id"两种形状。
* 若服务端不认 async，按原行为回退或报可见错，再回滚。

## 3 故障判定

### ERR_EMPTY_RESPONSE（前端失败、后台成功）

* 判定：同步口慢模型占连接数分钟 → 网关掐空闲连接，前端无 id 全盘失败，worker 侧孤儿完成。
* 缓解已做：错误持久化可见（`metadata.generateError` + 节点红标）；连接层与业务失败文案区分，提示勿连点。
* 根治即 §2 的 async（无长连接可掐）。

### 双任务（一次点击、后台两个任务）

* 已排除：脚本重试（已删除并逐行验证）、前端连点（提交入口同步 `Map.has→Map.set` 互斥）、宿主自动重试（全仓库只有手动按钮，`QueryClient retry: false`）。
* 主嫌疑：网关超时内部重试。判定法：两任务创建时间差（秒级=实锤；几十秒=另有发送源）+ 队列前缀是否不同 + POST 用时是否停在整十秒；async 切后应消失，否则带两任务 id/时间戳/prompt/单 POST 截图提工单。

### aspectRatio: auto（与强制 16:9 矛盾）

* 插件链不可能产出 auto（`size:"16:9"` 末位覆盖 → 像素串 → `toRatio` 换算；auto 仅 size 为空时出现）。
* 判定法：以后台 prompt 有无插件指纹为准——`场景名称：/环境：/光影：`（scene）、`调度主题：/出场：/宫格`（grid）等结构化前缀；有指纹=旧包，无指纹=内置节点/工作台（用的全局 size: auto）。

## 4 版本确认法（先验问题再动手）

1. 渠道脚本搜 `replyType` 是否为 `"async"`；
2. Network 看 POST 首包：秒回 `{id, status:"running"}` + 随后一串 GET `/v1/api/result` = 新脚本生效；分钟级才回 = 旧脚本还在跑；
3. 插件管理器看版本号（本地插件启动时 bust 重拉，URL 安装看安装时快照）。
