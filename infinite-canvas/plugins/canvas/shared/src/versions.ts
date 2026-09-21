import type { CanvasNodeMetadata } from "@infinite-canvas/plugin-sdk";

export type VersionItem = {
    id: string;
    image: string;
    prompt: string;
    createdAt: string;
};

export function newVersionId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// 读出有效版本（过滤空壳）；调用方传各自的 metadata 即可。
export function resolveVersions(m: CanvasNodeMetadata): VersionItem[] {
    const raw = (m as Record<string, unknown>).versions;
    if (!Array.isArray(raw)) return [];
    return (raw as unknown[]).filter((v): v is VersionItem => !!v && typeof (v as VersionItem).image === "string" && (v as VersionItem).image.length > 0);
}

// 当前展示图：选中版本 > 末版本 > 旧版 content（未迁移的老节点）。
export function activeImageUrl(m: CanvasNodeMetadata): string {
    const versions = resolveVersions(m);
    const activeId = (m as Record<string, unknown>).activeVersionId;
    const active = versions.find((v) => v.id === activeId) || versions[versions.length - 1];
    if (active?.image) return active.image;
    return typeof m.content === "string" ? m.content : "";
}

export function pickActiveId(versions: VersionItem[], activeId: unknown): string | undefined {
    if (versions.some((v) => v.id === activeId)) return activeId as string;
    return versions[versions.length - 1]?.id;
}

// 生成成功追加（含老节点旧图迁移）：返回完整 patch，调用方按需再 spread 自有字段。
export function versionAppendPatch(prev: CanvasNodeMetadata, image: string, prompt: string): CanvasNodeMetadata {
    const cur = resolveVersions(prev);
    const legacy = !cur.length && typeof prev.content === "string" && prev.content ? [{ id: newVersionId(), image: prev.content, prompt: "", createdAt: "" }] : [];
    const ver: VersionItem = { id: newVersionId(), image, prompt, createdAt: new Date().toISOString() };
    const next = [...legacy, ...cur, ver];
    return { versions: next, activeVersionId: ver.id, content: image, status: "success", generating: false, generateError: undefined };
}

export function makeVersionItems(urls: string[], prompt: string): VersionItem[] {
    return urls.map((url) => ({ id: newVersionId(), image: url, prompt, createdAt: new Date().toISOString() }));
}

// 导入追加：返回完整 patch，调用方按需再 spread 自有字段。
export function importAppendPatch(prev: CanvasNodeMetadata, added: VersionItem[]): CanvasNodeMetadata {
    const cur = resolveVersions(prev);
    const next = [...cur, ...added];
    const last = added[added.length - 1];
    return { versions: next, activeVersionId: last.id, content: last.image, status: "success", generating: false, generateError: undefined };
}

// 删除版本后选谁：优先原选中（若还在），否则末版本。
export function nextAfterDelete(versions: VersionItem[], activeId: string | undefined, deletedId: string): { rest: VersionItem[]; next?: VersionItem } {
    const rest = versions.filter((v) => v.id !== deletedId);
    const next = rest.some((v) => v.id === activeId) ? rest.find((v) => v.id === activeId) : rest[rest.length - 1];
    return { rest, next };
}

export function versionFilename(name: string, fallback: string, num: number): string {
    const safe = (name.trim() || fallback).replace(/[\\/:*?"<>|]/g, "_");
    return `${safe}-v${num}.png`;
}
