# 场景节点插件

填写场景表单（名称/时间/风格+1 参考图/机位/环境+3 参考图/光影+2 参考图/其他+2 参考图）→ 拼装提示词 → 调用宿主生图生成电影质感场景图。

```bash
cd plugins/canvas/scene
npm install
npm run dev      # watch 构建，产物同步到 web/public/plugins/scene.js
npm run typecheck
```

启动画布 `web`，在「节点插件」管理器里启用即可。发布时把 `dist/scene.js` 托管到任意静态地址，用户填 URL 安装（不进官方 `registry/OFFICIAL`）。
