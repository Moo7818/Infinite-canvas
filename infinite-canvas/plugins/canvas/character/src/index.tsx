// 角色节点:点击弹出表单 → 拼装提示词 → 参考图生成角色设定图。
// 生成结果写回本节点展示;拼装文本经 resource 输出,可连给下游节点消费。
import { definePlugin, useEffect, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeMetadata, CanvasNodePanelProps } from "@infinite-canvas/plugin-sdk";
import {
    FieldGroup,
    ImagesField,
    activeImageUrl,
    downloadImage,
    downscaleImage,
    fieldImages,
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

export type CharacterVersion = VersionItem;

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

function CharacterContent({ ctx }: CanvasNodeContentProps) {
    const m = ctx.node.metadata || {};
    const result = activeImageUrl(m);
    const previewOpen = Boolean(m.previewOpen) && result !== "";
    const versions = resolveVersions(m);
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

function CharacterPanel({ ctx, onClose }: CanvasNodePanelProps) {
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
    const [styleCustom, setStyleCustom] = useState(false);
    const styleVal = (m.style as string) || "";
    const showCustomStyle = styleCustom || (styleVal !== "" && !STYLE_PRESETS.includes(styleVal));
    // 模型下拉默认 nano-2 / nano-pro / image 系列；metadata.modelAllow 非空数组可覆盖。
    const MODEL_BASE = ["nano-2", "nano-pro", "image"];
    const customAllow = (Array.isArray(m.modelAllow) ? (m.modelAllow as unknown[]) : []).filter((v): v is string => typeof v === "string" && v.length > 0);
    const MODEL_ALLOW = customAllow.length ? customAllow : MODEL_BASE;
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
    const canvasImages = listCanvasImages(ctx.getNodes(), ctx.node.id);

    const set = (patch: CanvasNodeMetadata | ((prev: CanvasNodeMetadata) => CanvasNodeMetadata)) => ctx.updateMetadata(patch);
    const setName = (name: string) => {
        ctx.updateNode({ title: name.trim() || "角色" });
        set({ name });
    };

    const input = { width: "100%", boxSizing: "border-box" as const, padding: "6px 10px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: "transparent", color: ctx.theme.node.text, fontSize: 13, outline: "none" };
    const select = { ...input, background: ctx.theme.toolbar.panel, fontWeight: 600 } as const;
    const lab = { fontSize: 13, fontWeight: 600, color: ctx.theme.node.text } as const;
    const btn = { padding: "6px 14px", borderRadius: 8, border: `1px solid ${ctx.theme.node.stroke}`, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, cursor: "pointer", fontSize: 13 } as const;
    const versions = resolveVersions(m);
    const activeId = pickActiveId(versions, m.activeVersionId);

    // 节点宽高自适应图片比例：宽固定 300，图高按比例换算后夹紧，+30 留给底部状态条。
    const fitNode = (url: string) => fitNodeToImage((p) => ctx.updateNode(p), url);

    const switchVersion = async (id: string) => {
        const v = versions.find((item) => item.id === id);
        if (!v) return;
        await fitNode(v.image);
        set({ activeVersionId: id, content: v.image });
    };

    const deleteVersion = (id: string) => {
        const { rest, next } = nextAfterDelete(versions, activeId, id);
        set({ versions: rest, activeVersionId: next?.id, content: next?.image || "" });
        if (next) void fitNode(next.image);
    };

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
            const { prompt, references } = buildCharacterPrompt(m as CharacterFields);
            const chosen = model || ctx.ai.defaultModel("image");
            // 默认 16:9；画质位由宿主全局设置决定（建议 2K），插件侧无 quality 通道。
            console.info(`[character] 提交生成 参考图${references.length}张`);
            // 引用图压到 1536：边缘 413 拒收 10MB 级 body，只压引用，输出不动。
            const refs = await Promise.all(references.map((u) => downscaleImage(u, 1536)));
            const res = await ctx.ai.generateImage(prompt, { references: refs, model: chosen, size: "16:9", signal: controller.signal });
            if (!res.images.length) throw new Error("生成未返回图片");
            const url = res.images[0];
            await fitNode(url);
            // 每次生成自动追加为新版本并选中；老节点首次生成时把旧图收为版本 1。
            // 函数式追加：与工具条导入并发时以前面最新 state 为准，不丢更新。
            set((prev) => versionAppendPatch(prev, url, prompt));
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
                <span style={{ fontSize: 14, fontWeight: 600 }}>👤 角色设定</span>
                <button type="button" onClick={onClose} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>
                    关闭
                </button>
            </div>
            <FieldGroup accent="#f472b6" title="基础" theme={ctx.theme}>
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
            <FieldGroup accent="#f472b6" title="容貌" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.faceText as string) || ""} onChange={(e) => set({ faceText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.faceImage, m.faceImages, FACE_MAX)} max={FACE_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ faceImages: next, faceImage: undefined })} />
            </FieldGroup>
            <FieldGroup accent="#f472b6" title="服装" theme={ctx.theme}>
                <label style={{ fontSize: 12, color: ctx.theme.node.muted }}>
                    描述
                    <textarea value={(m.outfitText as string) || ""} onChange={(e) => set({ outfitText: e.target.value })} rows={2} style={{ ...input, marginTop: 4, resize: "vertical" }} />
                </label>
                <ImagesField label="参考图" values={fieldImages(m.outfitImage, m.outfitImages, OUTFIT_MAX)} max={OUTFIT_MAX} candidates={canvasImages} theme={ctx.theme} onChange={(next) => set({ outfitImages: next, outfitImage: undefined })} />
            </FieldGroup>
            <FieldGroup accent="#f472b6" title="其他" theme={ctx.theme}>
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
            <FieldGroup accent="#f472b6" title={`版本（${versions.length}）`} theme={ctx.theme}>
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
                            importFilesAsVersions(ctx, files, () => buildCharacterPrompt(m as CharacterFields).prompt).catch((err) => setError(err instanceof Error ? err.message : String(err)));
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
                    <button type="button" onClick={() => guard.cancel()} style={btn}>
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
    version: "1.0.3",
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
                const url = activeImageUrl(node.metadata || {});
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
                        const list = resolveVersions(meta);
                        const current = list.find((v) => v.id === meta.activeVersionId) || list[list.length - 1];
                        const url = current?.image || (typeof meta.content === "string" ? meta.content : "");
                        if (!url) return;
                        const num = list.findIndex((v) => v === current) + 1 || list.length;
                        downloadImage(url, versionFilename(typeof meta.name === "string" ? meta.name : "", "角色", num)).catch((e) => console.error("[character] download failed", e));
                    },
                },
                {
                    id: "import",
                    title: "导入图片新增版本",
                    label: "导入",
                    icon: "📥",
                    onClick: () => {
                        pickImageFiles((files) => {
                            importFilesAsVersions(ctx, files, () => buildCharacterPrompt(ctx.node.metadata as CharacterFields).prompt).catch((e) =>
                                ctx.updateMetadata({ generateError: e instanceof Error ? e.message : String(e) }),
                            );
                        });
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
