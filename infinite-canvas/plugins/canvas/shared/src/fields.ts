import type { CanvasNodeData } from "@infinite-canvas/plugin-sdk";

export type CanvasImageCandidate = { id: string; title: string; url: string };

// 节点自带图：内置图片节点与自研节点都把图同步到 metadata.content，直接可读。
export function nodeImageUrl(n: CanvasNodeData): string | null {
    const c = n.metadata?.content;
    if (typeof c === "string" && (c.startsWith("data:image/") || /^https?:\/\//i.test(c))) return c;
    return null;
}

// 画布图片候选（排除自身）；快照式引用，选中即拷 URL，用后与源节点无关。
export function listCanvasImages(nodes: CanvasNodeData[], excludeId: string): CanvasImageCandidate[] {
    const out: CanvasImageCandidate[] = [];
    for (const n of nodes) {
        if (n.id === excludeId) continue;
        const url = nodeImageUrl(n);
        if (url) out.push({ id: n.id, title: n.title, url });
    }
    return out;
}

// 读图数组：新版数组 + 旧版单字段合并去重（老节点兼容），按上限裁剪。
export function fieldImages(one: unknown, many: unknown, max: number): string[] {
    const list: string[] = [];
    if (Array.isArray(many)) list.push(...many.filter((v): v is string => typeof v === "string" && v.length > 0));
    if (typeof one === "string" && one.length > 0 && !list.includes(one)) list.push(one);
    return list.slice(0, max);
}
