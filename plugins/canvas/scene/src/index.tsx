// 场景节点:点击左侧弹出表单 → 拼装提示词 → 参考图生成场景图。
// 生成结果自动追加版本并写回本节点展示;下游输出当前选中版本图。
import { definePlugin, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeMetadata, CanvasNodePanelProps } from "@infinite-canvas/plugin-sdk";
import type { ReactNode } from "react";

export const PROMPT_PREFIX = "电影质感实拍场景，超广角全景构图，纯净无人物、无水印，1/4黑柔滤镜，光线柔和均匀。";

export type SceneFields = {
    name?: string;
    time?: string;
    style?: string;
    styleImage?: string;
    envText?: string;
    envImages?: string[]; // 最多 3
    lightText?: string;
    lightImages?: string[]; // 最多 2
    camera?: string; // 机位：纯文本，无参考图
    extraText?: string;
    extraImages?: string[]; // 最多 2
};

export const ENV_MAX = 3;
export const LIGHT_MAX = 2;
export const STYLE_IMAGE_MAX = 1;
export const EXTRA_MAX = 2;
export const CUSTOM_MAX_LEN = 20;
export const STYLE_PRESETS = ["影视写实摄影", "3D皮克斯卡通", "吉普力动画", "中国风水墨动画"];
export const TIME_PRESETS = ["清晨", "白天", "黄昏", "夜晚"];
export const CAMERA_PRESETS = ["广角全景", "中景", "特写", "俯视", "仰视", "航拍"];

export type SceneVersion = {
    id: string;
    image: string;
    prompt: string;
    createdAt: string;
};

function newVersionId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// 当前展示图：选中版本 > 旧版 content（未迁移的老节点）
function activeImage(m: CanvasNodeMetadata): string {
    const versions = Array.isArray(m.versions) ? (m.versions as SceneVersion[]) : [];
    const active = versions.find((v) => v && v.id === m.activeVersionId) || versions[versions.length - 1];
    if (active?.image) return active.image;
    return typeof m.content === "string" ? m.content : "";
}

function fieldImages(many: unknown, max: number): string[] {
    if (!Array.isArray(many)) return [];
    return many.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, max);
}

// 按固定字段序收集参考图:环境(≤3) → 光影(≤2) → 风格(≤1) → 其他(≤2);n 为图在数组中的 1-based 位置。
export function buildScenePrompt(f: SceneFields): { prompt: string; references: string[] } {
    const env = fieldImages(f.envImages, ENV_MAX);
    const light = fieldImages(f.lightImages, LIGHT_MAX);
    const style = fieldImages(f.styleImage ? [f.styleImage] : [], STYLE_IMAGE_MAX);
    const extra = fieldImages(f.extraImages, EXTRA_MAX);
    const references = [...env, ...light, ...style, ...extra];
    const positions = (imgs: string[]) => imgs.map((img) => references.indexOf(img) + 1).join("、");
    const mark = (label: string, imgs: string[]) => (imgs.length ? `（${label}参考图片${positions(imgs)}）` : "");

    const parts: string[] = [PROMPT_PREFIX];
    if (f.name?.trim()) parts.push(`场景名称：${f.name.trim()}。`);
    if (f.time?.trim()) parts.push(`时间：${f.time.trim()}。`);
    if (f.envText?.trim() || env.length) {
        parts.push(`环境：${f.envText?.trim() || ""}${mark("环境", env)}。`);
    }
    if (f.lightText?.trim() || light.length) {
        parts.push(`光影：${f.lightText?.trim() || ""}${mark("光影", light)}。`);
    }
    if (f.camera?.trim()) parts.push(`机位：${f.camera.trim()}。`);
    if (f.style?.trim() || style.length) {
        parts.push(`风格：${f.style?.trim() || ""}${mark("风格", style)}。`);
    }
    if (f.extraText?.trim() || extra.length) {
        parts.push(`其他：${f.extraText?.trim() || ""}${mark("其他", extra)}。`);
    }
    return { prompt: parts.join(""), references };
}

function filledCount(m: CanvasNodeMetadata): number {
    const r = m as Record<string, unknown>;
    const textKeys = ["name", "time", "style", "envText", "lightText", "camera", "extraText"];
    const textCount = textKeys.filter((k) => {
        const v = r[k];
        return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const imageCount = [r.envImages, r.lightImages, r.styleImage ? [r.styleImage] : [], r.extraImages].filter((v) => fieldImages(v, 99).length > 0).length;
    return textCount + imageCount;
}

function readImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function imageDims(src: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
        img.onerror = () => resolve({ w: 1, h: 1 });
        img.src = src;
    });
}

function SceneContent({ ctx }: CanvasNodeContentProps) {
    const m = ctx.node.metadata || {};
    const result = activeImage(m);
    const previewOpen = Boolean(m.previewOpen) && result !== "";
    const versions = Array.isArray(m.versions) ? (m.versions as SceneVersion[]) : [];
    const count = filledCount(m);
    return (
        <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", pointerEvents: "none", color: ctx.theme.node.text }}>
            {result ? (
                <img src={result} alt="" style={{ flex: 1, minHeight: 0, width: "100%", objectFit: "cover" }} />
            ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: ctx.theme.node.placeholder }}>
                    <span style={{ fontSize: 32 }}>🏞️</span>
                    <span>点击填写场景表单</span>
                </div>
            )}
            <div style={{ padding: "6px 12px", fontSize: 12, color: ctx.theme.node.muted, borderTop: `1px solid ${ctx.theme.node.stroke}` }}>
                {(m.name as string) || "未命名场景"} · 已填 {count}/11{versions.length > 1 ? ` · 版本 ${versions.findIndex((v) => v.id === m.activeVersionId) + 1 || versions.length}/${versions.length}` : ""}
            </div>
            {previewOpen && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        ctx.updateMetadata({ previewOpen: false });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "grid", placeItems: "center", pointerEvents: "auto" }}
                >
                    <img src={result} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 12 }} />
                </div>
            )}
        </div>
    );
}

function FieldGroup({ title, children, theme }: { title: string; children: ReactNode; theme: CanvasNodeContentProps["ctx"]["theme"] }) {
    return (
        <div style={{ border: `1px solid ${theme.node.stroke}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.node.text, display: "flex", alignItems: "center" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "#38bdf8", marginRight: 6 }} />
                {title}
            </div>
            {children}
        </div>
    );
}

function ImagesField({ label, values, max, onChange, theme }: { label: string; values: string[]; max: number; onChange: (next: string[]) => void; theme: CanvasNodeContentProps["ctx"]["theme"] }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: theme.node.muted, marginBottom: 4 }}>
                {label}（{values.length}/{max}）
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {values.map((src, i) => (
                    <div key={`${i}`} style={{ position: "relative", width: 48, height: 48 }}>
                        <img src={src} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: `1px solid ${theme.node.stroke}` }} />
                        <button
                            type="button"
                            onClick={() => onChange(values.filter((_, j) => j !== i))}
                            title="删除"
                            style={{ position: "absolute", right: -6, top: -6, width: 18, height: 18, borderRadius: 9, border: `1px solid ${theme.node.stroke}`, background: theme.toolbar.panel, color: theme.node.text, cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 }}
                        >
                            ×
                        </button>
                    </div>
                ))}
                {values.length < max && (
                    <label style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${theme.node.stroke}`, background: theme.toolbar.panel, color: theme.node.text, cursor: "pointer", fontSize: 12 }}>
                        上传
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                e.target.value = "";
                                if (!files.length) return;
                                const picked = await Promise.all(files.map((f) => readImageFile(f)));
                                onChange([...values, ...picked].slice(0, max));
                            }}
                        />
                    </label>
                )}
            </div>
        </div>
    );
}

// 预制下拉 + 自定义：与模型选择器同款样式；自定义最多 CUSTOM_MAX_LEN 字。
function PresetSelect({ value, presets, placeholder, onChange, style }: { value: string; presets: string[]; placeholder: string; onChange: (v: string | undefined) => void; style: Record<string, string | number> }) {
    const [custom, setCustom] = useState(false);
    const showCustom = custom || (value !== "" && !presets.includes(value));
    return (
        <>
            <select
                value={showCustom ? "__custom" : value}
                onChange={(e) => {
                    if (e.target.value === "__custom") {
                        setCustom(true);
                    } else {
                        setCustom(false);
                        onChange(e.target.value || undefined);
                    }
                }}
                style={style}
            >
                <option value="">未选择</option>
                {presets.map((s) => (
                    <option key={s} value={s}>
                        {s}
                    </option>
                ))}
                <option value="__custom">自定义…</option>
            </select>
            {showCustom && <input value={presets.includes(value) ? "" : value} maxLength={CUSTOM_MAX_LEN} onChange={(e) => onChange(e.target.value || undefined)} placeholder={placeholder} style={{ ...style, marginTop: 6, fontWeight: 400 }} />}
        </>
    );
}

function ScenePanel({ ctx, onClose }: CanvasNodePanelProps) {
    const m = ctx.node.metadata || {};
    const [model, setModel] = useState(typeof m.model === "string" ? m.model : "");
    // 模型选择持久化到 metadata，面板关闭重开不丢失。
    const pickModel = (v: string) => {
        setModel(v);
        set({ model: v || undefined });
    };
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    // 模型下拉只保留 nano-2 / nano-pro / image 系列；无命中时回退全量，避免空下拉卡死。
    const MODEL_ALLOW = ["nano-2", "nano-pro", "image"];
    const allModels = ctx.ai.listModels("image");
    const models = (() => {
        const hit = allModels.filter((o) => {
            const hay = `${o.value} ${o.label}`.toLowerCase();
            return MODEL_ALLOW.some((k) => hay.includes(k));
        });
        return hit.length ? hit : allModels;
    })();
    const preview = buildScenePrompt(m as SceneFields).prompt;

    const set = (patch: CanvasNodeMetadata) => ctx.updateMetadata(patch);
    const setName = (name: string) => {
        ctx.updateNode({ title: name.trim() || "场景" });
        set({ name });
    };

    const input = { width: "100%", boxSizing: "border-box" as const, padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: "transparent", color: ctx.theme.node.text, fontSize: 13, outline: "none" };
    const select = { ...input, background: ctx.theme.toolbar.panel, fontWeight: 600 } as const;
    const lab = { fontSize: 13, fontWeight: 600, color: ctx.theme.node.text } as const;
    const btn = { padding: "6px 14px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 13 } as const;
    const versions = (Array.isArray(m.versions) ? (m.versions as SceneVersion[]) : []).filter((v) => v && v.image);
    const activeId = versions.some((v) => v.id === m.activeVersionId) ? (m.activeVersionId as string) : versions[versions.length - 1]?.id;

    // 节点宽高自适应图片比例：宽固定 300，图高按比例换算后夹紧，+30 留给底部状态条。
    const fitNode = async (url: string) => {
        const d = await imageDims(url);
        const imgH = Math.min(520, Math.max(200, Math.round((300 * d.h) / d.w)));
        ctx.updateNode({ width: 300, height: imgH + 30 });
    };

    const switchVersion = async (id: string) => {
        const v = versions.find((item) => item.id === id);
        if (!v) return;
        await fitNode(v.image);
        set({ activeVersionId: id, content: v.image });
    };

    const deleteVersion = (id: string) => {
        const rest = versions.filter((item) => item.id !== id);
        const next = rest.some((item) => item.id === activeId) ? rest.find((item) => item.id === activeId) : rest[rest.length - 1];
        set({ versions: rest, activeVersionId: next?.id, content: next?.image || "" });
        if (next) void fitNode(next.image);
    };

    const generate = async () => {
        setRunning(true);
        setError("");
        try {
            const { prompt, references } = buildScenePrompt(m as SceneFields);
            const chosen = model || ctx.ai.defaultModel("image");
            // 默认 16:9；画质位由宿主全局设置决定（建议 2K），插件侧无 quality 通道。
            const res = await ctx.ai.generateImage(prompt, { references, model: chosen, size: "16:9" });
            if (!res.images.length) throw new Error("生成未返回图片");
            const url = res.images[0];
            await fitNode(url);
            // 每次生成自动追加为新版本并选中；老节点首次生成时把旧图收为版本 1。
            const nextVersions = [...versions];
            if (!nextVersions.length && typeof m.content === "string" && m.content) {
                nextVersions.push({ id: newVersionId(), image: m.content, prompt: "", createdAt: "" });
            }
            const ver: SceneVersion = { id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() };
            nextVersions.push(ver);
            set({ versions: nextVersions, activeVersionId: ver.id, content: url, status: "success" });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setRunning(false);
        }
    };

    return (
        <div data-canvas-no-zoom onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, color: ctx.theme.node.text, background: ctx.theme.node.panel, borderRadius: 12, border: `1px solid ${ctx.theme.node.stroke}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>🏞️ 场景设定</span>
                <button type="button" onClick={onClose} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>
                    关闭
                </button>
            </div>
            <FieldGroup title="基础" theme={ctx.theme}>
                <label style={lab}>
                    名称
                    <input value={(m.name as string) || ""} onChange={(e) => setName(e.target.value)} placeholder="场景名称，也是节点名称" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>时间</div>
                    <PresetSelect value={(m.time as string) || ""} presets={TIME_PRESETS} placeholder="自定义时间，最多20字" onChange={(v) => set({ time: v })} style={{ ...select, marginTop: 0 }} />
                </div>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>风格</div>
                    <PresetSelect value={(m.style as string) || ""} presets={STYLE_PRESETS} placeholder="自定义风格，最多20字" onChange={(v) => set({ style: v })} style={{ ...select, marginTop: 0 }} />
                </div>
                <ImagesField label="风格参考图" values={fieldImages(m.styleImage ? [m.styleImage] : [], STYLE_IMAGE_MAX)} max={STYLE_IMAGE_MAX} theme={ctx.theme} onChange={(next) => set({ styleImage: next[0] })} />
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>机位</div>
                    <PresetSelect value={(m.camera as string) || ""} presets={CAMERA_PRESETS} placeholder="自定义机位，最多20字" onChange={(v) => set({ camera: v })} style={{ ...select, marginTop: 0 }} />
                </div>
            </FieldGroup>
            <FieldGroup title="环境" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.envText as string) || ""} onChange={(e) => set({ envText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.envImages, ENV_MAX)} max={ENV_MAX} theme={ctx.theme} onChange={(next) => set({ envImages: next })} />
            </FieldGroup>
            <FieldGroup title="光影" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.lightText as string) || ""} onChange={(e) => set({ lightText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.lightImages, LIGHT_MAX)} max={LIGHT_MAX} theme={ctx.theme} onChange={(next) => set({ lightImages: next })} />
            </FieldGroup>
            <FieldGroup title="其他" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.extraText as string) || ""} onChange={(e) => set({ extraText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.extraImages, EXTRA_MAX)} max={EXTRA_MAX} theme={ctx.theme} onChange={(next) => set({ extraImages: next })} />
            </FieldGroup>
            <div>
                <div style={{ fontSize: 12, color: ctx.theme.node.muted, marginBottom: 4 }}>提示词预览</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, padding: "8px 10px", borderRadius: 8, background: ctx.theme.node.fill, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>{preview}</div>
            </div>
            <FieldGroup title={`版本（${versions.length}）`} theme={ctx.theme}>
                {versions.length ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {versions.map((v, i) => (
                            <div key={v.id} style={{ position: "relative", width: 56, height: 56 }}>
                                <img
                                    src={v.image}
                                    alt={`版本${i + 1}`}
                                    title={v.prompt || `版本${i + 1}`}
                                    onClick={() => switchVersion(v.id)}
                                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: v.id === activeId ? "2px solid #38bdf8" : `1px solid ${ctx.theme.node.stroke}`, boxSizing: "border-box" }}
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
            </FieldGroup>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={model} onChange={(e) => pickModel(e.target.value)} style={{ ...select, flex: 1 }}>
                    <option value="">{`默认模型（${ctx.ai.defaultModel("image")}）`}</option>
                    {models.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <button type="button" onClick={generate} disabled={running} style={{ ...btn, opacity: running ? 0.6 : 1 }}>
                    {running ? "生成中…" : "生成场景图"}
                </button>
            </div>
            <div style={{ fontSize: 11, color: ctx.theme.node.muted }}>尺寸默认 16:9 · 画质跟随全局图片设置（建议 2K）</div>
            {error && <div style={{ fontSize: 12, color: "#ef4444" }}>{error}</div>}
        </div>
    );
}

export default definePlugin({
    id: "scene",
    name: "场景节点",
    version: "1.0.0",
    description: "填写场景表单，拼装提示词并用参考图生成场景图",
    nodes: [
        {
            type: "scene:view",
            title: "场景",
            icon: "🏞️",
            description: "场景设定：表单拼装提示词，参考图生成电影质感场景",
            defaultSize: { width: 300, height: 360 },
            defaultMetadata: {},
            minimapColor: "#38bdf8",
            autoOpenPanel: true,
            panelPlacement: "left",
            hasTargetHandle: false, // 关闭上游传入：不接收其他节点的连线
            resource: (node) => {
                const url = activeImage(node.metadata || {});
                return url ? { kind: "image", url } : null;
            },
            Content: SceneContent,
            Panel: ScenePanel,
            toolbar: (ctx) => [
                {
                    id: "zoom",
                    title: "放大预览",
                    label: "放大",
                    icon: "🔍",
                    onClick: () => {
                        if (activeImage(ctx.node.metadata || {})) ctx.updateMetadata({ previewOpen: true });
                    },
                },
            ],
        },
    ],
});
