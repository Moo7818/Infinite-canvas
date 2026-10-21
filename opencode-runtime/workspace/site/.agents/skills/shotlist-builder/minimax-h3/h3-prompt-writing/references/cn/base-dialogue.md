# 说话人、台词与画面文字

本模块说明说话人编号、台词与歌声、画外音、跨镜头连续性以及画面可见文字的写法。镜头与运镜见 `base-camera.md`，整体结构见 `base-structure.md`。

## 1. 说话人、台词与歌声

会说话、演唱或发出画外人声的主体使用稳定编号 `(S1)`、`(S2)`、...、`(Sn)`。多个已有编号的人同时说或唱时使用组合编号比如 `(S1,S2)`。同一说话人跨镜头保持同一编号；没有发声的人物不分配编号。

说话人第一次出现时，根据画面和声音补充稳定身份，例如人物类型、年龄、性别、是否出镜，以及音高、音色、语速或口音。说话人的称呼、编号、动作和说话方式写在 `<d>` 外；`<d>` 内只写语言标签和用户给出的实际语言内容，原词与标点逐字保留，不翻译、不改写。

```text
The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>
The two children (S1,S2) shout together, <d>[English] Wait for us!</d>
```

画外音使用精确表达 `says in an off-screen voiceover`。每一段画外音 `<d>` 后立即写明画面中对应人物的嘴唇保持闭合：

```text
The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.
```

同一句台词或歌词跨切镜时，在两段连接位置使用 `<scenetrans>`，并明确声音跨切镜连续；视频结束前台词被截断时使用 `<cutoff>`。可使用 `continues seamlessly across the cut`、`continues uninterrupted into the next shot`、`carries over from the previous shot` 或 `remains audible across the transition` 说明跨镜头的连续性。

## 2. 画面文字

画面中实际可见的横幅、招牌、标识、字幕或霓虹文字使用英文双引号包围，原文与标点逐字保留，不翻译。

```text
A red neon sign reading "营业中" glows above the doorway.
```
