import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCanvasToolRequest } from "./operations.js";

function opsOf(name: Parameters<typeof buildCanvasToolRequest>[0], input: Record<string, unknown>) {
    const request = buildCanvasToolRequest(name, input, null);
    return (request.input as { ops: Array<Record<string, any>> }).ops;
}

test("generation flow reuses referenced nodes when the prompt only mentions them", () => {
    const ops = opsOf("canvas_generate_image", { prompt: "@[node:text-1]", referenceNodeIds: ["text-1"], title: "Flow", autoRun: true });
    const addedTextNodes = ops.filter((op) => op.type === "add_node" && op.nodeType === "text");
    const config = ops.find((op) => op.type === "add_node" && op.nodeType === "config");
    const runs = ops.filter((op) => op.type === "run_generation");
    assert.equal(addedTextNodes.length, 0);
    assert.equal(ops.filter((op) => op.type === "connect_nodes" && op.fromNodeId === "text-1" && String(op.toNodeId).startsWith("config-")).length, 1);
    assert.match(String(config?.metadata?.prompt), /^@\[node:text-1\]$/);
    assert.equal(runs.length, 1);
});

test("generation flow still creates a prompt node for prose prompts", () => {
    const ops = opsOf("canvas_generate_image", { prompt: "a cat on a roof", referenceNodeIds: ["text-1"], autoRun: true });
    assert.equal(ops.filter((op) => op.type === "add_node" && op.nodeType === "text").length, 1);
    const config = ops.find((op) => op.type === "add_node" && op.nodeType === "config");
    assert.match(String(config?.metadata?.prompt), /@\[node:text-/);
});

test("插件图片字段的 attachment:<id> 经 resolver 展开为 dataURL，其余取值原样保留", () => {
    const request = buildCanvasToolRequest(
        "canvas_create_character_node",
        { name: "林晚棠", faceImages: ["attachment:a1"], outfitImages: ["data:image/png;base64,zzz"], extraImages: ["https://example.com/e.png"] },
        null,
        (id) => `data:image/png;base64,expanded-${id}`,
    );
    const ops = (request.input as { ops: Array<Record<string, any>> }).ops;
    assert.equal(ops[0].nodeType, "character:role");
    assert.deepEqual(ops[0].metadata.faceImages, ["data:image/png;base64,expanded-a1"]);
    assert.deepEqual(ops[0].metadata.outfitImages, ["data:image/png;base64,zzz"]);
    assert.deepEqual(ops[0].metadata.extraImages, ["https://example.com/e.png"]);
});

test("图片节点 content 的 attachment:<id> 在 update_node 里按当前节点类型展开", () => {
    const state = { projectId: "p", title: "p", nodes: [{ id: "image-1", type: "image" }], connections: [], selectedNodeIds: [], viewport: { x: 0, y: 0, k: 1 } } as any;
    const request = buildCanvasToolRequest(
        "canvas_apply_ops",
        { ops: [{ type: "update_node", id: "image-1", metadata: { content: "attachment:pic" } }] },
        state,
        (id) => `data:image/jpeg;base64,${id}`,
    );
    const ops = (request.input as { ops: Array<Record<string, any>> }).ops;
    assert.equal(ops[0].metadata.content, "data:image/jpeg;base64,pic");
});

test("未提供 resolver 时 attachment 引用不被展开（会话层始终会传入 resolver）", () => {
    const ops = opsOf("canvas_create_character_node", { faceImages: ["attachment:a1"] });
    assert.deepEqual(ops[0].metadata.faceImages, ["attachment:a1"]);
});
