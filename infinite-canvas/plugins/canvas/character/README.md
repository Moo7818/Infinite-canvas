# 角色节点插件

填写角色表单（名称/年龄/容貌/服装/特征/其他，描述+参考图）→ 拼装提示词 → 调用宿主生图生成角色设定图（半身近景 + 全身三视图）。

```bash
cd plugins/canvas/character
npm install
npm run dev      # watch 构建，产物同步到 web/public/plugins/character.js
npm run typecheck
```

启动画布 `web`，在「节点插件」管理器里启用即可。发布时把 `dist/character.js` 托管到任意静态地址，用户填 URL 安装（不进官方 `registry/OFFICIAL`）。
