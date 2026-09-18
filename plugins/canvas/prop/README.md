# 道具节点插件

填写道具表单（名称/类别/风格+1 参考图/视角/材质+2 参考图/细节+3 参考图/其他+2 参考图）→ 拼装提示词 → 调用宿主生图生成产品级道具图。

```bash
cd plugins/canvas/prop
npm install
npm run dev      # watch 构建，产物同步到 web/public/plugins/prop.js
npm run typecheck
```

启动画布 `web`，在「节点插件」管理器里启用即可。发布时把 `dist/prop.js` 托管到任意静态地址，用户填 URL 安装（不进官方 `registry/OFFICIAL`）。
