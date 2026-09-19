// 角色节点:点击弹出表单 → 拼装提示词 → 参考图生成角色设定图。
// 生成结果写回本节点展示;拼装文本经 resource 输出,可连给下游节点消费。
import { definePlugin, useEffect, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeContext, CanvasNodeData, CanvasNodeMetadata, CanvasNodePanelProps } from "@infinite-canvas/plugin-sdk";
import type { ReactNode } from "react";

export const PROMPT_PREFIX =
    "左侧为角色半身近景，右侧为人物全身三视图（正面、侧边、背面，正面视图不显示头部区域），纯白色背景，光线柔和均匀，1/4黑柔滤镜、电影质感摄影实拍。";

export type CharacterFields = {
    name?: string;
    age?: number;
    traits?: string;
    style?: string;
    faceText?: string;
    faceImage?: string; // 旧版单图，读取时并入 faceImages
    faceImages?: string[]; // 最多 3
    outfitText?: string;
    outfitImage?: string; // 旧版单图，读取时并入 outfitImages
    outfitImages?: string[]; // 最多 2
    extraText?: string;
    extraImage?: string; // 旧版单图，读取时并入 extraImages
    extraImages?: string[]; // 最多 3
};

export const FACE_MAX = 3;
export const OUTFIT_MAX = 2;
export const EXTRA_MAX = 3;
export const STYLE_MAX_LEN = 20;
export const STYLE_PRESETS = ["影视写实摄影", "3D皮克斯卡通", "吉普力动画", "中国风水墨动画"];

export type CharacterVersion = {
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
    const versions = Array.isArray(m.versions) ? (m.versions as CharacterVersion[]) : [];
    const active = versions.find((v) => v && v.id === m.activeVersionId) || versions[versions.length - 1];
    if (active?.image) return active.image;
    return typeof m.content === "string" ? m.content : "";
}

// 读图：新版数组 + 旧版单字段合并去重，保证老节点可用。
function fieldImages(one: unknown, many: unknown, max: number): string[] {
    const list: string[] = [];
    if (Array.isArray(many)) list.push(...many.filter((v): v is string => typeof v === "string" && v.length > 0));
    if (typeof one === "string" && one.length > 0 && !list.includes(one)) list.push(one);
    return list.slice(0, max);
}

// 按固定字段序收集参考图:容貌(≤3) → 服装(≤2) → 其他(≤3);n 为图在数组中的 1-based 位置。
export function buildCharacterPrompt(f: CharacterFields): { prompt: string; references: string[] } {
    const face = fieldImages(f.faceImage, f.faceImages, FACE_MAX);
    const outfit = fieldImages(f.outfitImage, f.outfitImages, OUTFIT_MAX);
    const extra = fieldImages(f.extraImage, f.extraImages, EXTRA_MAX);
    const references = [...face, ...outfit, ...extra];
    const positions = (imgs: string[]) => imgs.map((img) => references.indexOf(img) + 1).join("、");
    const mark = (label: string, imgs: string[]) => (imgs.length ? `（${label}参考图片${positions(imgs)}）` : "");

    const parts: string[] = [PROMPT_PREFIX];
    const head: string[] = [];
    if (f.name?.trim()) head.push(`角色名称：${f.name.trim()}`);
    if (f.age !== undefined && f.age !== null && String(f.age).trim() !== "") head.push(`${f.age}岁`);
    if (head.length) parts.push(`${head.join("，")}。`);
    if (f.faceText?.trim() || face.length) {
        parts.push(`容貌：${f.faceText?.trim() || ""}${mark("容貌", face)}。`);
    }
    if (f.outfitText?.trim() || outfit.length) {
        parts.push(`服装：${f.outfitText?.trim() || ""}${mark("服装", outfit)}。`);
    }
    if (f.traits?.trim()) parts.push(`特征：${f.traits.trim()}。`);
    if (f.style?.trim()) parts.push(`风格：${f.style.trim()}。`);
    if (f.extraText?.trim() || extra.length) {
        parts.push(`其他：${f.extraText?.trim() || ""}${mark("其他", extra)}。`);
    }
    return { prompt: parts.join(""), references };
}

function filledCount(m: CanvasNodeMetadata): number {
    const r = m as Record<string, unknown>;
    const hasImages = (one: unknown, many: unknown) => fieldImages(one, many, 99).length > 0;
    const textKeys = ["name", "age", "faceText", "outfitText", "traits", "style", "extraText"];
    const textCount = textKeys.filter((k) => {
        const v = r[k];
        return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const imageCount = [hasImages(r.faceImage, r.faceImages), hasImages(r.outfitImage, r.outfitImages), hasImages(r.extraImage, r.extraImages)].filter(Boolean).length;
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

// 在途生成的取消器：模块常驻，面板开关不影响；刷新后 Map 为空，靠 generating 残留自愈。
const runningControllers = new Map<string, AbortController>();

// 导入图片新增版本：面板与工具条共用；失败抛错由调用方展示。
async function importFilesAsVersions(ctx: CanvasNodeContext, files: File[]): Promise<void> {
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => readImageFile(f)));
    const m = ctx.node.metadata || {};
    const versions = (Array.isArray(m.versions) ? (m.versions as CharacterVersion[]) : []).filter((v) => v && v.image);
    const prompt = buildCharacterPrompt(m as CharacterFields).prompt;
    const added: CharacterVersion[] = urls.map((url) => ({ id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() }));
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

function CharacterContent({ ctx }: CanvasNodeContentProps) {
    const m = ctx.node.metadata || {};
    const result = activeImage(m);
    const previewOpen = Boolean(m.previewOpen) && result !== "";
    const versions = Array.isArray(m.versions) ? (m.versions as CharacterVersion[]) : [];
    const count = filledCount(m);
    return (
        <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", pointerEvents: "none", color: ctx.theme.node.text }}>
            {result ? (
                <img src={result} alt="" style={{ flex: 1, minHeight: 0, width: "100%", objectFit: "cover" }} />
            ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: ctx.theme.node.placeholder }}>
                    <span style={{ fontSize: 32 }}>👤</span>
                    <span>点击填写角色表单</span>
                </div>
            )}
            <div style={{ padding: "6px 12px", fontSize: 12, color: ctx.theme.node.muted, borderTop: `1px solid ${ctx.theme.node.stroke}` }}>
                {(m.name as string) || "未命名角色"} · 已填 {count}/10{versions.length > 1 ? ` · 版本 ${versions.findIndex((v) => v.id === m.activeVersionId) + 1 || versions.length}/${versions.length}` : ""}
                {typeof m.generateError === "string" && m.generateError ? <span title={m.generateError} style={{ color: "#ef4444" }}> · 上次失败</span> : null}
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

function FieldGroup({ title, children, theme }: { title: string; children: ReactNode; theme: CanvasNodeContentProps["ctx"]["theme"] }) {
    return (
        <div style={{ border: `1px solid ${theme.node.stroke}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.node.text, display: "flex", alignItems: "center" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "#f472b6", marginRight: 6 }} />
                {title}
            </div>
            {children}
        </div>
    );
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

function CharacterPanel({ ctx, onClose }: CanvasNodePanelProps) {
    const m = ctx.node.metadata || {};
    const [model, setModel] = useState(typeof m.model === "string" ? m.model : "");
    // 模型选择持久化到 metadata，面板关闭重开不丢失。
    const pickModel = (v: string) => {
        setModel(v);
        set({ model: v || undefined });
    };
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
    const [styleCustom, setStyleCustom] = useState(false);
    const styleVal = (m.style as string) || "";
    const showCustomStyle = styleCustom || (styleVal !== "" && !STYLE_PRESETS.includes(styleVal));
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
    const preview = buildCharacterPrompt(m as CharacterFields).prompt;
    const errMsg = error || (typeof m.generateError === "string" ? m.generateError : "");
    const canvasImages = ctx
        .getNodes()
        .filter((n) => n.id !== ctx.node.id)
        .map((n) => ({ id: n.id, title: n.title, url: nodeImageUrl(n) }))
        .filter((c): c is { id: string; title: string; url: string } => c.url !== null);

    const set = (patch: CanvasNodeMetadata) => ctx.updateMetadata(patch);
    const setName = (name: string) => {
        ctx.updateNode({ title: name.trim() || "角色" });
        set({ name });
    };

    const input = { width: "100%", boxSizing: "border-box" as const, padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: "transparent", color: ctx.theme.node.text, fontSize: 13, outline: "none" };
    const select = { ...input, background: ctx.theme.toolbar.panel, fontWeight: 600 } as const;
    const lab = { fontSize: 13, fontWeight: 600, color: ctx.theme.node.text } as const;
    const btn = { padding: "6px 14px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 13 } as const;
    const versions = (Array.isArray(m.versions) ? (m.versions as CharacterVersion[]) : []).filter((v) => v && v.image);
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
            const { prompt, references } = buildCharacterPrompt(m as CharacterFields);
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
            const ver: CharacterVersion = { id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() };
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
                <span style={{ fontSize: 14, fontWeight: 600 }}>👤 角色设定</span>
                <button type="button" onClick={onClose} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>
                    关闭
                </button>
            </div>
            <FieldGroup title="基础" theme={ctx.theme}>
                <label style={lab}>
                    名称
                    <input value={(m.name as string) || ""} onChange={(e) => setName(e.target.value)} placeholder="角色名称，也是节点名称" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <label style={lab}>
                    年龄
                    <input
                        type="number"
                        min={0}
                        value={m.age === undefined || m.age === null ? "" : String(m.age)}
                        onChange={(e) => set({ age: e.target.value === "" ? undefined : Number(e.target.value) })}
                        placeholder="岁"
                        style={{ ...input, marginTop: 4, fontWeight: 400 }}
                    />
                </label>
                <label style={lab}>
                    特征
                    <input value={(m.traits as string) || ""} onChange={(e) => set({ traits: e.target.value })} placeholder="如：左眼下有泪痣" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <label style={lab}>
                    风格
                    <select
                        value={showCustomStyle ? "__custom" : styleVal}
                        onChange={(e) => {
                            if (e.target.value === "__custom") {
                                setStyleCustom(true);
                            } else {
                                setStyleCustom(false);
                                set({ style: e.target.value || undefined });
                            }
                        }}
                        style={{ ...select, marginTop: 4 }}
                    >
                        <option value="">未选择</option>
                        {STYLE_PRESETS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                        <option value="__custom">自定义…</option>
                    </select>
                    {showCustomStyle && (
                        <input
                            value={STYLE_PRESETS.includes(styleVal) ? "" : styleVal}
                            maxLength={STYLE_MAX_LEN}
                            onChange={(e) => set({ style: e.target.value || undefined })}
                            placeholder="自定义风格，最多20字"
                            style={{ ...input, marginTop: 6, fontWeight: 400 }}
                        />
                    )}
                </label>
            </FieldGroup>
            <FieldGroup title="容貌" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.faceText as string) || ""} onChange={(e) => set({ faceText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.faceImage, m.faceImages, FACE_MAX)} max={FACE_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ faceImages: next, faceImage: undefined })} />
            </FieldGroup>
            <FieldGroup title="服装" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.outfitText as string) || ""} onChange={(e) => set({ outfitText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.outfitImage, m.outfitImages, OUTFIT_MAX)} max={OUTFIT_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ outfitImages: next, outfitImage: undefined })} />
            </FieldGroup>
            <FieldGroup title="其他" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.extraText as string) || ""} onChange={(e) => set({ extraText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.extraImage, m.extraImages, EXTRA_MAX)} max={EXTRA_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ extraImages: next, extraImage: undefined })} />
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
                                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: v.id === activeId ? "2px solid #f472b6" : `1px solid ${ctx.theme.node.stroke}`, boxSizing: "border-box" }}
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
                        生成角色图
                    </button>
                )}
            </div>
            <div style={{ fontSize: 11, color: ctx.theme.node.muted }}>尺寸默认 16:9 · 画质跟随全局图片设置（建议 2K）</div>
            {errMsg && <div style={{ fontSize: 12, color: "#ef4444", whiteSpace: "pre-wrap" }}>{errMsg}</div>}
        </div>
    );
}

export default definePlugin({
    id: "character",
    name: "角色节点",
    version: "1.0.1",
    description: "填写角色表单，拼装提示词并用参考图生成角色设定图",
    nodes: [
        {
            type: "character:role",
            title: "角色",
            icon: "👤",
            description: "角色设定：表单拼装提示词，参考图生成半身+三视图",
            defaultSize: { width: 300, height: 360 },
            defaultMetadata: {},
            minimapColor: "#f472b6",
            autoOpenPanel: true,
            panelPlacement: "left",
            hasTargetHandle: false, // 关闭上游传入：不接收其他节点的连线
            resource: (node) => {
                const url = activeImage(node.metadata || {});
                return url ? { kind: "image", url } : null;
            },
            Content: CharacterContent,
            Panel: CharacterPanel,
            toolbar: (ctx) => [
                {
                    id: "download",
                    title: "下载选中版本",
                    label: "下载",
                    icon: "⬇️",
                    onClick: () => {
                        const meta = ctx.node.metadata || {};
                        const list = (Array.isArray(meta.versions) ? (meta.versions as CharacterVersion[]) : []).filter((v) => v && v.image);
                        const current = list.find((v) => v.id === meta.activeVersionId) || list[list.length - 1];
                        const url = current?.image || (typeof meta.content === "string" ? meta.content : "");
                        if (!url) return;
                        const num = list.findIndex((v) => v === current) + 1 || list.length;
                        const filename = `${((typeof meta.name === "string" && meta.name) || "角色").replace(/[\\/:*?"<>|]/g, "_")}-v${num}.png`;
                        downloadImage(url, filename).catch((e) => console.error("[character] download failed", e));
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
