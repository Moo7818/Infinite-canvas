# 第三方集成前安全门禁（8 步）

> 集成/二次开发必经，每步阻断需修复后重走，留痕 `docs/content/docs/progress/pending-test.mdx`。

| 步 | 判定 | 门槛 |
|----|------|------|
| ① 最近维护 | `VERSION v0.16.0 2026-08-18`，`Unreleased 15条`，`SECURITY.md:5` 仅 `main+tag` 受支持 | 90天活跃，否则孤立分支回归再 fork |
| ② 已知漏洞 | 未申请 CVE，`SECURITY.md:34` 插件可读 `API Key` 为设计权衡 | `bun audit`/`npm audit` 高危阻断 |
| ③ 依赖可信 | `web/bun.lock:58` 640行 `npmmirror`，`react@19.2.5/antd@6.4.2/axios@1.16` | `--frozen-lockfile`，`.npmrc` 固定官方源 |
| ④ CI/CD | 4× `v*` tag 触发，`contents:read` 最小权限，两阶段 `oven/bun→nginx` | 补 PR `build+typecheck+audit`，`latest` 固 digest |
| ⑤ secrets | 无硬编码 `sk-`，`Bearer ${config.apiKey}` 取本地 `use-config-store.ts:332`，`canvas-agent:8 crypto.randomBytes 0600` | 禁 `.env` 明文，`redactAgentLog:4` 脱敏 |
| ⑥ 危险代码 | `model-plugin.ts:119 new Function` / `plugin-loader.ts:12 Blob import` / `svg:70/markdown:61 innerHTML` | 沙箱 `Worker`+`allowlist/SRI`+`DOMPurify` |
| ⑦ 沙箱 | 无 `dist`，`bun run build` 基线，`MSYS_NO_PATHCONV` 路径坑 | `docker compose up -d 127.0.0.1:3000` 只读容器+烟测 |
| ⑧ 部署 | 单用户可部署，多租户需完成 ⑥ 后端代理隐藏 `apiKey`，`v0.16.1` tag 发布 | 全部绿才通过 |

**当前结论：有条件通过**，详见原 `AGENTS.md:142` 部署建议。二次开发改造前参考本表隔离。
