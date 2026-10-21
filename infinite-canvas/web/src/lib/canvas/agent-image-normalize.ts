import { compressAgentImage } from "@/lib/canvas/canvas-image-data";
import type { CanvasAgentOp } from "@/lib/canvas/canvas-agent-ops";
import type { CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";

// 镜像 canvas-agent 的 IMAGE_FIELD_LIMITS（schemas.ts）再加图片节点 content：Agent 写入这些字段前做超限压缩。
// web 核心不认识插件字段，只能在此单独维护；改动插件图片字段时两处需同步。
const AGENT_IMAGE_FIELDS: Record<string, string[]> = {
    "character:role": ["faceImages", "outfitImages", "extraImages"],
    "scene:view": ["envImages", "lightImages", "extraImages", "styleImage"],
    "prop:item": ["materialImages", "detailImages", "extraImages", "styleImage"],
    "video:film": ["refs"],
    image: ["content"],
};

/** 应用 Agent 画布操作前压缩各节点图片字段；远程图拉取失败会抛错中断，由调用方通知 Agent 且不落盘。 */
export async function normalizeAgentImageOps(ops: CanvasAgentOp[], nodes: CanvasNodeData[]): Promise<CanvasAgentOp[]> {
    return await Promise.all(
        ops.map(async (op) => {
            if (op.type === "add_node") {
                const metadata = await compressMetadata(String(op.nodeType || ""), op.metadata);
                return metadata === op.metadata ? op : { ...op, metadata };
            }
            if (op.type === "update_node") {
                const nodeType = String(nodes.find((node) => node.id === op.id)?.type || "");
                const metadata = await compressMetadata(nodeType, op.metadata);
                const patchMetadata = await compressMetadata(nodeType, op.patch?.metadata);
                const patch = patchMetadata === op.patch?.metadata ? op.patch : { ...op.patch, metadata: patchMetadata };
                return metadata === op.metadata && patch === op.patch ? op : { ...op, metadata, patch };
            }
            return op;
        }),
    );
}

async function compressMetadata(nodeType: string, metadata: CanvasNodeMetadata | undefined): Promise<CanvasNodeMetadata | undefined> {
    const fields = AGENT_IMAGE_FIELDS[nodeType];
    if (!fields || !metadata) return metadata;
    const record = metadata as Record<string, unknown>;
    const next = { ...metadata };
    const nextRecord = next as Record<string, unknown>;
    let changed = false;
    for (const field of fields) {
        const value = record[field];
        if (Array.isArray(value)) {
            const compressed = await Promise.all(value.map((item) => (typeof item === "string" ? compressAgentImage(item) : item)));
            if (compressed.some((item, index) => item !== value[index])) {
                nextRecord[field] = compressed;
                changed = true;
            }
        } else if (typeof value === "string") {
            const compressed = await compressAgentImage(value);
            if (compressed !== value) {
                nextRecord[field] = compressed;
                changed = true;
            }
        }
    }
    return changed ? next : metadata;
}
