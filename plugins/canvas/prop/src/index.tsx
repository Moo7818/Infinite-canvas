// 道具节点:点击左侧弹出表单 → 拼装提示词 → 参考图生成道具图。
// 生成结果自动追加版本并写回本节点展示;下游输出当前选中版本图。
import { definePlugin, useEffect, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeContext, CanvasNodeData, CanvasNodeMetadata, CanvasNodePanelProps } from "@infinite-canvas/plugin-sdk";
import type { ReactNode } from "react";

export const PROMPT_PREFIX = "产品摄影，纯白色背景，影棚柔光，高精度细节呈现，无人物、无水印。";

export type PropFields = {
    name?: string;
    category?: string;
    style?: string;
    styleImage?: string;
    materialText?: string;
    materialImages?: string[]; // 最多 2
    detailText?: string;
    detailImages?: string[]; // 最多 3
    view?: string; // 视角：纯文本，无参考图
    extraText?: string;
    extraImages?: string[]; // 最多 2
};

export const MATERIAL_MAX = 2;
export const DETAIL_MAX = 3;
export const STYLE_IMAGE_MAX = 1;
export const EXTRA_MAX = 2;
export const CUSTOM_MAX_LEN = 20;
export const STYLE_PRESETS = ["影视写实摄影", "3D皮克斯卡通", "吉普力动画", "中国风水墨动画"];
export const VIEW_PRESETS = ["正视", "45°", "三视图", "细节特写"];

export type PropVersion = {
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
    const versions = Array.isArray(m.versions) ? (m.versions as PropVersion[]) : [];
    const active = versions.find((v) => v && v.id === m.activeVersionId) || versions[versions.length - 1];
    if (active?.image) return active.image;
    return typeof m.content === "string" ? m.content : "";
}

function fieldImages(many: unknown, max: number): string[] {
    if (!Array.isArray(many)) return [];
    return many.filter((v): v is string => typeof v === "string" && v.length > 0).slice(0, max);
}

// 按固定字段序收集参考图:材质(≤2) → 细节(≤3) → 风格(≤1) → 其他(≤2);n 为图在数组中的 1-based 位置。
export function buildPropPrompt(f: PropFields): { prompt: string; references: string[] } {
    const material = fieldImages(f.materialImages, MATERIAL_MAX);
    const detail = fieldImages(f.detailImages, DETAIL_MAX);
    const style = fieldImages(f.styleImage ? [f.styleImage] : [], STYLE_IMAGE_MAX);
    const extra = fieldImages(f.extraImages, EXTRA_MAX);
    const references = [...material, ...detail, ...style, ...extra];
    const positions = (imgs: string[]) => imgs.map((img) => references.indexOf(img) + 1).join("、");
    const mark = (label: string, imgs: string[]) => (imgs.length ? `（${label}参考图片${positions(imgs)}）` : "");

    const parts: string[] = [PROMPT_PREFIX];
    if (f.name?.trim()) parts.push(`道具名称：${f.name.trim()}。`);
    if (f.category?.trim()) parts.push(`类别：${f.category.trim()}。`);
    if (f.materialText?.trim() || material.length) {
        parts.push(`材质：${f.materialText?.trim() || ""}${mark("材质", material)}。`);
    }
    if (f.detailText?.trim() || detail.length) {
        parts.push(`细节：${f.detailText?.trim() || ""}${mark("细节", detail)}。`);
    }
    if (f.view?.trim()) parts.push(`视角：${f.view.trim()}。`);
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
    const textKeys = ["name", "category", "style", "materialText", "detailText", "view", "extraText"];
    const textCount = textKeys.filter((k) => {
        const v = r[k];
        return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const imageCount = [r.materialImages, r.detailImages, r.styleImage ? [r.styleImage] : [], r.extraImages].filter((v) => fieldImages(v, 99).length > 0).length;
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

// 下载选中版本：dataURL 直下；远端 URL 先抓成 blob（跨域失败时抛错提示）。
async function downloadImage(url: string, filename: string): Promise<void> {
    let tmp = "";
    try {
        let href = url;
        if (/^https?:\/\//i.test(url)) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`下载失败（${res.status}）`);
            tmp = URL.createObjectURL(await res.blob());
            href = tmp;
        }
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } finally {
        if (tmp) setTimeout(() => URL.revokeObjectURL(tmp), 5000);
    }
}

function imageDims(src: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
        img.onerror = () => resolve({ w: 1, h: 1 });
        img.src = src;
    });
}

// 在途生成的取消器：模块常驻，面板开关不影响；刷新后 Map 为空，靠 generating 残留自愈。
const runningControllers = new Map<string, AbortController>();

// 导入图片新增版本：面板与工具条共用；失败抛错由调用方展示。
async function importFilesAsVersions(ctx: CanvasNodeContext, files: File[]): Promise<void> {
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => readImageFile(f)));
    const m = ctx.node.metadata || {};
    const versions = (Array.isArray(m.versions) ? (m.versions as PropVersion[]) : []).filter((v) => v && v.image);
    const prompt = buildPropPrompt(m as PropFields).prompt;
    const added: PropVersion[] = urls.map((url) => ({ id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() }));
    const next = [...versions, ...added];
    const last = added[added.length - 1];
    const d = await imageDims(last.image);
    const imgH = Math.min(520, Math.max(200, Math.round((300 * d.h) / d.w)));
    ctx.updateNode({ width: 300, height: imgH + 30 });
    ctx.updateMetadata({ versions: next, activeVersionId: last.id, content: last.image, status: "success", generating: false, generateError: undefined });
}

// 工具条调起系统文件选择框（工具条项无 DOM 插槽，只能动态创建 input）。
function pickImageFiles(onFiles: (files: File[]) => void): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
        const files = Array.from(input.files || []);
        if (files.length) onFiles(files);
    };
    input.click();
}

function PropContent({ ctx }: CanvasNodeContentProps) {
    const m = ctx.node.metadata || {};
    const result = activeImage(m);
    const versions = Array.isArray(m.versions) ? (m.versions as PropVersion[]) : [];
    const count = filledCount(m);
    return (
        <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", pointerEvents: "none", color: ctx.theme.node.text }}>
            {result ? (
                <img src={result} alt="" style={{ flex: 1, minHeight: 0, width: "100%", objectFit: "cover" }} />
            ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: ctx.theme.node.placeholder }}>
                    <span style={{ fontSize: 32 }}>🔨</span>
                    <span>点击填写道具表单</span>
                </div>
            )}
            <div style={{ padding: "6px 12px", fontSize: 12, color: ctx.theme.node.muted, borderTop: `1px solid ${ctx.theme.node.stroke}` }}>
                {(m.name as string) || "未命名道具"} · 已填 {count}/11{versions.length > 1 ? ` · 版本 ${versions.findIndex((v) => v.id === m.activeVersionId) + 1 || versions.length}/${versions.length}` : ""}
                {typeof m.generateError === "string" && m.generateError ? <span title={m.generateError} style={{ color: "#ef4444" }}> · 上次失败</span> : null}
            </div>
            {Boolean(m.previewOpen) && result !== "" && (
                <div
                    onClick={() => ctx.updateMetadata({ previewOpen: false })}
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
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "#fb923c", marginRight: 6 }} />
                {title}
            </div>
            {children}
        </div>
    );
}

// 画布图片候选：内置图片节点与三自有节点都把图同步到 metadata.content，直接可读。
// 快照式：选中时把 URL 拷入字段数组，与上传同流；远端 URL 跨域下不来时宿主侧会报错。
function nodeImageUrl(n: CanvasNodeData): string | null {
    const c = n.metadata?.content;
    if (typeof c === "string" && (c.startsWith("data:image/") || /^https?:\/\//i.test(c))) return c;
    return null;
}

function ImagesField({ label, values, max, onChange, candidates, theme }: { label: string; values: string[]; max: number; onChange: (next: string[]) => void; candidates: { id: string; title: string; url: string }[]; theme: CanvasNodeContentProps["ctx"]["theme"] }) {
    const [picking, setPicking] = useState(false);
    const fresh = candidates.filter((c) => !values.includes(c.url));
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
                    <>
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
                        {values.length < max && (
                            <button
                                type="button"
                                onClick={() => setPicking((v) => !v)}
                                style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${theme.node.stroke}`, background: picking ? theme.node.fill : theme.toolbar.panel, color: theme.node.text, cursor: "pointer", fontSize: 12 }}
                            >
                                画布选择
                            </button>
                        )}
                    </>
                )}
            </div>
            {picking && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 132, overflow: "auto", marginTop: 8, padding: 8, borderRadius: 8, background: theme.node.fill }}>
                    {fresh.length ? (
                        fresh.map((c) => (
                            <img
                                key={c.id}
                                src={c.url}
                                alt={c.title}
                                title={`引用：${c.title}`}
                                onClick={() => {
                                    const next = [...values, c.url].slice(0, max);
                                    onChange(next);
                                    if (next.length >= max) setPicking(false);
                                }}
                                style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1px solid ${theme.node.stroke}` }}
                            />
                        ))
                    ) : (
                        <div style={{ fontSize: 12, color: theme.node.muted }}>画布上暂无更多可用图片</div>
                    )}
                </div>
            )}
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

function PropPanel({ ctx, onClose }: CanvasNodePanelProps) {
    const m = ctx.node.metadata || {};
    // 模型选择持久化到 metadata，面板关闭重开不丢失。
    const [model, setModel] = useState(typeof m.model === "string" ? m.model : "");
    // 生成态持久化：generating 进 metadata，关面板重开不丢失；在途请求靠模块级取消器接管。
    const [running, setRunning] = useState(Boolean((ctx.node.metadata || {}).generating));
    useEffect(() => {
        // 兜底：generating 为真但本会话无在途请求（刷新/崩溃残留）。
        // 请求无法续跑（任务 id 随旧页面销毁），标记为中断而不是静默清空，让用户知道发生了什么。
        if ((ctx.node.metadata || {}).generating && !runningControllers.has(ctx.node.id)) {
            ctx.updateMetadata({ generating: false, generateError: "页面刷新导致生成中断，后台任务状态未知；如需结果请重新生成。" });
            setRunning(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
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
    const preview = buildPropPrompt(m as PropFields).prompt;
    const errMsg = error || (typeof m.generateError === "string" ? m.generateError : "");
    const canvasImages = ctx
        .getNodes()
        .filter((n) => n.id !== ctx.node.id)
        .map((n) => ({ id: n.id, title: n.title, url: nodeImageUrl(n) }))
        .filter((c): c is { id: string; title: string; url: string } => c.url !== null);

    const set = (patch: CanvasNodeMetadata) => ctx.updateMetadata(patch);
    const setName = (name: string) => {
        ctx.updateNode({ title: name.trim() || "道具" });
        set({ name });
    };
    const pickModel = (v: string) => {
        setModel(v);
        set({ model: v || undefined });
    };

    const input = { width: "100%", boxSizing: "border-box" as const, padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: "transparent", color: ctx.theme.node.text, fontSize: 13, outline: "none" };
    const select = { ...input, background: ctx.theme.toolbar.panel, fontWeight: 600 } as const;
    const lab = { fontSize: 13, fontWeight: 600, color: ctx.theme.node.text } as const;
    const btn = { padding: "6px 14px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 13 } as const;
    const versions = (Array.isArray(m.versions) ? (m.versions as PropVersion[]) : []).filter((v) => v && v.image);
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

    const cancel = () => runningControllers.get(ctx.node.id)?.abort();

    const generate = async () => {
        // 防重复提交：Map 检查与占用是同步代码，不存在竞态；running/metadata 只做 UI 与跨面板持久。
        if (runningControllers.has(ctx.node.id)) return;
        if (running || Boolean((ctx.node.metadata || {}).generating)) return;
        const controller = new AbortController();
        runningControllers.set(ctx.node.id, controller);
        setRunning(true);
        setError("");
        set({ generating: true, generateError: undefined });
        try {
            const { prompt, references } = buildPropPrompt(m as PropFields);
            const chosen = model || ctx.ai.defaultModel("image");
            // 默认 16:9；画质位由宿主全局设置决定（建议 2K），插件侧无 quality 通道。
            const res = await ctx.ai.generateImage(prompt, { references, model: chosen, size: "16:9", signal: controller.signal });
            if (!res.images.length) throw new Error("生成未返回图片");
            const url = res.images[0];
            await fitNode(url);
            // 每次生成自动追加为新版本并选中；老节点首次生成时把旧图收为版本 1。
            const nextVersions = [...versions];
            if (!nextVersions.length && typeof m.content === "string" && m.content) {
                nextVersions.push({ id: newVersionId(), image: m.content, prompt: "", createdAt: "" });
            }
            const ver: PropVersion = { id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() };
            nextVersions.push(ver);
            set({ versions: nextVersions, activeVersionId: ver.id, content: url, status: "success", generating: false, generateError: undefined });
        } catch (e) {
            const raw = controller.signal.aborted ? "已取消" : e instanceof Error ? e.message : String(e);
            // 连接层失败（无响应）与业务失败要区分：前者任务可能已在后台建成，提示用户不要连点。
            const msg = /network error|ERR_|Failed to fetch|timeout|ECONN|aborted/i.test(raw) && raw !== "已取消" ? `${raw}（连接中断，后台任务可能仍在执行；请勿连点，稍后手动重试）` : raw;
            setError(msg);
            // 错误持久化：面板关闭重开仍可见；节点卡片底部同步红标。
            set({ generating: false, generateError: msg });
        } finally {
            runningControllers.delete(ctx.node.id);
            setRunning(false);
        }
    };

    return (
        <div data-canvas-no-zoom onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, color: ctx.theme.node.text, background: ctx.theme.node.panel, borderRadius: 12, border: `1px solid ${ctx.theme.node.stroke}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>🔨 道具设定</span>
                <button type="button" onClick={onClose} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>
                    关闭
                </button>
            </div>
            <FieldGroup title="基础" theme={ctx.theme}>
                <label style={lab}>
                    名称
                    <input value={(m.name as string) || ""} onChange={(e) => setName(e.target.value)} placeholder="道具名称，也是节点名称" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <label style={lab}>
                    类别
                    <input value={(m.category as string) || ""} onChange={(e) => set({ category: e.target.value })} placeholder="如：武器、饰品、家具" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>风格</div>
                    <PresetSelect value={(m.style as string) || ""} presets={STYLE_PRESETS} placeholder="自定义风格，最多20字" onChange={(v) => set({ style: v })} style={{ ...select, marginTop: 0 }} />
                </div>
                <ImagesField label="风格参考图" values={fieldImages(m.styleImage ? [m.styleImage] : [], STYLE_IMAGE_MAX)} max={STYLE_IMAGE_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ styleImage: next[0] })} />
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>视角</div>
                    <PresetSelect value={(m.view as string) || ""} presets={VIEW_PRESETS} placeholder="自定义视角，最多20字" onChange={(v) => set({ view: v })} style={{ ...select, marginTop: 0 }} />
                </div>
            </FieldGroup>
            <FieldGroup title="材质" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.materialText as string) || ""} onChange={(e) => set({ materialText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.materialImages, MATERIAL_MAX)} max={MATERIAL_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ materialImages: next })} />
            </FieldGroup>
            <FieldGroup title="细节" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.detailText as string) || ""} onChange={(e) => set({ detailText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.detailImages, DETAIL_MAX)} max={DETAIL_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ detailImages: next })} />
            </FieldGroup>
            <FieldGroup title="其他" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.extraText as string) || ""} onChange={(e) => set({ extraText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.extraImages, EXTRA_MAX)} max={EXTRA_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ extraImages: next })} />
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
                                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: v.id === activeId ? "2px solid #fb923c" : `1px solid ${ctx.theme.node.stroke}`, boxSizing: "border-box" }}
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
                    导入图片
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            e.target.value = "";
                            importFilesAsVersions(ctx, files).catch((err) => setError(err instanceof Error ? err.message : String(err)));
                        }}
                    />
                </label>
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
                {running ? (
                    <button type="button" onClick={cancel} style={btn}>
                        取消
                    </button>
                ) : (
                    <button type="button" onClick={generate} style={btn}>
                        生成道具图
                    </button>
                )}
            </div>
            <div style={{ fontSize: 11, color: ctx.theme.node.muted }}>尺寸默认 16:9 · 画质跟随全局图片设置（建议 2K）</div>
            {errMsg && <div style={{ fontSize: 12, color: "#ef4444", whiteSpace: "pre-wrap" }}>{errMsg}</div>}
        </div>
    );
}

export default definePlugin({
    id: "prop",
    name: "道具节点",
    version: "1.0.1",
    description: "填写道具表单，拼装提示词并用参考图生成道具图",
    nodes: [
        {
            type: "prop:item",
            title: "道具",
            icon: "🔨",
            description: "道具设定：表单拼装提示词，参考图生成产品级道具图",
            defaultSize: { width: 300, height: 360 },
            defaultMetadata: {},
            minimapColor: "#fb923c",
            autoOpenPanel: true,
            panelPlacement: "left",
            hasTargetHandle: false, // 关闭上游传入：不接收其他节点的连线
            resource: (node) => {
                const url = activeImage(node.metadata || {});
                return url ? { kind: "image", url } : null;
            },
            Content: PropContent,
            Panel: PropPanel,
            toolbar: (ctx) => [
                {
                    id: "download",
                    title: "下载选中版本",
                    label: "下载",
                    icon: "⬇️",
                    onClick: () => {
                        const meta = ctx.node.metadata || {};
                        const list = (Array.isArray(meta.versions) ? (meta.versions as PropVersion[]) : []).filter((v) => v && v.image);
                        const current = list.find((v) => v.id === meta.activeVersionId) || list[list.length - 1];
                        const url = current?.image || (typeof meta.content === "string" ? meta.content : "");
                        if (!url) return;
                        const num = list.findIndex((v) => v === current) + 1 || list.length;
                        const filename = `${((typeof meta.name === "string" && meta.name) || "道具").replace(/[\\/:*?"<>|]/g, "_")}-v${num}.png`;
                        downloadImage(url, filename).catch((e) => console.error("[prop] download failed", e));
                    },
                },
                {
                    id: "import",
                    title: "导入图片新增版本",
                    label: "导入",
                    icon: "📥",
                    onClick: () => {
                        pickImageFiles((files) => {
                            importFilesAsVersions(ctx, files).catch((e) => ctx.updateMetadata({ generateError: e instanceof Error ? e.message : String(e) }));
                        });
                    },
                },
            ],
            onDoubleClick: (ctx) => {
                if (!activeImage(ctx.node.metadata || {})) return false;
                ctx.updateMetadata({ previewOpen: true });
                return true;
            },
        },
    ],
});
