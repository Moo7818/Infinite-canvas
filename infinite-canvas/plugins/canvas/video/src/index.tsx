// 影片节点:表单填参（模型自适应）→ 调参考视频生成 → 版本管理。
// 生成结果自动追加版本并写回本节点展示;下游输出当前选中版本视频。
import { definePlugin, useEffect, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeMetadata, CanvasNodePanelProps } from "@infinite-canvas/plugin-sdk";
import {
    FieldGroup,
    ImagesField,
    activeImageUrl,
    downloadImage,
    downscaleImage,
    fitNodeToImage,
    importFilesAsVersions,
    listCanvasImages,
    nextAfterDelete,
    pickActiveId,
    pickImageFiles,
    resolveVersions,
    useGenerationGuard,
    versionAppendPatch,
    versionFilename,
} from "canvas-plugin-shared";
import type { VersionItem } from "canvas-plugin-shared";

export type VideoModelSpec = {
    ratios: string[];
    seconds: { min: number; max: number };
    caps?: Record<string, number>;
    hint?: string;
};

// 模型参数表：面板按此渲染选项；新模型加一行即可（未知模型走默认）。
export const VIDEO_MODEL_SPECS: Record<string, VideoModelSpec> = {
    "minimax-h3": {
        ratios: ["16:9", "9:16", "1:1"],
        seconds: { min: 1, max: 15 },
        caps: { "1080p": 10 },
        hint: "1080p 最多 10 秒；清晰度跟随全局视频设置",
    },
};
export const DEFAULT_VIDEO_SPEC: VideoModelSpec = {
    ratios: ["16:9", "9:16", "1:1"],
    seconds: { min: 1, max: 15 },
};

function specForModel(value: string): VideoModelSpec {
    const bare = value.includes("::") ? value.split("::").slice(1).join("::") : value;
    return VIDEO_MODEL_SPECS[bare] || DEFAULT_VIDEO_SPEC;
}

export type VideoVersion = VersionItem;

export const REF_MAX = 9; // 对齐接口文档：images 最多 9 张

function filledCount(m: CanvasNodeMetadata): number {
    const r = m as Record<string, unknown>;
    const textCount = ["name", "prompt", "model"].filter((k) => {
        const v = r[k];
        return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const imageCount = Array.isArray(r.refs) && (r.refs as unknown[]).some((v) => typeof v === "string" && v.length > 0) ? 1 : 0;
    return textCount + imageCount;
}

function VideoContent({ ctx }: CanvasNodeContentProps) {
    const m = ctx.node.metadata || {};
    const result = activeImageUrl(m);
    const previewOpen = Boolean(m.previewOpen) && result !== "";
    const versions = resolveVersions(m);
    const count = filledCount(m);
    return (
        <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", pointerEvents: "none", color: ctx.theme.node.text }}>
            {result ? (
                <video src={result} muted loop playsInline style={{ flex: 1, minHeight: 0, width: "100%", objectFit: "cover", background: "#000" }} />
            ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: ctx.theme.node.placeholder }}>
                    <span style={{ fontSize: 32 }}>🎬</span>
                    <span>点击填写影片表单</span>
                </div>
            )}
            <div style={{ padding: "6px 12px", fontSize: 12, color: ctx.theme.node.muted, borderTop: `1px solid ${ctx.theme.node.stroke}` }}>
                {(m.name as string) || "未命名影片"} · 已填 {count}/4{versions.length > 1 ? ` · 版本 ${versions.findIndex((v) => v.id === m.activeVersionId) + 1 || versions.length}/${versions.length}` : ""}
                {typeof m.generateError === "string" && m.generateError ? <span title={m.generateError} style={{ color: "#ef4444" }}> · 上次失败</span> : null}
            </div>
            {previewOpen && (
                <div
                    onClick={() => ctx.updateMetadata({ previewOpen: false })}
                    onMouseDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", pointerEvents: "auto" }}
                >
                    <video src={result} controls autoPlay loop style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12, background: "#000" }} />
                </div>
            )}
        </div>
    );
}

function VideoPanel({ ctx, onClose }: CanvasNodePanelProps) {
    const m = ctx.node.metadata || {};
    const [model, setModel] = useState(typeof m.model === "string" ? m.model : "");
    // 模型选择持久化到 metadata，面板关闭重开不丢失。
    const pickModel = (v: string) => {
        setModel(v);
        set({ model: v || undefined });
    };
    // 生成态经共享 guard 持久化；在途请求靠模块级取消器接管。
    const guard = useGenerationGuard(ctx);
    const { running, setRunning } = guard;
    useEffect(() => {
        // 兜底：generating 为真但本会话无在途请求（刷新/崩溃残留）。
        // 请求无法续跑（任务 id 随旧页面销毁），标记为中断而不是静默清空，让用户知道发生了什么。
        if ((ctx.node.metadata || {}).generating && !guard.isLive()) {
            ctx.updateMetadata({ generating: false, generateError: "页面刷新导致生成中断，后台任务状态未知；如需结果请重新生成。" });
            setRunning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [error, setError] = useState("");
    const spec = specForModel(model || ctx.ai.defaultModel("video"));
    const ratio = typeof m.ratio === "string" && spec.ratios.includes(m.ratio) ? m.ratio : spec.ratios[0];
    const secondsMax = spec.seconds.max;
    const seconds = Math.min(Math.max(Number(m.seconds) || spec.seconds.min, spec.seconds.min), secondsMax);
    const errMsg = error || (typeof m.generateError === "string" ? m.generateError : "");
    const canvasImages = listCanvasImages(ctx.getNodes(), ctx.node.id);

    const set = (patch: CanvasNodeMetadata | ((prev: CanvasNodeMetadata) => CanvasNodeMetadata)) => ctx.updateMetadata(patch);
    const setName = (name: string) => {
        ctx.updateNode({ title: name.trim() || "影片" });
        set({ name });
    };

    const input = { width: "100%", boxSizing: "border-box" as const, padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: "transparent", color: ctx.theme.node.text, fontSize: 13, outline: "none" };
    const select = { ...input, background: ctx.theme.toolbar.panel, fontWeight: 600 } as const;
    const lab = { fontSize: 13, fontWeight: 600, color: ctx.theme.node.text } as const;
    const btn = { padding: "6px 14px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 13 } as const;
    const versions = resolveVersions(m);
    const activeId = pickActiveId(versions, m.activeVersionId);

    const fitVideo = async (w: number | undefined, h: number | undefined, url: string) => {
        if (w && h) {
            const imgH = Math.min(520, Math.max(200, Math.round((300 * h) / w)));
            ctx.updateNode({ width: 300, height: imgH + 30 });
        } else {
            await fitNodeToImage((p) => ctx.updateNode(p), url);
        }
    };

    const switchVersion = async (id: string) => {
        const v = versions.find((item) => item.id === id);
        if (!v) return;
        set({ activeVersionId: id, content: v.image });
    };

    const deleteVersion = (id: string) => {
        const { rest, next } = nextAfterDelete(versions, activeId, id);
        set({ versions: rest, activeVersionId: next?.id, content: next?.image || "" });
    };

    const cancel = () => guard.cancel();

    const generate = async () => {
        // 防重复提交：共享 guard 同步检查与占用，不存在竞态；running/metadata 只做 UI 与跨面板持久。
        const controller = guard.begin();
        if (!controller) return;
        if (running || Boolean((ctx.node.metadata || {}).generating)) {
            guard.end();
            return;
        }
        setRunning(true);
        setError("");
        set({ generating: true, generateError: undefined });
        try {
            const promptText = ((m as { prompt?: unknown }).prompt as string) || "";
            if (!promptText.trim()) throw new Error("请先填写提示词");
            const refs = await Promise.all(((m.refs as unknown) instanceof Array ? (m.refs as string[]) : []).map((u) => downscaleImage(u)));
            const chosen = model || ctx.ai.defaultModel("video");
            const secs = Math.min(Math.max(Number(m.seconds) || spec.seconds.min, spec.seconds.min), secondsMax);
            console.info(`[video] 提交生成 参考图${refs.length}张 时长${secs}s`);
            const res = await ctx.ai.generateVideo(promptText, { references: refs, model: chosen, size: ratio, seconds: String(secs), signal: controller.signal });
            if (!res.url) throw new Error("生成未返回视频");
            const url = res.url;
            await fitVideo(res.width, res.height, url);
            // 函数式追加：与工具条导入并发时以前面最新 state 为准，不丢更新。
            set((prev) => versionAppendPatch(prev, url, promptText));
        } catch (e) {
            const raw = controller.signal.aborted ? "已取消" : e instanceof Error ? e.message : String(e);
            // 连接层失败（无响应）与业务失败要区分：前者任务可能已在后台建成，提示用户不要连点。
            const msg = /network error|ERR_|Failed to fetch|timeout|ECONN|aborted/i.test(raw) && raw !== "已取消" ? `${raw}（连接中断，后台任务可能仍在执行；请勿连点，稍后手动重试）` : raw;
            setError(msg);
            // 错误持久化：面板关闭重开仍可见；节点卡片底部同步红标。
            set({ generating: false, generateError: msg });
        } finally {
            guard.end();
        }
    };

    return (
        <div data-canvas-no-zoom onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, color: ctx.theme.node.text, background: ctx.theme.node.panel, borderRadius: 12, border: `1px solid ${ctx.theme.node.stroke}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>🎬 影片设定</span>
                <button type="button" onClick={onClose} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>
                    关闭
                </button>
            </div>
            <FieldGroup accent="#a78bfa" title="基础" theme={ctx.theme}>
                <label style={lab}>
                    名称
                    <input value={(m.name as string) || ""} onChange={(e) => setName(e.target.value)} placeholder="影片名称，也是节点名称" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>模型</div>
                    <select value={model} onChange={(e) => pickModel(e.target.value)} style={{ ...select, marginTop: 0 }}>
                        <option value="">{`默认模型（${ctx.ai.defaultModel("video")}）`}</option>
                        {ctx.ai.listModels("video").map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>比例</div>
                    <select value={ratio} onChange={(e) => set({ ratio: e.target.value })} style={{ ...select, marginTop: 0 }}>
                        {spec.ratios.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>
                        时长：{seconds} 秒{spec.caps ? `（${Object.entries(spec.caps).map(([k, v]) => `${k}≤${v}s`).join("、")}）` : ""}
                    </div>
                    <input type="range" min={spec.seconds.min} max={secondsMax} step={1} value={seconds} onChange={(e) => set({ seconds: e.target.value })} style={{ width: "100%" }} />
                    {spec.hint ? <div style={{ fontSize: 11, color: ctx.theme.node.muted, marginTop: 4 }}>{spec.hint}</div> : null}
                </div>
                <label style={lab}>
                    提示词
                    <textarea value={((m as { prompt?: unknown }).prompt as string) || ""} onChange={(e) => set({ prompt: e.target.value })} rows={4} placeholder="描述镜头、人物、动作、声音…" style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
            </FieldGroup>
            <FieldGroup accent="#a78bfa" title="参考图" theme={ctx.theme}>
                <ImagesField
                    label="首帧/参考"
                    values={Array.isArray(m.refs) ? (m.refs as string[]) : []}
                    max={REF_MAX}
                    candidates={canvasImages}
                    theme={ctx.theme}
                    onChange={(next) => set({ refs: next })}
                />
            </FieldGroup>
            <FieldGroup accent="#a78bfa" title={`版本（${versions.length}）`} theme={ctx.theme}>
                {versions.length ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {versions.map((v, i) => (
                            <div key={v.id} style={{ position: "relative", width: 56, height: 56 }}>
                                <video
                                    src={v.image}
                                    muted
                                    playsInline
                                    onClick={() => switchVersion(v.id)}
                                    title={v.prompt || `版本${i + 1}`}
                                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: v.id === activeId ? "2px solid #a78bfa" : `1px solid ${ctx.theme.node.stroke}`, boxSizing: "border-box", background: "#000" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => deleteVersion(v.id)}
                                    title="删除该版本"
                                    style={{ position: "absolute", right: -6, top: -6, width: 18, height: 18, borderRadius: 9, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: 12, color: ctx.theme.node.muted }}>生成后自动保存版本，点击切换，× 删除</div>
                )}
                <label style={{ ...btn, alignSelf: "flex-start", cursor: "pointer" }}>
                    导入视频
                    <input
                        type="file"
                        accept="video/*"
                        multiple
                        hidden
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            e.target.value = "";
                            importFilesAsVersions(ctx, files, () => ((m as { prompt?: unknown }).prompt as string) || "").catch((err) => setError(err instanceof Error ? err.message : String(err)));
                        }}
                    />
                </label>
            </FieldGroup>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {running ? (
                    <button type="button" onClick={() => guard.cancel()} style={btn}>
                        取消
                    </button>
                ) : (
                    <button type="button" onClick={() => generate()} style={{ ...btn, flex: 1 }}>
                        生成视频
                    </button>
                )}
            </div>
            <div style={{ fontSize: 11, color: ctx.theme.node.muted }}>清晰度跟随全局视频设置 · 参数表随模型自动切换</div>
            {errMsg && <div style={{ fontSize: 12, color: "#ef4444", whiteSpace: "pre-wrap" }}>{errMsg}</div>}
        </div>
    );
}

export default definePlugin({
    id: "video",
    name: "影片节点",
    version: "1.0.0",
    description: "按模型自适应参数的视频制作节点：表单填参，参考图生成视频",
    nodes: [
        {
            type: "video:film",
            title: "影片",
            icon: "🎬",
            description: "视频制作：参数随模型自适应，参考图生成视频",
            defaultSize: { width: 320, height: 240 },
            defaultMetadata: {},
            minimapColor: "#a78bfa",
            autoOpenPanel: true,
            panelPlacement: "left",
            hasTargetHandle: false, // 关闭上游传入：不接收其他节点的连线
            resource: (node) => {
                const url = activeImageUrl(node.metadata || {});
                return url ? { kind: "video", url } : null;
            },
            Content: VideoContent,
            Panel: VideoPanel,
            toolbar: (ctx) => [
                {
                    id: "download",
                    title: "下载选中版本",
                    label: "下载",
                    icon: "⬇️",
                    onClick: () => {
                        const meta = ctx.node.metadata || {};
                        const list = resolveVersions(meta);
                        const current = list.find((v) => v.id === meta.activeVersionId) || list[list.length - 1];
                        const url = current?.image || (typeof meta.content === "string" ? meta.content : "");
                        if (!url) return;
                        const num = list.findIndex((v) => v === current) + 1 || list.length;
                        downloadImage(url, versionFilename(typeof meta.name === "string" ? meta.name : "", "影片", num, "mp4")).catch((e) => console.error("[video] download failed", e));
                    },
                },
                {
                    id: "import",
                    title: "导入视频新增版本",
                    label: "导入",
                    icon: "📥",
                    onClick: () => {
                        pickImageFiles(
                            (files) => {
                                importFilesAsVersions(ctx, files, () => ((ctx.node.metadata as { prompt?: unknown } | undefined)?.prompt as string) || "").catch((e) =>
                                    ctx.updateMetadata({ generateError: e instanceof Error ? e.message : String(e) }),
                                );
                            },
                            "video/*",
                        );
                    },
                },
            ],
            onDoubleClick: (ctx) => {
                if (!activeImageUrl(ctx.node.metadata || {})) return false;
                ctx.updateMetadata({ previewOpen: true });
                return true;
            },
        },
    ],
});
