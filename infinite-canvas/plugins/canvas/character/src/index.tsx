// 角色节点:点击弹出表单 → 拼装提示词 → 参考图生成角色设定图。
// 生成结果写回本节点展示;拼装文本经 resource 输出,可连给下游节点消费。
import { definePlugin, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeMetadata, CanvasNodePanelProps } from "@infinite-canvas/plugin-sdk";
import type { ReactNode } from "react";

export const PROMPT_PREFIX =
    "左侧为角色半身近景，右侧为人物全身三视图（正面、侧边、背面，正面视图不显示头部区域），纯白色背景，光线柔和均匀，1/4黑柔滤镜、电影质感摄影实拍。";

export type CharacterFields = {
    name?: string;
    age?: number;
    faceText?: string;
    faceImage?: string;
    outfitText?: string;
    outfitImage?: string;
    traits?: string;
    extraText?: string;
    extraImage?: string;
};

// 按固定字段序收集参考图:容貌 → 服装 → 其他;n 为图在数组中的 1-based 位置。
export function buildCharacterPrompt(f: CharacterFields): { prompt: string; references: string[] } {
    const references: string[] = [];
    if (f.faceImage) references.push(f.faceImage);
    if (f.outfitImage) references.push(f.outfitImage);
    if (f.extraImage) references.push(f.extraImage);
    const pos = (img?: string) => (img ? references.indexOf(img) + 1 : 0);

    const parts: string[] = [PROMPT_PREFIX];
    const head: string[] = [];
    if (f.name?.trim()) head.push(`角色名称：${f.name.trim()}`);
    if (f.age !== undefined && f.age !== null && String(f.age).trim() !== "") head.push(`${f.age}岁`);
    if (head.length) parts.push(`${head.join("，")}。`);
    if (f.faceText?.trim() || f.faceImage) {
        parts.push(`容貌：${f.faceText?.trim() || ""}${f.faceImage ? `（容貌参考图片${pos(f.faceImage)}）` : ""}。`);
    }
    if (f.outfitText?.trim() || f.outfitImage) {
        parts.push(`服装：${f.outfitText?.trim() || ""}${f.outfitImage ? `（服装参考图片${pos(f.outfitImage)}）` : ""}。`);
    }
    if (f.traits?.trim()) parts.push(`特征：${f.traits.trim()}。`);
    if (f.extraText?.trim() || f.extraImage) {
        parts.push(`其他：${f.extraText?.trim() || ""}${f.extraImage ? `（其他参考图片${pos(f.extraImage)}）` : ""}。`);
    }
    return { prompt: parts.join(""), references };
}

function filledCount(m: CanvasNodeMetadata): number {
    return ["name", "age", "faceText", "faceImage", "outfitText", "outfitImage", "traits", "extraText", "extraImage"].filter((k) => {
        const v = (m as Record<string, unknown>)[k];
        return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
}

function readImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function CharacterContent({ ctx }: CanvasNodeContentProps) {
    const m = ctx.node.metadata || {};
    const result = typeof m.content === "string" ? m.content : "";
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
                {(m.name as string) || "未命名角色"} · 已填 {count}/9
            </div>
        </div>
    );
}

function ImageField({ label, value, onPick, onClear, theme }: { label: string; value?: string; onPick: (dataUrl: string) => void; onClear: () => void; theme: CanvasNodeContentProps["ctx"]["theme"] }) {
    return (
        <div>
            <div style={{ fontSize: 12, color: theme.node.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {value ? (
                    <img src={value} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, border: `1px solid ${theme.node.stroke}` }} />
                ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, border: `1px dashed ${theme.node.stroke}`, display: "grid", placeItems: "center", fontSize: 18, color: theme.node.placeholder }}>+</div>
                )}
                <label style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${theme.node.stroke}`, background: theme.toolbar.panel, color: theme.node.text, cursor: "pointer", fontSize: 12 }}>
                    上传
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            onPick(await readImageFile(file));
                        }}
                    />
                </label>
                {value && (
                    <button type="button" onClick={onClear} style={{ padding: "4px 10px", borderRadius: 8, border: "none", background: "transparent", color: theme.node.muted, cursor: "pointer", fontSize: 12 }}>
                        清除
                    </button>
                )}
            </div>
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
    const [model, setModel] = useState("");
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
    const preview = buildCharacterPrompt(m as CharacterFields).prompt;

    const set = (patch: CanvasNodeMetadata) => ctx.updateMetadata(patch);
    const setName = (name: string) => {
        ctx.updateNode({ title: name.trim() || "角色" });
        set({ name });
    };

    const input = { width: "100%", boxSizing: "border-box" as const, padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: "transparent", color: ctx.theme.node.text, fontSize: 13, outline: "none" };
    const lab = { fontSize: 13, fontWeight: 600, color: ctx.theme.node.text } as const;
    const btn = { padding: "6px 14px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 13 } as const;

    const generate = async () => {
        setRunning(true);
        setError("");
        try {
            const { prompt, references } = buildCharacterPrompt(m as CharacterFields);
            const chosen = model || ctx.ai.defaultModel("image");
            // 默认 16:9；画质位由宿主全局设置决定（建议 2K），插件侧无 quality 通道。
            const res = await ctx.ai.generateImage(prompt, { references, model: chosen, size: "16:9" });
            if (!res.images.length) throw new Error("生成未返回图片");
            const url = res.images[0];
            // 节点宽高自适应实际图片比例：宽固定 300，图高按比例换算后夹紧，+30 留给底部状态条。
            const d = await imageDims(url);
            const imgH = Math.min(520, Math.max(200, Math.round((300 * d.h) / d.w)));
            ctx.updateNode({ width: 300, height: imgH + 30 });
            set({ content: url, status: "success" });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
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
            </FieldGroup>
            <FieldGroup title="容貌" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.faceText as string) || ""} onChange={(e) => set({ faceText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImageField label="参考图" value={m.faceImage as string} theme={ctx.theme} onPick={(v) => set({ faceImage: v })} onClear={() => set({ faceImage: undefined })} />
            </FieldGroup>
            <FieldGroup title="服装" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.outfitText as string) || ""} onChange={(e) => set({ outfitText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImageField label="参考图" value={m.outfitImage as string} theme={ctx.theme} onPick={(v) => set({ outfitImage: v })} onClear={() => set({ outfitImage: undefined })} />
            </FieldGroup>
            <FieldGroup title="其他" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.extraText as string) || ""} onChange={(e) => set({ extraText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImageField label="参考图" value={m.extraImage as string} theme={ctx.theme} onPick={(v) => set({ extraImage: v })} onClear={() => set({ extraImage: undefined })} />
            </FieldGroup>
            <div>
                <div style={{ fontSize: 12, color: ctx.theme.node.muted, marginBottom: 4 }}>提示词预览</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, padding: "8px 10px", borderRadius: 8, background: ctx.theme.node.fill, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>{preview}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={model} onChange={(e) => setModel(e.target.value)} style={{ ...input, flex: 1, background: ctx.theme.toolbar.panel, fontWeight: 600 }}>
                    <option value="">{`默认模型（${ctx.ai.defaultModel("image")}）`}</option>
                    {models.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <button type="button" onClick={generate} disabled={running} style={{ ...btn, opacity: running ? 0.6 : 1 }}>
                    {running ? "生成中…" : "生成角色图"}
                </button>
            </div>
            <div style={{ fontSize: 11, color: ctx.theme.node.muted }}>尺寸默认 16:9 · 画质跟随全局图片设置（建议 2K）</div>
            {error && <div style={{ fontSize: 12, color: "#ef4444" }}>{error}</div>}
        </div>
    );
}

export default definePlugin({
    id: "character",
    name: "角色节点",
    version: "1.0.0",
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
            hasTargetHandle: false, // 关闭上游传入：不接收其他节点的连线
            resource: (node) => {
                const url = typeof node.metadata?.content === "string" ? node.metadata.content : "";
                return url ? { kind: "image", url } : null;
            },
            Content: CharacterContent,
            Panel: CharacterPanel,
        },
    ],
});
