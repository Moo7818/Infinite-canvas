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
