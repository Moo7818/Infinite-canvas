import { agentHarness } from "../config.js";
import { errorMessage } from "../utils/value.js";
import * as opencode from "./opencode.js";
import { CodexSkillLookupError, archiveCodexThread, configureCodexSkill, generateCodexSkillDraft, interruptCodexTurn, isRecoverableThreadError as codexRecoverable, listCodexModels, listCodexSkills, listCodexThreads, readCodexThread, resolveCodexApproval, resolveCodexSkill, resumeCodexThread, runCodexTurn, startCodexThread, summarizeCodexThread } from "./codex.js";
import { archiveOpencodeThread, guardOpencodeSkill, interruptOpencodeTurn, listOpencodeModels, listOpencodeSkills, listOpencodeThreads, readOpencodeThread, resolveOpencodeApproval, resumeOpencodeThread, runOpencodeTurn, startOpencodeThread, summarizeOpencodeThread } from "./opencode.js";
import type { CodexReasoningEffort, CodexSkillSelector } from "./codex-protocol.js";
import type { AgentAttachment, AgentEmit, AgentPermissionMode } from "./types.js";

export { CodexSkillLookupError };

type RunOptions = { threadId?: string; cwd?: string; permissionMode?: AgentPermissionMode; model?: string; effort?: CodexReasoningEffort; skill?: CodexSkillSelector; messageText?: string; appEmit?: AgentEmit; onStart?: () => void; onThread?: (threadId: string) => void; onTurn?: (turnId: string) => void; onFinish?: () => void };
type SkillDraftInput = { model?: string; effort?: CodexReasoningEffort } & ({ source: "conversation"; threadId: string } | { source: "canvas"; snapshot: unknown });

/** 彻底脱离 Codex：默认 opencode harness，仅在 canvas-agent.json 显式 "harness": "codex" 时回退。 */
const useOpencode = agentHarness() !== "codex";

export function runTurn(prompt: string, lifecycleEmit: AgentEmit, attachments: AgentAttachment[] = [], options: RunOptions = {}) {
    return useOpencode ? opencode.runOpencodeTurn(prompt, lifecycleEmit, attachments, options) : runCodexTurn(prompt, lifecycleEmit, attachments, options);
}

export function interruptTurn(threadId?: string) {
    return useOpencode ? interruptOpencodeTurn(threadId) : interruptCodexTurn(threadId);
}

export function resolveApproval(requestId: string, decision: string) {
    return useOpencode ? resolveOpencodeApproval(requestId, decision) : resolveCodexApproval(requestId, decision);
}

export function startThread(emit: AgentEmit, cwd?: string, permission: AgentPermissionMode = "request", preheat = false) {
    return useOpencode ? startOpencodeThread(emit, cwd, permission, preheat) : startCodexThread(emit, cwd, permission, preheat);
}

export function resumeThread(emit: AgentEmit, threadId: string, cwd?: string, permission: AgentPermissionMode = "request", preheat = false) {
    return useOpencode ? resumeOpencodeThread(emit, threadId, cwd, permission, preheat) : resumeCodexThread(emit, threadId, cwd, permission, preheat);
}

export function readThread(emit: AgentEmit, threadId: string, cwd?: string) {
    return useOpencode ? readOpencodeThread(emit, threadId, cwd) : readCodexThread(emit, threadId, cwd);
}

export function listThreads(emit: AgentEmit, options: { cwd: string; searchTerm?: string; limit?: number }) {
    return useOpencode ? listOpencodeThreads(emit, options) : listCodexThreads(emit, options);
}

export function listModels(emit: AgentEmit) {
    return useOpencode ? listOpencodeModels(emit) : listCodexModels(emit);
}

export function listSkills(emit: AgentEmit, cwd: string, forceReload = false) {
    return useOpencode ? listOpencodeSkills(emit, cwd) : listCodexSkills(emit, cwd, forceReload);
}

export function resolveSkill(emit: AgentEmit, cwd: string, selector: CodexSkillSelector, requireEnabled = false) {
    return useOpencode ? guardOpencodeSkill() : resolveCodexSkill(emit, cwd, selector, requireEnabled);
}

export function configureSkill(emit: AgentEmit, cwd: string, selector: CodexSkillSelector, enabled: boolean) {
    return useOpencode ? guardOpencodeSkill() : configureCodexSkill(emit, cwd, selector, enabled);
}

export function generateSkillDraft(emit: AgentEmit, cwd: string, input: SkillDraftInput) {
    return useOpencode ? guardOpencodeSkill() : generateCodexSkillDraft(emit, cwd, input as never);
}

export function archiveThread(emit: AgentEmit, threadId: string, cwd?: string) {
    return useOpencode ? archiveOpencodeThread(emit, threadId) : archiveCodexThread(emit, threadId, cwd);
}

/** 将线程归一化成前端列表摘要；opencode 已返回摘要形状时原样透传。 */
export function summarizeThread(thread: unknown) {
    return useOpencode ? summarizeOpencodeThread(thread) : summarizeCodexThread(thread);
}

export function isRecoverableThreadError(error: unknown) {
    return useOpencode ? /会话不存在|不属于当前画布工作空间|not found|unknown session|no such session/i.test(errorMessage(error)) : codexRecoverable(error);
}
