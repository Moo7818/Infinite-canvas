import { useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasTheme } from "@infinite-canvas/plugin-sdk";
import type { ReactNode } from "react";
import { readImageFile } from "./media";
import type { CanvasImageCandidate } from "./fields";

export function FieldGroup({ title, accent, children, theme }: { title: string; accent: string; children: ReactNode; theme: CanvasTheme }) {
    return (
        <div style={{ border: `1px solid ${theme.node.stroke}`, borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.node.text, display: "flex", alignItems: "center" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: accent, marginRight: 6 }} />
                {title}
            </div>
            {children}
        </div>
    );
}

export function ImagesField({ label, values, max, onChange, candidates, theme }: { label: string; values: string[]; max: number; onChange: (next: string[]) => void; candidates: CanvasImageCandidate[]; theme: CanvasTheme }) {
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
                {values.length < max && (
                    <button
                        type="button"
                        onClick={() => setPicking((v) => !v)}
                        style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${theme.node.stroke}`, background: picking ? theme.node.fill : theme.toolbar.panel, color: theme.node.text, cursor: "pointer", fontSize: 12 }}
                    >
                        画布选择
                    </button>
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

// 预制下拉 + 自定义：与模型选择器同款样式。
export function PresetSelect({ value, presets, placeholder, maxLen, onChange, style }: { value: string; presets: string[]; placeholder: string; maxLen?: number; onChange: (v: string | undefined) => void; style: Record<string, string | number> }) {
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
            {showCustom && <input value={presets.includes(value) ? "" : value} maxLength={maxLen ?? 20} onChange={(e) => onChange(e.target.value || undefined)} placeholder={placeholder} style={{ ...style, marginTop: 6, fontWeight: 400 }} />}
        </>
    );
}
