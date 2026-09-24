# 影片节点插件

按模型自适应参数的视频制作节点：模型下拉（视频能力）→ 时长滑杆/比例选项按内置模型参数表切换 → 参考图生成视频。

```bash
cd plugins/canvas/video
npm install
npm run dev      # watch 构建，产物同步到 web/public/plugins/video.js
npm run typecheck
```

启动画布 `web`，在「节点插件」管理器里启用即可。发布时把 `dist/video.js` 托管到任意静态地址，用户填 URL 安装（不进官方 `registry/OFFICIAL`）。
