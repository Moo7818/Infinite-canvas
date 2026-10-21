export type ImageCropRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type ImageAngleTransform = {
    horizontalAngle: number;
    pitchAngle: number;
    cameraDistance: number;
    wideAngle: boolean;
};

export type ImageUpscaleAlgorithm = "nearest" | "bilinear" | "high";

export const MAX_UPSCALE_LONG_EDGE = 4096;

export type ImageUpscaleParams = {
    targetLongEdge: number;
    algorithm: ImageUpscaleAlgorithm;
};

export type ImageSplitParams = {
    rows: number;
    columns: number;
    horizontalLines?: number[];
    verticalLines?: number[];
};

export type ImageSplitPiece = {
    row: number;
    column: number;
    dataUrl: string;
};

export async function cropDataUrl(dataUrl: string, crop?: ImageCropRect) {
    const image = await loadImage(dataUrl);
    if (crop) {
        return drawCrop(image, Math.floor(crop.x * image.width), Math.floor(crop.y * image.height), Math.ceil(crop.width * image.width), Math.ceil(crop.height * image.height));
    }
    const size = Math.min(image.width, image.height);
    const sx = Math.max(0, Math.floor((image.width - size) / 2));
    const sy = Math.max(0, Math.floor((image.height - size) / 2));
    return drawCrop(image, sx, sy, size, size);
}

export async function splitDataUrl(dataUrl: string, params: ImageSplitParams): Promise<ImageSplitPiece[]> {
    const image = await loadImage(dataUrl);
    const xCuts = buildSplitCuts(params.verticalLines, image.width, Math.max(1, Math.floor(params.columns)));
    const yCuts = buildSplitCuts(params.horizontalLines, image.height, Math.max(1, Math.floor(params.rows)));
    const pieces: ImageSplitPiece[] = [];

    for (let row = 0; row < yCuts.length - 1; row += 1) {
        const sy = yCuts[row];
        const sh = yCuts[row + 1] - sy;
        for (let column = 0; column < xCuts.length - 1; column += 1) {
            const sx = xCuts[column];
            const sw = xCuts[column + 1] - sx;
            pieces.push({ row, column, dataUrl: drawCrop(image, sx, sy, sw, sh) });
        }
    }

    return pieces;
}

function buildSplitCuts(lines: number[] | undefined, size: number, count: number) {
    if (!lines?.length) return Array.from({ length: count + 1 }, (_, index) => Math.floor((index * size) / count));
    return [0, ...lines.map((line) => Math.round(line * size)).filter((line) => line > 0 && line < size).sort((a, b) => a - b), size];
}

export async function transformAngleDataUrl(dataUrl: string, params: ImageAngleTransform) {
    const image = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    const padding = Math.round(Math.max(image.width, image.height) * 0.18);
    canvas.width = image.width + padding * 2;
    canvas.height = image.height + padding * 2;
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const horizontal = params.horizontalAngle / 60;
    const pitch = params.pitchAngle / 45;
    const distanceScale = 1.12 - params.cameraDistance * 0.035;
    const wideScale = params.wideAngle ? 0.88 : 1;
    const scale = Math.max(0.64, Math.min(1.1, distanceScale * wideScale));
    const width = image.width * scale * (1 - Math.abs(horizontal) * 0.28);
    const height = image.height * scale * (1 - Math.abs(pitch) * 0.18);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const skewX = horizontal * image.width * 0.18;
    const skewY = pitch * image.height * 0.12;
    const x = cx - width / 2 + horizontal * padding * 0.5;
    const y = cy - height / 2 + pitch * padding * 0.45;

    context.save();
    context.setTransform(1, pitch * 0.08, horizontal * -0.1, 1, 0, 0);
    context.drawImage(image, x + skewX, y + skewY, width, height);
    context.restore();

    if (params.wideAngle) {
        const gradient = context.createRadialGradient(cx, cy, Math.min(canvas.width, canvas.height) * 0.2, cx, cy, Math.max(canvas.width, canvas.height) * 0.62);
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(1, "rgba(0,0,0,0.18)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    return canvas.toDataURL("image/png");
}

export async function upscaleDataUrl(dataUrl: string, params: ImageUpscaleParams) {
    const image = await loadImage(dataUrl);
    const { width, height } = resolveUpscaleSize(image.width, image.height, params.targetLongEdge);
    return params.algorithm === "high" ? drawStepUpscale(image, width, height) : drawResize(image, image.width, image.height, width, height, params.algorithm);
}

export function resolveUpscaleSize(width: number, height: number, targetLongEdge: number) {
    const longEdge = Math.max(1, width, height);
    const target = Math.min(MAX_UPSCALE_LONG_EDGE, Math.max(1, Math.round(targetLongEdge)));
    const scale = target / longEdge;
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function drawCrop(image: HTMLImageElement, sx: number, sy: number, sw: number, sh: number) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const context = canvas.getContext("2d");
    if (!context) return image.src;
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
}

function drawStepUpscale(image: HTMLImageElement, width: number, height: number) {
    let source: CanvasImageSource = image;
    let sourceWidth = image.width;
    let sourceHeight = image.height;

    while (sourceWidth * 2 < width && sourceHeight * 2 < height) {
        const nextWidth = sourceWidth * 2;
        const nextHeight = sourceHeight * 2;
        const next = drawResizeCanvas(source, sourceWidth, sourceHeight, nextWidth, nextHeight, "high");
        source = next;
        sourceWidth = nextWidth;
        sourceHeight = nextHeight;
    }

    return drawResize(source, sourceWidth, sourceHeight, width, height, "high");
}

function drawResize(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, width: number, height: number, algorithm: ImageUpscaleAlgorithm) {
    return drawResizeCanvas(source, sourceWidth, sourceHeight, width, height, algorithm).toDataURL("image/png");
}

function drawResizeCanvas(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, width: number, height: number, algorithm: ImageUpscaleAlgorithm) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return canvas;
    context.imageSmoothingEnabled = algorithm !== "nearest";
    context.imageSmoothingQuality = algorithm === "bilinear" ? "medium" : "high";
    context.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
    return canvas;
}

function loadImage(dataUrl: string) {
    return new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = dataUrl;
    });
}

// Agent 写入图片字段的超限自动处理阈值：长边 ≤4096、单张 ≤8MB，超限转 JPEG 0.98 起、按档降到 0.6。
export const AGENT_IMAGE_MAX_EDGE = 4096;
export const AGENT_IMAGE_BYTE_BUDGET = 8 * 1024 * 1024;
export const AGENT_IMAGE_QUALITY_STEPS = [0.98, 0.9, 0.8, 0.7, 0.6];

/**
 * Agent 写入节点图片字段前的超限自动处理：远程 URL 先拉取（失败/非图片/解码失败即抛错中断，交由调用方通知 Agent），
 * dataURL 直接解码；长边 >4096 或字节 >8MB 才压缩——降采样到 ≤4096 并转 JPEG 0.98，仍超 8MB 按 0.9→0.8→0.7→0.6 逐档降。
 * 限内图片不做无谓重编码：dataURL 原样返回，远程图内联为 dataURL（自包含，避免日后链接失效）。
 */
export async function compressAgentImage(value: string): Promise<string> {
    if (typeof value !== "string" || !value) return value;
    const isRemote = /^https?:\/\//i.test(value);
    const isDataUrl = /^data:image\//i.test(value);
    if (!isRemote && !isDataUrl) return value;

    let objectUrl = "";
    try {
        let remoteBlob: Blob | undefined;
        let source = value;
        if (isRemote) {
            let response: Response;
            try {
                response = await fetch(value);
            } catch (error) {
                throw new Error(`参考图拉取失败：${value}（${error instanceof Error ? error.message : "网络错误"}），已停止写入`);
            }
            if (!response.ok) throw new Error(`参考图拉取失败：${value}（HTTP ${response.status}），已停止写入`);
            remoteBlob = await response.blob();
            if (!remoteBlob.type.startsWith("image/")) throw new Error(`参考图不是图片：${value}（${remoteBlob.type || "未知类型"}），已停止写入`);
            objectUrl = URL.createObjectURL(remoteBlob);
            source = objectUrl;
        }

        const image = await decodeImage(source);
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const bytes = remoteBlob ? remoteBlob.size : dataUrlByteSize(value);
        const longEdge = Math.max(width, height);

        if (bytes <= AGENT_IMAGE_BYTE_BUDGET && longEdge <= AGENT_IMAGE_MAX_EDGE) {
            return remoteBlob ? await blobToDataUrl(remoteBlob) : value;
        }

        const scale = Math.min(1, AGENT_IMAGE_MAX_EDGE / longEdge);
        const canvas = drawResizeCanvas(image, width, height, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), "high");
        let output = canvas.toDataURL("image/jpeg", AGENT_IMAGE_QUALITY_STEPS[0]);
        for (let step = 1; step < AGENT_IMAGE_QUALITY_STEPS.length && dataUrlByteSize(output) > AGENT_IMAGE_BYTE_BUDGET; step += 1) {
            output = canvas.toDataURL("image/jpeg", AGENT_IMAGE_QUALITY_STEPS[step]);
        }
        return output;
    } catch (error) {
        if (error instanceof Error && error.message.includes("已停止写入")) throw error;
        throw new Error(`参考图处理失败：${value.slice(0, 120)}（${error instanceof Error ? error.message : "未知错误"}），已停止写入`);
    } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
}

function decodeImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("图片解码失败"));
        image.src = src;
    });
}

function dataUrlByteSize(dataUrl: string) {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return 0;
    return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
        reader.readAsDataURL(blob);
    });
}
