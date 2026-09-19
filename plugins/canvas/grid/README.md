# 宫格调度节点插件

锁死 2*2 四宫格：按名引用角色/空间节点（活引用，取当前选中版本图）+ 调度文档拼装提示词 → 调用宿主生图一次生成四帧静帧。

```bash
cd plugins/canvas/grid
npm install
npm run dev      # watch 构建，产物同步到 web/public/plugins/grid.js
npm run typecheck
```

启动画布 `web`，在「节点插件」管理器里启用即可。发布时把 `dist/grid.js` 托管到任意静态地址，用户填 URL 安装（不进官方 `registry/OFFICIAL`）。
