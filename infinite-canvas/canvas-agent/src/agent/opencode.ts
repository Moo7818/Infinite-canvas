import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { OpencodeClient } from "@opencode-ai/sdk";

import { ensureSiteWorkspace, loadConfig } from "../config.js";
import { logger } from "../utils/logger.js";
import { errorMessage, field, type JsonRecord } from "../utils/value.js";
import { messageMetadataStore } from "./message-metadata.js";
import { beginTurn, completeTurn, getOpencodeClient, permissionSession } from "./opencode-client.js";
import { writeAttachmentFiles, CodexSkillLookupError } from "./codex.js";
import type { CodexModel, CodexSkillsListEntry } from "./codex-protocol.js";
import type { AgentAttachment, AgentEmit, AgentPermissionMode } from "./types.js";

type OpencodeRunOptions = { threadId?: string; cwd?: string; permissionMode?: AgentPermissionMode; model?: string; messageText?: string; appEmit?: AgentEmit; onStart?: () => void; onThread?: (threadId: string) => void; onTurn?: (turnId: string) => void; onFinish?: () => void };
type OpencodeSession = { id: string; title: string; directory: string; createdAt: number; updatedAt: number };

let turnQueue: Promise<unknown> = Promise.resolve();
let loadedSessionId = "";

/** 当前站点工作空间目录（opencode 会话的归属目录）。 */
function workspaceDirectory() {
    return ensureSiteWorkspace(loadConfig()).workspacePath;
}

/** opencode harness 暂不支持的功能统一错误。 */
export class OpencodeUnsupportedError extends CodexSkillLookupError {
    constructor(message: string) {
        super(message, 409);
    }
}

/** 将 opencode session 或会话记录转换为前端线程摘要（已是摘要形状时原样透传）。 */
export function summarizeOpencodeThread(thread: unknown) {
    if (field(thread as JsonRecord, "preview") !== undefined && field(thread as JsonRecord, "id")) return thread;
    const record = (thread || {}) as JsonRecord;
    const time = (field(record, "time") || {}) as JsonRecord;
    const session: OpencodeSession = {
        id: String(field(record, "id") || ""),
        title: String(field(record, "title") || ""),
        directory: String(field(record, "directory") || ""),
        createdAt: Number(field(time, "created") || field(record, "createdAt") || 0),
        updatedAt: Number(field(time, "updated") || field(record, "updatedAt") || 0),
    };
    return {
        id: session.id,
        sessionId: session.id,
        preview: session.title,
        name: session.title || null,
        cwd: session.directory,
        status: "idle",
        threadSource: "emptyThread",
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    };
}

/** 与 codex.ts 相同的可恢复线程错误判断（opencode 会话被删除后视为可恢复）。 */
export function isRecoverableThreadError(error: unknown) {
    return /not found|unknown session|no such session/i.test(errorMessage(error));
}

/** 预热期 MCP 清单补齐，让会话状态达到 ready。 */
function emitPreheatInventory(emit: AgentEmit, threadId: string, preheat: boolean) {
    if (!preheat) return;
    emit("agent_bootstrap", { type: "mcp.startup", phase: "preheat", threadId, name: "infinite-canvas", status: "ready" });
    emit("agent_bootstrap", { type: "mcp.complete", phase: "preheat", threadId, services: [{ name: "infinite-canvas", authStatus: "unsupported" }] });
}

/** 创建新的 opencode 会话并记录当前会话。 */
export async function startOpencodeThread(emit: AgentEmit, cwd?: string, _permissionMode: AgentPermissionMode = "request", preheat = false) {
    const opencode = await getOpencodeClient(emit);
    const session = sessionFrom(await opencode.session.create({ query: cwd ? { directory: cwd } : undefined }));
    loadedSessionId = session.id;
    emitPreheatInventory(emit, session.id, preheat);
    return summarizeOpencodeThread(session);
}

/** 恢复指定 opencode 会话并返回聊天历史。 */
export async function resumeOpencodeThread(emit: AgentEmit, threadId: string, cwd?: string, _permissionMode: AgentPermissionMode = "request", preheat = false) {
    const session = await loadSession(emit, threadId, cwd);
    loadedSessionId = threadId;
    emitPreheatInventory(emit, session.id, preheat);
    const history = await loadHistory(emit, threadId, cwd);
    return { thread: summarizeOpencodeThread(session), ...history, historyReady: true };
}

/** 读取指定 opencode 会话及其聊天历史。 */
export async function readOpencodeThread(emit: AgentEmit, threadId: string, cwd?: string) {
    const session = await loadSession(emit, threadId, cwd);
    const history = await loadHistory(emit, threadId, cwd);
    return { thread: summarizeOpencodeThread(session), ...history, historyReady: true };
}

/** 查询当前工作空间中的 opencode 会话。 */
export async function listOpencodeThreads(emit: AgentEmit, options: { cwd: string; searchTerm?: string; limit?: number }) {
    const opencode = await getOpencodeClient(emit);
    const data = resultArray(await opencode.session.list({ query: { directory: options.cwd } }))
        .map(sessionFrom)
        .filter((session) => session.id && samePath(session.directory, options.cwd))
        .filter((session) => !options.searchTerm || session.title.includes(options.searchTerm) || session.id.includes(options.searchTerm))
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, options.limit || 40)
        .map(summarizeOpencodeThread);
    return { data, nextCursor: null, backwardsCursor: null };
}

/** 读取 SDK 请求结果的实际载荷（RequestResult 包含 data 包装）。 */
function unwrapResponse(value: unknown): JsonRecord {
    const outer = (value || {}) as JsonRecord;
    const failed = field(outer, "error");
    if (failed) {
        const detail = field(failed, "message") || field(failed, "data") || failed;
        throw new Error(`opencode 请求失败：${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400)}`);
    }
    const data = field(outer, "data");
    return data && typeof data === "object" && !Array.isArray(data) ? (data as JsonRecord) : outer;
}

/** 查询当前可用模型；id 编码为 providerID/modelID，turn 时解码回 opencode。跟随 opencode 已配置的 provider 与模型，不再写死只取免费模型。 */
export async function listOpencodeModels(emit: AgentEmit) {
    const opencode = await getOpencodeClient(emit);
    const payload = unwrapResponse(await opencode.config.providers());
    const providers = Array.isArray(field(payload, "providers")) ? (field(payload, "providers") as unknown[]) : [];
    const defaults = (field(payload, "default") || {}) as JsonRecord;
    const data = providers.flatMap((value: unknown) => {
        const provider = (value || {}) as JsonRecord;
        const providerId = String(field(provider, "id") || "");
        if (!providerId) return [];
        const defaultModel = String(field(defaults, providerId) || "");
        return Object.entries((field(provider, "models") || {}) as JsonRecord)
            .filter(([modelId]) => modelId !== "directory")
            .map(([modelId, model]): CodexModel => ({
                id: `${providerId}/${modelId}`,
                model: modelId,
                displayName: String(field((model || {}) as JsonRecord, "name") || modelId),
                defaultReasoningEffort: "medium",
                supportedReasoningEfforts: [{ reasoningEffort: "medium" }],
                ...(modelId === defaultModel ? { isDefault: true } : {}),
            }));
    });
    return { data };
}

/** opencode 侧无原生 Skill，返回空列表（SkillStore 管理的技能仍来自 HTTP 存取端点）。 */
export async function listOpencodeSkills(_emit: AgentEmit, cwd: string): Promise<CodexSkillsListEntry> {
    return { cwd, skills: [], errors: [] };
}

/** Skill 选择/配置/提炼在 opencode harness 统一视为暂不支持。 */
export function guardOpencodeSkill(): never {
    throw new OpencodeUnsupportedError("opencode harness 暂不支持 Skill 功能");
}

/** 归档（删除）指定 opencode 会话。 */
export async function archiveOpencodeThread(emit: AgentEmit, threadId: string) {
    const opencode = await getOpencodeClient(emit);
    await opencode.session.delete({ path: { id: threadId }, query: { directory: workspaceDirectory() } }).catch((error) => logger.warn("Failed to delete opencode session", { threadId, error }));
    if (loadedSessionId === threadId) loadedSessionId = "";
    await messageMetadataStore.removeThread(threadId).catch((error) => logger.warn("Failed to remove archived thread message metadata", { threadId, error }));
}

/** 中断当前 opencode turn；实际终态由事件循环在 session.idle / session.error 时落定。 */
export async function interruptOpencodeTurn(threadId?: string) {
    const sessionId = threadId || loadedSessionId;
    if (!sessionId) return false;
    const opencode = await getOpencodeClient(() => undefined);
    return await opencode.session.abort({ path: { id: sessionId }, query: { directory: workspaceDirectory() } }).then(
        () => true,
        (error) => {
            logger.warn("Failed to abort opencode session", { sessionId, error });
            return false;
        },
    );
}

/** 回执 opencode 权限请求（accept→once，acceptForSession→always，decline/cancel→reject）。 */
export async function resolveOpencodeApproval(requestId: string, decision: string) {
    const sessionId = permissionSession(requestId);
    if (!sessionId) return false;
    const opencode = await getOpencodeClient(() => undefined);
    const response = decision === "accept" ? "once" : decision === "acceptForSession" ? "always" : "reject";
    return await opencode.postSessionIdPermissionsPermissionId({
        path: { id: sessionId, permissionID: requestId },
        query: { directory: workspaceDirectory() },
        body: { response },
    }).then(
        () => true,
        (error) => {
            logger.warn("Failed to resolve opencode permission", { requestId, decision, error });
            return false;
        },
    );
}

/** 将前端发送的裸模型名解析为 providerID/modelID（唯一匹配才解析，避免歧义误选）。 */
async function resolveModelId(emit: AgentEmit, model: string) {
    if (!model || model.includes("/")) return model;
    try {
        const entries = (await listOpencodeModels(emit)).data;
        const matched = entries.filter((item) => item.model === model).map((item) => item.id);
        if (matched.length === 1) return matched[0];
        logger.warn("opencode model name not uniquely matched, falling back to default", { model, matched: matched.length });
    } catch (error) {
        logger.warn("Failed to resolve opencode model name", { model, error });
    }
    return model;
}

/** 执行一次 opencode turn，并负责附件临时文件与会话串行。 */
export async function runOpencodeTurn(prompt: string, lifecycleEmit: AgentEmit, attachments: AgentAttachment[] = [], options: OpencodeRunOptions = {}) {
    if (!prompt.trim()) return;
    turnQueue = turnQueue.catch(() => undefined).then(() => runOpencodeTurnNow(prompt, lifecycleEmit, attachments, options));
    await turnQueue;
}

async function runOpencodeTurnNow(prompt: string, lifecycleEmit: AgentEmit, attachments: AgentAttachment[], options: OpencodeRunOptions) {
    let files: string[] = [];
    try {
        options.onStart?.();
        files = await writeAttachmentFiles(attachments, options.cwd);
        const emit = options.appEmit || lifecycleEmit;
        const opencode = await getOpencodeClient(emit);
        const cwd = options.cwd || process.cwd();
        const session = options.threadId ? await loadSession(emit, options.threadId, cwd) : sessionFrom(await opencode.session.create({ query: { directory: cwd } }));
        loadedSessionId = session.id;
        const turnId = `msg_${crypto.randomUUID()}`;
        let confirmed = false;
        const done = new Promise<string | undefined>((resolve) => {
            beginTurn(session.id, resolve, (userMessageId) => {
                if (confirmed) return;
                confirmed = true;
                options.onTurn?.(userMessageId);
                emit("agent_event", { agent: "opencode", type: "turn.started", thread_id: session.id, turn_id: userMessageId });
            });
        });
        options.onThread?.(session.id);
        const modelId = await resolveModelId(emit, options.model || "");
        if (options.model) logger.info("opencode turn model", { requested: options.model, resolved: modelId });
        // 同步 prompt：请求在 turn 结束时返回（1.x CLI 无 message-async 异步端点）。
        const promptTask = opencode.session.prompt({
            path: { id: session.id },
            query: { directory: cwd },
            body: {
                messageID: turnId,
                parts: [{ type: "text" as const, text: prompt }, ...files.map((file) => ({ type: "file" as const, mime: "image/*", filename: path.basename(file), url: pathToFileURL(file).href }))],
                ...(modelId?.includes("/") ? { model: { providerID: modelId.split("/")[0], modelID: modelId.split("/")[1] } } : {}),
            },
        });
        void promptTask.then(
            (result) => {
                const failed = field((result || {}) as JsonRecord, "error");
                if (failed) void completeTurn(session.id, "failed", emit, `opencode turn 失败：${errorMessage(failed)}`);
            },
            (error) => {
                logger.error("opencode prompt failed", error);
                void completeTurn(session.id, "failed", emit, errorMessage(error));
            },
        );
        const failure = await done;
        await promptTask.then(() => undefined, () => undefined);
        if (failure) {
            logger.warn("opencode turn finished with failure", { threadId: session.id, turnId, message: failure });
        }
    } catch (error) {
        logger.error("opencode turn failed", error);
        lifecycleEmit("agent_error", { message: errorMessage(error) });
    } finally {
        options.onFinish?.();
    }
}

// ---------------------------------------------------------------------------
// 会话与消息读取。
// ---------------------------------------------------------------------------

async function loadSession(emit: AgentEmit, threadId: string, cwd?: string) {
    const opencode = await getOpencodeClient(emit);
    const result = await opencode.session.get({ path: { id: threadId }, query: { directory: cwd } }).catch((error) => {
        throw new Error(`会话不存在：${errorMessage(error)}`);
    });
    const session = sessionFrom(result);
    assertSessionWorkspace(session, cwd);
    return session;
}

async function loadHistory(emit: AgentEmit, threadId: string, cwd?: string) {
    const opencode = await getOpencodeClient(emit);
    const result = await opencode.session.messages({ path: { id: threadId }, query: { directory: cwd } });
    const messages = await mergeMessageMetadata(threadId, threadMessages(threadId, resultArray(result)));
    return { messages, settledTurnIds: [...new Set(messages.filter((message) => message.turnId).map((message) => message.turnId))] };
}

/** 合并浏览器保存的消息元数据（与 codex.ts 一致）。 */
async function mergeMessageMetadata<T extends { role: string; threadId: string; turnId: string }>(threadId: string, messages: T[]) {
    try {
        return await messageMetadataStore.mergeThread(threadId, messages);
    } catch (error) {
        logger.warn("Failed to read thread message metadata", { threadId, error });
        return messages;
    }
}

/** 将 opencode 消息列表转换为网页聊天历史。 */
function threadMessages(threadId: string, data: unknown[]) {
    const messages: Array<{ role: string; id: string; itemId: string; threadId: string; turnId: string; text: string }> = [];
    data.forEach((entry) => {
        const record = (entry || {}) as JsonRecord;
        const info = (field(record, "info") || {}) as JsonRecord;
        const parts = Array.isArray(field(record, "parts")) ? (field(record, "parts") as unknown[]) : [];
        const role = String(field(info, "role") || "");
        if (role !== "user" && role !== "assistant") return;
        const text = parts.filter((part) => field(part, "type") === "text" && !field(part, "synthetic")).map((part) => String(field(part, "text") || "")).join("");
        if (!text.trim()) return;
        const turnId = role === "user" ? String(field(info, "id") || "") : String(field(info, "parentID") || "");
        const messageId = String(field(info, "id") || "");
        if (!turnId || !messageId) return;
        messages.push({ role, id: `${threadId}:${turnId}:${messageId}`, itemId: messageId, threadId, turnId, text });
    });
    return messages;
}

/** 校验会话是否属于指定工作空间。 */
function assertSessionWorkspace(session: OpencodeSession, cwd?: string) {
    if (!cwd || samePath(session.directory, cwd)) return;
    throw new Error("该 opencode 会话不属于当前画布工作空间");
}

/** 比较跨平台绝对路径；Windows 路径不区分大小写。 */
function samePath(left: string, right: string) {
    const normalize = (value: string) => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
    return normalize(left) === normalize(right);
}

function sessionFrom(value: unknown): OpencodeSession {
    const payload = unwrapResponse(value);
    const time = (field(payload, "time") || {}) as JsonRecord;
    return {
        id: String(field(payload, "id") || ""),
        title: String(field(payload, "title") || ""),
        directory: String(field(payload, "directory") || ""),
        createdAt: Number(field(time, "created") || 0),
        updatedAt: Number(field(time, "updated") || 0),
    };
}

/** 解开 SDK RequestResult（{data}）包装；无包装时原样返回。 */
function unwrap(value: unknown): JsonRecord {
    const outer = (value || {}) as JsonRecord;
    const data = field(outer, "data");
    return data && typeof data === "object" && !Array.isArray(data) ? (data as JsonRecord) : outer;
}

/** 将 SDK 请求结果中的数组提取出来（兼容 data/info/items 包装），错误响应抛出。 */
function resultArray(value: unknown): unknown[] {
    if (value && typeof value === "object" && field(value as JsonRecord, "error")) unwrapResponse(value);
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
        const record = value as JsonRecord;
        for (const key of ["data", "info", "items"]) {
            const nested = field(record, key);
            if (Array.isArray(nested)) return nested;
            const deep = resultArray(nested);
            if (deep.length) return deep;
        }
    }
    return [];
}
