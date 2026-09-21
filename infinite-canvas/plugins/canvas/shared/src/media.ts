// 图片读写与下载：纯浏览器 API，无宿主依赖。

export function readImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

export function imageDims(src: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
        img.onerror = () => resolve({ w: 1, h: 1 });
        img.src = src;
    });
}

// 引用图下采样：最长边压到 maxEdge 并转 JPEG。只用于构图参考（模型内部本就会缩），
// 生成结果原图不动，输出质量零影响；远端 URL 原样透传，失败原样返回。
export async function downscaleImage(src: string, maxEdge = 1536): Promise<string> {
    if (!src.startsWith("data:image/")) return src;
    try {
        const d = await imageDims(src);
        const scale = Math.min(1, maxEdge / Math.max(d.w, d.h));
        if (scale >= 1) return src;
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = src;
        });
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const g = c.getContext("2d");
        if (!g) return src;
        g.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.85);
    } catch {
        return src;
    }
}
// 节点按实际图片比例自适应：宽固定，图高换算后夹紧，+30 留底部状态条。
export async function fitNodeToImage(updateNode: (patch: { width: number; height: number }) => void, url: string, width = 300): Promise<void> {
    const d = await imageDims(url);
    const imgH = Math.min(520, Math.max(200, Math.round((width * d.h) / d.w)));
    updateNode({ width, height: imgH + 30 });
}

// 下载：dataURL 直下；远端 URL 先抓成 blob（跨域失败抛错由调用方展示）。
export async function downloadImage(url: string, filename: string): Promise<void> {
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
