import { useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContext } from "@infinite-canvas/plugin-sdk";

// 在途生成的取消器：模块常驻，面板开关不影响；刷新后 Map 为空，靠各插件的 generating 残留自愈。
// 注意：每个引用本包的插件 bundle 内各一份实例，天然按插件隔离。
const runningControllers = new Map<string, AbortController>();

// 宿主(Agent run_generation)触发入口与面板共用这张在途表：登记后，面板挂载时的
// 「generating 为真但本会话无在途」兜底逻辑不会把宿主正在跑的生成误判为刷新中断。
export function beginHostGeneration(nodeId: string, alreadyGenerating = false): AbortController | null {
    if (runningControllers.has(nodeId) || alreadyGenerating) return null;
    const controller = new AbortController();
    runningControllers.set(nodeId, controller);
    return controller;
}

export function endHostGeneration(nodeId: string): void {
    runningControllers.delete(nodeId);
}

export function useGenerationGuard(ctx: CanvasNodeContext) {
    // 生成态持久化：generating 进 metadata，关面板重开不丢失；在途请求靠模块级取消器接管。
    const [running, setRunning] = useState(Boolean((ctx.node.metadata || {}).generating));
    // 同步检查与占用（无 await 间隙，不存在竞态）；running/metadata 只做 UI 与跨面板持久。
    const begin = (): AbortController | null => {
        if (runningControllers.has(ctx.node.id)) {
            console.debug("[plugin] 重复提交已拦截");
            return null;
        }
        if (running || Boolean((ctx.node.metadata || {}).generating)) return null;
        const controller = new AbortController();
        runningControllers.set(ctx.node.id, controller);
        setRunning(true);
        return controller;
    };
    const end = () => {
        runningControllers.delete(ctx.node.id);
        setRunning(false);
    };
    const cancel = () => runningControllers.get(ctx.node.id)?.abort();
    const isLive = (nodeId = ctx.node.id) => runningControllers.has(nodeId);
    return { running, setRunning, begin, end, cancel, isLive };
}
