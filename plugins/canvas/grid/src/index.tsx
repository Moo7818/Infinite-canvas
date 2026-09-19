// 宫格调度节点:锁死 2*2 四格，按名引用角色/空间节点，调度文档拼装提示词，一次生成四帧静帧。
// 图片全部活引用（取所选节点当前选中版本图）；生成结果自动追加版本并写回本节点展示;下游输出当前选中版本图。
import { definePlugin, useEffect, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeContext, CanvasNodeData, CanvasNodeMetadata, CanvasNodePanelProps } from "@infinite-canvas/plugin-sdk";
import type { ReactNode } from "react";

export const PROMPT_PREFIX = "2*2四宫格拼图，按调度文档一次生成四帧静帧。";
export const GRID_CELLS = 4;

export type GridCell = {
    characterId?: string;
    characterName?: string; // 快照：节点被删后仍可显示名
    state?: string;
};

export type GridFields = {
    name?: string;
    cells?: GridCell[];
    spaceId?: string;
    spaceName?: string; // 快照
    camera?: string;
    style?: string;
    doc?: string;
};

export const CUSTOM_MAX_LEN = 20;
export const STYLE_PRESETS = ["影视写实摄影", "3D皮克斯卡通", "吉普力动画", "中国风水墨动画"];

export type GridVersion = {
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
    const versions = Array.isArray(m.versions) ? (m.versions as GridVersion[]) : [];
    const active = versions.find((v) => v && v.id === m.activeVersionId) || versions[versions.length - 1];
    if (active?.image) return active.image;
    return typeof m.content === "string" ? m.content : "";
}

// 节点自带图：内置图片节点与三自有节点都把图同步到 metadata.content。
function nodeImage(n: CanvasNodeData): string[] {
    const c = n.metadata?.content;
    return typeof c === "string" && (c.startsWith("data:image/") || /^https?:\/\//i.test(c)) ? [c] : [];
}

function normalizeCells(m: CanvasNodeMetadata): GridCell[] {
    const raw = Array.isArray(m.cells) ? (m.cells as GridCell[]) : [];
    return [0, 1, 2, 3].map((i) => (raw[i] && typeof raw[i] === "object" ? raw[i] : {}));
}

export type GridResolvedCell = { name: string; state: string; images: string[] };
export type GridCast = {
    characters: GridResolvedCell[];
    spaceName: string;
    spaceImages: string[];
};

// 活引用解析：按格序取角色节点当前图，空间取场景节点当前图；节点被删则该项留空（快照名保留）。
export function resolveCast(nodes: CanvasNodeData[], m: CanvasNodeMetadata): GridCast {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const characters = normalizeCells(m).map((c) => {
        const n = c.characterId ? byId.get(c.characterId) : undefined;
        return { name: n?.title || c.characterName || "", state: c.state || "", images: n ? nodeImage(n) : [] };
    });
    const spaceNode = typeof m.spaceId === "string" && m.spaceId ? byId.get(m.spaceId) : undefined;
    return {
        characters,
        spaceName: spaceNode?.title || (typeof m.spaceName === "string" ? m.spaceName : ""),
        spaceImages: spaceNode ? nodeImage(spaceNode) : [],
    };
}

function collectRefs(characters: GridResolvedCell[], spaceImages: string[]): string[] {
    const out: string[] = [];
    for (const c of characters) for (const img of c.images) if (!out.includes(img)) out.push(img);
    for (const img of spaceImages) if (!out.includes(img)) out.push(img);
    return out;
}

export function buildGridPrompt(f: { name?: string; camera?: string; style?: string; doc?: string; characters: GridResolvedCell[]; spaceName?: string; spaceImages: string[] }): { prompt: string; references: string[] } {
    const references = collectRefs(f.characters, f.spaceImages || []);
    const pos = (img: string) => references.indexOf(img) + 1;
    const mark = (imgs: string[]) => (imgs.length ? `（图片${imgs.map(pos).join("、")}）` : "");

    const parts: string[] = [PROMPT_PREFIX];
    if (f.name?.trim()) parts.push(`调度主题：${f.name.trim()}。`);
    const cast = f.characters
        .map((c) => (c.name ? `${c.name}${mark(c.images)}` : ""))
        .filter(Boolean)
        .join("、");
    if (cast) parts.push(`出场：${cast}。`);
    if (f.spaceName?.trim() || (f.spaceImages || []).length) {
        parts.push(`空间：${f.spaceName?.trim() || ""}${mark(f.spaceImages || [])}。`);
    }
    if (f.camera?.trim()) parts.push(`统一机位：${f.camera.trim()}。`);
    const docText = f.doc?.trim() || "";
    if (docText) parts.push(`调度：${docText}${/[。？！？!]$/.test(docText) ? "" : "。"}`);
    if (f.style?.trim()) parts.push(`风格：${f.style.trim()}。`);
    return { prompt: parts.join(""), references };
}

// 由当前分配生成调度草稿（编号与拼装规则一致，人再改）。
export function buildDispatchDraft(characters: GridResolvedCell[], spaceName: string, spaceImages: string[]): string {
    const references = collectRefs(characters, spaceImages);
    const pos = (img: string) => references.indexOf(img) + 1;
    const lines = characters.map((c, i) => {
        if (!c.name) return `格${i + 1}：（空）`;
        const imgs = c.images.length ? `，用图片${c.images.map(pos).join("、")}` : "（暂无可用图）";
        return `格${i + 1}：${c.name}${c.state}${imgs}`;
    });
    if (spaceName || spaceImages.length) {
        lines.push(`空间：${spaceName}${spaceImages.length ? `，用图片${spaceImages.map(pos).join("、")}` : "（暂无可用图）"}`);
    }
    return lines.join("\n");
}

function filledCount(m: CanvasNodeMetadata, cast: GridCast): number {
    const r = m as Record<string, unknown>;
    const textKeys = ["name", "camera", "style", "doc"];
    const textCount = textKeys.filter((k) => {
        const v = r[k];
        return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const spaceCount = cast.spaceName || cast.spaceImages.length ? 1 : 0;
    const cellCount = normalizeCells(m).filter((c) => c.characterId || (c.state || "").trim() !== "").length;
    return textCount + spaceCount + cellCount;
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

// 在途生成的取消器：模块常驻，面板开关不影响；刷新后 Map 为空，靠 generating 残留自愈。
const runningControllers = new Map<string, AbortController>();

// 导入图片新增版本：面板与工具条共用；失败抛错由调用方展示。
async function importFilesAsVersions(ctx: CanvasNodeContext, files: File[]): Promise<void> {
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => readImageFile(f)));
    const m = ctx.node.metadata || {};
    const versions = (Array.isArray(m.versions) ? (m.versions as GridVersion[]) : []).filter((v) => v && v.image);
    const cast = resolveCast(ctx.getNodes(), m);
    const { prompt } = buildGridPrompt({ ...(m as GridFields), characters: cast.characters, spaceName: cast.spaceName, spaceImages: cast.spaceImages });
    const added: GridVersion[] = urls.map((url) => ({ id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() }));
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

function GridContent({ ctx }: CanvasNodeContentProps) {
    const m = ctx.node.metadata || {};
    const result = activeImage(m);
    const versions = Array.isArray(m.versions) ? (m.versions as GridVersion[]) : [];
    const count = filledCount(m, resolveCast(ctx.getNodes(), m));
    return (
        <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", pointerEvents: "none", color: ctx.theme.node.text }}>
            {result ? (
                <img src={result} alt="" style={{ flex: 1, minHeight: 0, width: "100%", objectFit: "cover" }} />
            ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: ctx.theme.node.placeholder }}>
                    <span style={{ fontSize: 32 }}>🎬</span>
                    <span>点击填写调度表单</span>
                </div>
            )}
            <div style={{ padding: "6px 12px", fontSize: 12, color: ctx.theme.node.muted, borderTop: `1px solid ${ctx.theme.node.stroke}` }}>
                {(m.name as string) || "未命名调度"} · 已填 {count}/9{versions.length > 1 ? ` · 版本 ${versions.findIndex((v) => v.id === m.activeVersionId) + 1 || versions.length}/${versions.length}` : ""}
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
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: "#8b5cf6", marginRight: 6 }} />
                {title}
            </div>
            {children}
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

function GridPanel({ ctx, onClose }: CanvasNodePanelProps) {
    const m = ctx.node.metadata || {};
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
    const [model, setModel] = useState(typeof m.model === "string" ? m.model : "");
    // 模型选择持久化到 metadata，面板关闭重开不丢失。
    const pickModel = (v: string) => {
        setModel(v);
        set({ model: v || undefined });
    };
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
    const cast = resolveCast(ctx.getNodes(), m);
    const preview = buildGridPrompt({ ...(m as GridFields), characters: cast.characters, spaceName: cast.spaceName, spaceImages: cast.spaceImages }).prompt;
    const errMsg = error || (typeof m.generateError === "string" ? m.generateError : "");
    const charNodes = ctx.getNodes().filter((n) => n.type === "character:role");
    const spaceNodes = ctx.getNodes().filter((n) => n.type === "scene:view");
    const cells = normalizeCells(m);

    const set = (patch: CanvasNodeMetadata) => ctx.updateMetadata(patch);
    const setName = (name: string) => {
        ctx.updateNode({ title: name.trim() || "宫格调度" });
        set({ name });
    };
    const setCell = (index: number, patch: Partial<GridCell>) => {
        const next = normalizeCells(m);
        next[index] = { ...next[index], ...patch };
        set({ cells: next });
    };

    const input = { width: "100%", boxSizing: "border-box" as const, padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: "transparent", color: ctx.theme.node.text, fontSize: 13, outline: "none" };
    const select = { ...input, background: ctx.theme.toolbar.panel, fontWeight: 600 } as const;
    const lab = { fontSize: 13, fontWeight: 600, color: ctx.theme.node.text } as const;
    const btn = { padding: "6px 14px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 13 } as const;
    const versions = (Array.isArray(m.versions) ? (m.versions as GridVersion[]) : []).filter((v) => v && v.image);
    const activeId = versions.some((v) => v.id === m.activeVersionId) ? (m.activeVersionId as string) : versions[versions.length - 1]?.id;

    // 节点宽高自适应图片比例：宽固定 300，图高按比例换算后夹紧，+30 留给底部状态条。
    const fitNode = async (url: string) => {
        const d = await imageDims(url);
        const imgH = Math.min(520, Math.max(200, Math.round((300 * d.h) / d.w)));
        ctx.updateNode({ width: 300, height: imgH + 30 });
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
            const live = resolveCast(ctx.getNodes(), ctx.node.metadata || {});
            const { prompt, references } = buildGridPrompt({ ...(m as GridFields), characters: live.characters, spaceName: live.spaceName, spaceImages: live.spaceImages });
            const chosen = model || ctx.ai.defaultModel("image");
            // 宫格默认 1:1；画质位由宿主全局设置决定（建议 2K），插件侧无 quality 通道。
            const res = await ctx.ai.generateImage(prompt, { references, model: chosen, size: "1:1", signal: controller.signal });
            if (!res.images.length) throw new Error("生成未返回图片");
            const url = res.images[0];
            await fitNode(url);
            // 每次生成自动追加为新版本并选中；老节点首次生成时把旧图收为版本 1。
            const nextVersions = [...versions];
            if (!nextVersions.length && typeof m.content === "string" && m.content) {
                nextVersions.push({ id: newVersionId(), image: m.content, prompt: "", createdAt: "" });
            }
            const ver: GridVersion = { id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() };
            nextVersions.push(ver);
            set({ versions: nextVersions, activeVersionId: ver.id, content: url, status: "success", generating: false, generateError: undefined });
        } catch (e) {
            const msg = controller.signal.aborted ? "已取消" : e instanceof Error ? e.message : String(e);
            setError(msg);
            // 错误持久化：面板关闭重开仍可见；节点卡片底部同步红标。
            set({ generating: false, generateError: msg });
        } finally {
            runningControllers.delete(ctx.node.id);
            setRunning(false);
        }
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

    const fillDraft = () => {
        const live = resolveCast(ctx.getNodes(), ctx.node.metadata || {});
        set({ doc: buildDispatchDraft(live.characters, live.spaceName, live.spaceImages) });
    };

    return (
        <div data-canvas-no-zoom onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, color: ctx.theme.node.text, background: ctx.theme.node.panel, borderRadius: 12, border: `1px solid ${ctx.theme.node.stroke}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>🎬 宫格调度</span>
                <button type="button" onClick={onClose} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>
                    关闭
                </button>
            </div>
            <FieldGroup title="基础" theme={ctx.theme}>
                <label style={lab}>
                    名称
                    <input value={(m.name as string) || ""} onChange={(e) => setName(e.target.value)} placeholder="调度主题，也是节点名称" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>空间（整图共用）</div>
                    <select
                        value={(m.spaceId as string) || ""}
                        onChange={(e) => {
                            const n = ctx.getNodes().find((x) => x.id === e.target.value);
                            set({ spaceId: e.target.value || undefined, spaceName: n?.title || undefined });
                        }}
                        style={{ ...select, marginTop: 0 }}
                    >
                        <option value="">未选择</option>
                        {spaceNodes.map((n) => (
                            <option key={n.id} value={n.id}>
                                {n.title}
                            </option>
                        ))}
                    </select>
                </div>
                <label style={lab}>
                    统一机位
                    <input value={(m.camera as string) || ""} onChange={(e) => set({ camera: e.target.value })} placeholder="如：固定机位从客厅角落斜上方45度俯拍" style={{ ...input, marginTop: 4, fontWeight: 400 }} />
                </label>
                <div>
                    <div style={{ ...lab, marginBottom: 4 }}>风格</div>
                    <PresetSelect value={(m.style as string) || ""} presets={STYLE_PRESETS} placeholder="自定义风格，最多20字" onChange={(v) => set({ style: v })} style={{ ...select, marginTop: 0 }} />
                </div>
            </FieldGroup>
            <FieldGroup title="四格分配" theme={ctx.theme}>
                {cells.map((c, i) => (
                    <div key={i} style={{ border: `1px dashed ${ctx.theme.node.stroke}`, borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>格{i + 1}</div>
                        <select
                            value={c.characterId || ""}
                            onChange={(e) => {
                                const n = charNodes.find((x) => x.id === e.target.value);
                                setCell(i, { characterId: e.target.value || undefined, characterName: n?.title || undefined });
                            }}
                            style={{ ...select }}
                        >
                            <option value="">无角色</option>
                            {charNodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                    {n.title}
                                </option>
                            ))}
                        </select>
                        <input value={c.state || ""} onChange={(e) => setCell(i, { state: e.target.value })} placeholder="本格状态，如：苏近景" style={{ ...input, fontWeight: 400 }} />
                    </div>
                ))}
            </FieldGroup>
            <FieldGroup title="调度文档" theme={ctx.theme}>
                <textarea value={(m.doc as string) || ""} onChange={(e) => set({ doc: e.target.value })} rows={6} placeholder={"格1：苏近景，用图片1\n格2：（空）"} style={{ ...input, resize: "vertical" }} />
                <button type="button" onClick={fillDraft} style={{ ...btn, alignSelf: "flex-start" }}>
                    由分配生成草稿
                </button>
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
                                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: v.id === activeId ? "2px solid #8b5cf6" : `1px solid ${ctx.theme.node.stroke}`, boxSizing: "border-box" }}
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
                        生成宫格图
                    </button>
                )}
            </div>
            <div style={{ fontSize: 11, color: ctx.theme.node.muted }}>尺寸默认 1:1 · 画质跟随全局图片设置（建议 2K）</div>
            {errMsg && <div style={{ fontSize: 12, color: "#ef4444", whiteSpace: "pre-wrap" }}>{errMsg}</div>}
        </div>
    );
}

export default definePlugin({
    id: "grid",
    name: "宫格调度节点",
    version: "1.0.0",
    description: "2*2四宫格调度：按名引用角色/空间节点，调度文档拼装提示词一次生成四帧静帧",
    nodes: [
        {
            type: "grid:board",
            title: "宫格调度",
            icon: "🎬",
            description: "四格调度：角色空间按名引用，文档驱动生成",
            defaultSize: { width: 300, height: 360 },
            defaultMetadata: {},
            minimapColor: "#8b5cf6",
            autoOpenPanel: true,
            panelPlacement: "left",
            hasTargetHandle: false, // 关闭上游传入：不接收其他节点的连线
            resource: (node) => {
                const url = activeImage(node.metadata || {});
                return url ? { kind: "image", url } : null;
            },
            Content: GridContent,
            Panel: GridPanel,
            toolbar: (ctx) => [
                {
                    id: "download",
                    title: "下载选中版本",
                    label: "下载",
                    icon: "⬇️",
                    onClick: () => {
                        const meta = ctx.node.metadata || {};
                        const list = (Array.isArray(meta.versions) ? (meta.versions as GridVersion[]) : []).filter((v) => v && v.image);
                        const current = list.find((v) => v.id === meta.activeVersionId) || list[list.length - 1];
                        const url = current?.image || (typeof meta.content === "string" ? meta.content : "");
                        if (!url) return;
                        const num = list.findIndex((v) => v === current) + 1 || list.length;
                        const filename = `${((typeof meta.name === "string" && meta.name) || "宫格调度").replace(/[\\/:*?"<>|]/g, "_")}-v${num}.png`;
                        downloadImage(url, filename).catch((e) => console.error("[grid] download failed", e));
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
