# opencode-runtime

侧边栏 Agent 的 opencode 运行时，独立于 `infinite-canvas/` 产品目录，避免把 opencode 的版本与运行数据混在项目源码里。

## 结构

```
opencode-runtime/
├── package.json          # 固定 opencode-ai@1.19.3
├── node_modules/         # npm install 产物（已 gitignore）
└── workspace/site/       # 画布 Agent 的站点工作空间（已 gitignore）
```

## 安装

```bash
npm install
```

## 与 canvas-agent 的关系

- canvas-agent 通过 `config.ts` 的 `opencodeRuntimeDir()` 解析本目录，优先级：配置字段 `opencodeRuntimeDir` > 环境变量 `OPENCODE_RUNTIME_DIR` > 仓库根 `opencode-runtime/`。
- `opencode serve` 以本目录为工作目录 spawn，二进制取 `node_modules/opencode-ai/bin/opencode(.exe)`。
- 会话数据库仍使用共享的 `~/.local/share/opencode/opencode.db`，可与 opencode 桌面版、webui、TUI 互通。
- 站点工作空间默认落在 `workspace/site/`，可在 `~/.infinite-canvas/canvas-agent.json` 的 `workspace.workspacePath` 覆盖。

## 手动启动服务

```bash
npm run serve
```

端口固定 `127.0.0.1:17372`，由 canvas-agent 自动拉起时无需手动执行。
