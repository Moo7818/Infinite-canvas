import path from "node:path";
import { createRequire } from "node:module";
import { createOpencode, type OpencodeClient } from "@opencode-ai/sdk";

import { ensureSiteWorkspace, loadConfig } from "../config.js";
import { logger } from "../utils/logger.js";
import { errorMessage, field, type JsonRecord } from "../utils/value.js";
import { canvasAgentMcpCommand } from "./codex-client.js";
import type { AgentEmit } from "./types.js";

const require = createRequire(import.meta.url);

/** 本地固定版 opencode CLI 的 bin 目录（优先于全局 PATH，版本与共享 opencode.db 兼容）。 */
function localOpencodeBinDir() {
    try {
        return path.join(path.dirname(require.resolve("opencode-ai/package.json")), "bin");
    } catch {
        return "";
    }
}

/** opencode 服务固定监听端口，避免与 Canvas Agent 默认端口冲突。 */
export const OPENCODE_PORT = 17372;

/** Canvas Agent MCP 配置，通过 OPENCODE_CONFIG_CONTENT 注入 opencode 服务；目录无关，任何会话可直接调用画布工具。 */
const mcpMcpCommand = canvasAgentMcpCommand();
const mcpConfig = JSON.stringify({ $schema: "https://opencode.ai/config.json", mcp: { "infinite-canvas": { type: "local", command: [mcpMcpCommand.command, ...mcpMcpCommand.args], enabled: true } } });

let client: OpencodeClient | null = null;
let starting: Promise<OpencodeClient> | null = null;

/** 启动并复用 opencode 本地服务；进程异常退出后下次调用自动重启。 */
export async function getOpencodeClient(emit: AgentEmit): Promise<OpencodeClient> {
    if (client) return client;
    starting ||= startOpencode(emit);
    try {
        client = await starting;
        return client;
    } finally {
        starting = null;
    }
}

async function startOpencode(emit: AgentEmit): Promise<OpencodeClient> {
    // 解析顺序：本地固定版 bin > 已配置 PATH > npm 全局兜底。
    const localBin = localOpencodeBinDir();
    if (localBin) process.env.PATH = `${localBin}${path.delimiter}${process.env.PATH || ""}`;
    if (process.platform === "win32") {
        // 兜底：用户 PATH 没有 opencode 时补上 npm 全局目录。
        const npmDir = path.join(process.env.APPDATA || "", "npm");
        if (npmDir !== path.join("", "npm") && !`${path.delimiter}${process.env.PATH || ""}${path.delimiter}`.toLowerCase().includes(`${path.delimiter}${npmDir.toLowerCase()}${path.delimiter}`)) {
            process.env.PATH = `${process.env.PATH || ""}${path.delimiter}${npmDir}`;
        }
    }
    try {
        const created = await createOpencode({ hostname: "127.0.0.1", port: OPENCODE_PORT, config: JSON.parse(mcpConfig) });
        logger.info("opencode server started", { url: created.server.url });
        const opencode = created.client;
        pumpEvents(opencode, emit).catch((error) => {
            logger.error("opencode event stream failed", error);
            emit("agent_error", { message: `opencode 事件流中断：${errorMessage(error)}` });
            client = null;
        });
        return opencode;
    } catch (error) {
        emit("agent_error", { message: `opencode 服务启动失败：${errorMessage(error)}` });
        throw error;
    }
}

/** 启动 SSE 事件泵，把 opencode 原生事件交给归一化分发。 */
async function pumpEvents(opencode: OpencodeClient, emit: AgentEmit) {
    // opencode /event 按 directory 过滤会话事件，必须订阅站点工作空间目录。
    const directory = ensureSiteWorkspace(loadConfig()).workspacePath;
    const stream = await opencode.event.subscribe({ query: { directory } });
    logger.info("opencode event stream connected", { directory });
    for await (const event of stream.stream) dispatch(event.type, (event.properties || {}) as JsonRecord, emit);
    logger.warn("opencode event stream ended");
}

// ---------------------------------------------------------------------------
// 事件归一化：opencode 原生事件 -> 前端 Codex 兼容 agent_event。
// ---------------------------------------------------------------------------

/** 文本/reasoning 终态跟踪表，key 为 partId。 */
const settledParts = new Map<string, string>();
/** 消息角色表：把 user 消息的 text part 过滤掉（前端已单独发 synthetic user message）。 */
const messageRoles = new Map<string, string>();

/** 从 session.error 事件提取可读错误文本（真实错误可能藏在 error.data.message）。 */
function sessionErrorText(properties: JsonRecord) {
    const error = field(properties, "error");
    if (typeof error === "string") return error;
    const record = (error || {}) as JsonRecord;
    const data = field(record, "data");
    return errorMessage(field(record, "message") ?? (typeof data === "string" ? data : field(data as JsonRecord, "message")) ?? field(properties, "message")) || "opencode 会话出错";
}

type TurnWaiter = { turnId: string; resolve: (failure?: string) => void; onTurn?: (turnId: string) => void; started: boolean; finished: boolean };const activeTurns = new Map<string, TurnWaiter>();

/** 查询活跃 turn（未指定会话时取第一个在跑的）。 */
export function activeTurn(sessionID?: string) {
    if (sessionID) return activeTurns.get(sessionID);
    for (const value of activeTurns.values()) return value;
    return undefined;
}

/** 是否存在在跑的 opencode turn。 */
export function hasActiveTurn() {
    return activeTurns.size > 0;
}

/** 记录当前 turn，并清空跨轮终态缓存。 */
export function beginTurn(sessionID: string, resolve: (failure?: string) => void, onTurn?: (turnId: string) => void) {
    activeTurns.set(sessionID, { turnId: "", resolve, onTurn, started: false, finished: false });
    settledParts.clear();
    messageRoles.clear();
}

/** 记录权限请求到会话的映射，供审批回执定位。 */
const pendingPermissions = new Map<string, string>();

/** 查询权限请求所属会话。 */
export function permissionSession(requestId: string) {
    return pendingPermissions.get(requestId) || "";
}

/** turn 终结：补发文本终态、广播 turn.completed 与 agent_done 并唤醒等待方。 */
export function completeTurn(sessionID: string, status: "completed" | "failed", emit: AgentEmit, error?: string) {
    const waiter = activeTurns.get(sessionID);
    if (!waiter || waiter.finished) return;
    waiter.finished = true;
    activeTurns.delete(sessionID);
    const turnId = waiter.turnId;
    const scope = { thread_id: sessionID, threadId: sessionID, turn_id: turnId, ...(turnId ? { turnId } : {}) };
    for (const [key, text] of settledParts) {
        if (!key.startsWith("text:") || key.endsWith(":end") || !text) continue;
        if (settledParts.has(`text:${key.slice(5)}:end`)) continue;
        emit("agent_event", { agent: "opencode", type: "item.completed", item: { id: key.slice(5), type: "agent_message", text }, ...scope });
    }
    settledParts.clear();
    emit("agent_event", { agent: "opencode", type: "turn.completed", status, usage: null, ...(error ? { error: { message: error } } : {}), ...scope });
    emit("agent_done", { agent: "opencode", usage: null, ...scope });
    waiter.resolve(error);
}

function dispatch(type: string, properties: JsonRecord, emit: AgentEmit) {
    switch (type) {
        case "message.updated": {
            const info = (field(properties, "info") || {}) as JsonRecord;
            const sessionID = String(field(info, "sessionID") || "");
            const role = String(field(info, "role") || "");
            if (sessionID && role && field(info, "id")) messageRoles.set(String(field(info, "id")), role);
            const waiter = activeTurns.get(sessionID);
            if (waiter && !waiter.started && String(info.role || "") === "user") {
                waiter.started = true;
                const turnId = String(info.id || "");
                if (turnId) {
                    waiter.turnId = turnId;
                    waiter.onTurn?.(turnId);
                }
            }
            return;
        }
        case "message.part.updated":
            onPartUpdated((field(properties, "part") || properties) as JsonRecord, emit);
            return;
        case "session.status": {
            const sessionID = String(field(properties, "sessionID") || "");
            const status = (field(properties, "status") || {}) as JsonRecord;
            if (status.type === "retry") emit("agent_log", { text: `opencode 第 ${Number(status.attempt || 0)} 次重试：${String(status.message || "")}`, thread_id: sessionID, turn_id: activeTurn(sessionID)?.turnId || "" });
            return;
        }
        case "session.error": {
            const sessionID = String(field(properties, "sessionID") || "");
            logger.warn("opencode session error", { ...properties });
            completeTurn(sessionID, "failed", emit, sessionErrorText(properties));
            return;
        }
        case "session.idle":
            completeTurn(String(field(properties, "sessionID") || ""), "completed", emit);
            return;
        case "permission.updated":
            onPermissionUpdated(properties, emit);
            return;
        default:
            return;
    }
}

/** 将 opencode part 转换为前端 item 事件流。 */
function onPartUpdated(part: JsonRecord, emit: AgentEmit) {
    const sessionID = String(field(part, "sessionID") || "");
    const turnId = activeTurn(sessionID)?.turnId || "";
    const partId = String(field(part, "callID") || field(part, "id") || "");
    if (!partId || !turnId) return;
    if (messageRoles.get(String(field(part, "messageID") || "")) === "user") return;
    const state = (field(part, "state") || {}) as JsonRecord;
    if (part.type === "tool") {
        onToolPart(partId, part, state, sessionID, turnId, emit);
        return;
    }
    const time = (field(part, "time") || {}) as JsonRecord;
    const final = Boolean(time.end);
    if (part.type === "text") {
        const text = String(field(part, "text") || "");
        const endKey = `text:${partId}:end`;
        const prev = settledParts.get(`text:${partId}`) || "";
        if (settledParts.has(endKey) || (prev === text && settledParts.get(`text:${partId}`) !== undefined)) return;
        if (!settledParts.has(`text:${partId}:started`)) {
            settledParts.set(`text:${partId}:started`, "");
            emit("agent_event", { agent: "opencode", type: "item.started", item: { id: partId, type: "agent_message", text: "" }, thread_id: sessionID, turn_id: turnId });
        }
        const delta = text.startsWith(prev) ? text.slice(prev.length) : text;
        settledParts.set(`text:${partId}`, text);
        if (delta) emit("agent_event", { agent: "opencode", type: "item.updated", item: { id: partId, type: "agent_message", delta }, thread_id: sessionID, turn_id: turnId });
        if (final && !settledParts.has(endKey)) {
            settledParts.set(endKey, text);
            emit("agent_event", { agent: "opencode", type: "item.completed", item: { id: partId, type: "agent_message", text }, thread_id: sessionID, turn_id: turnId });
        }
        return;
    }
    if (part.type === "reasoning") {
        const text = String(field(part, "text") || "");
        if (!settledParts.has(`reason:${partId}`)) {
            settledParts.set(`reason:${partId}`, "");
            emit("agent_event", { agent: "opencode", type: "item.started", item: { id: partId, type: "reasoning", summary: [] }, thread_id: sessionID, turn_id: turnId });
        }
        if (final && !settledParts.has(`reason:${partId}:end`)) {
            settledParts.set(`reason:${partId}:end`, text);
            settledParts.set(`reason:${partId}`, text);
            emit("agent_event", { agent: "opencode", type: "item.completed", item: { id: partId, type: "reasoning", summary: [text] }, thread_id: sessionID, turn_id: turnId });
        }
    }
}

function onToolPart(partId: string, part: JsonRecord, state: JsonRecord, sessionID: string, turnId: string, emit: AgentEmit) {
    const scope = { thread_id: sessionID, turn_id: turnId };
    const toolName = String(field(part, "tool") || "");
    const input = (field(state, "input") || {}) as JsonRecord;
    const status = String(field(state, "status") || "");
    const stateTime = (field(state, "time") || {}) as JsonRecord;
    if (status === "pending" || status === "running") {
        if (!settledParts.has(`tool:${partId}`)) settledParts.set(`tool:${partId}`, "");
        emit("agent_event", { agent: "opencode", type: "item.started", item: { id: partId, type: "mcp_tool_call", tool: toolName, arguments: input, status: "inProgress", title: String(field(state, "title") || toolName) }, ...scope });
        return;
    }
    const error = String(field(state, "error") || "");
    if (settledParts.has(`tool:${partId}:done`)) return;
    settledParts.set(`tool:${partId}:done`, "");
    emit("agent_event", { agent: "opencode", type: "item.completed", item: {
        id: partId,
        type: "mcp_tool_call",
        tool: toolName,
        arguments: input,
        status: error ? "failed" : "completed",
        title: String(field(state, "title") || toolName),
        ...(status === "completed" && stateTime.end ? { result: parseOutput(field(state, "output")) } : {}),
        ...(error ? { error: { message: error } } : {}),
    }, ...scope });
}

/** opencode 工具输出 JSON 解析，畸形输出按原样包装。 */
function parseOutput(output: unknown) {
    if (typeof output !== "string") return typeof output === "object" && output ? output : {};
    try {
        return JSON.parse(output);
    } catch {
        return { output };
    }
}

/**
 * 权限：opencode permission.updated -> codex_approval 卡。
 * 前端 accept/acceptForSession/decline 由 wrapper 映射 once/always/reject 回执。
 */
function onPermissionUpdated(permission: JsonRecord, emit: AgentEmit) {
    const sessionID = String(field(permission, "sessionID") || "");
    const permissionId = String(field(permission, "id") || "");
    if (permissionId) {
        pendingPermissions.set(permissionId, sessionID);
        emit("codex_approval", {
            requestId: permissionId,
            method: String(field(permission, "type") || "opencode.permission"),
            threadId: sessionID,
            turnId: activeTurn(sessionID)?.turnId || "",
            itemId: String(field(permission, "callID") || "") || undefined,
            reason: String(field(permission, "title") || "opencode 请求授权"),
            opencodePermission: permission,
        });
    }
}
