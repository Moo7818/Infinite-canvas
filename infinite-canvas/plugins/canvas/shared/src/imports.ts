import type { CanvasNodeContext } from "@infinite-canvas/plugin-sdk";
import { fitNodeToImage, readImageFile } from "./media";
import { importAppendPatch, makeVersionItems } from "./versions";

// 工具条调起系统文件选择框（工具条项无 DOM 插槽，只能动态创建 input）。
export function pickImageFiles(onFiles: (files: File[]) => void): void {
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

// 导入图片新增版本：面板与工具条共用；提示词由调用方按当前表单组装；失败抛错由调用方展示。
export async function importFilesAsVersions(ctx: CanvasNodeContext, files: File[], getPrompt: () => string): Promise<void> {
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => readImageFile(f)));
    const added = makeVersionItems(urls, getPrompt());
    const last = added[added.length - 1];
    await fitNodeToImage((p) => ctx.updateNode(p), last.image);
    ctx.updateMetadata((prev) => importAppendPatch(prev, added));
}
