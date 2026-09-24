import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import localforage from "localforage";

import { nanoid } from "nanoid";
import i18n from "@/i18n";
import { localForageStorage } from "@/lib/localforage-storage";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData, ViewportTransform } from "@/types/canvas";

export type CanvasProject = {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    viewport: ViewportTransform;
};

export type CanvasDeletedProject = {
    id: string;
    deletedAt: string;
};

type CanvasStore = {
    hydrated: boolean;
    projects: CanvasProject[];
    deletedProjects: CanvasDeletedProject[];
    createProject: (title?: string) => string;
    importProject: (project: Partial<CanvasProject>) => string;
    openProject: (id: string) => CanvasProject | null;
    renameProject: (id: string, title: string) => void;
    deleteProjects: (ids: string[]) => void;
    replaceProjects: (projects: CanvasProject[], deletedProjects?: CanvasDeletedProject[]) => void;
    updateProject: (id: string, patch: Partial<Pick<CanvasProject, "nodes" | "connections" | "chatSessions" | "activeChatId" | "backgroundMode" | "showImageInfo" | "viewport">>) => void;
};

const initialViewport: ViewportTransform = { x: 0, y: 0, k: 1 };
const CANVAS_STORE_KEY = "infinite-canvas:canvas_store";
const CANVAS_STORAGE_VERSION = 1;
type PersistedCanvasState = Pick<CanvasStore, "projects" | "deletedProjects">;
type CanvasStorageMeta = { version: number; projectIds: string[]; deletedProjects: CanvasDeletedProject[] };
const projectStore = localforage.createInstance({ name: "infinite-canvas", storeName: "canvas_projects" });
const metaStore = localforage.createInstance({ name: "infinite-canvas", storeName: "canvas_meta" });
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedPersistState: PersistedCanvasState | null = null;
let persistedProjects = new Map<string, CanvasProject>();
let persistedProjectIds = new Set<string>();
let writeQueue: Promise<void> = Promise.resolve();

async function readSplitState(): Promise<StorageValue<CanvasStore> | null> {
    const meta = await metaStore.getItem<CanvasStorageMeta>("state");
    if (!meta || meta.version !== CANVAS_STORAGE_VERSION) return null;
    const projects = (await Promise.all(meta.projectIds.map((id) => projectStore.getItem<CanvasProject>(id)))).filter((project): project is CanvasProject => Boolean(project));
    if (projects.length !== meta.projectIds.length) return null;
    return { state: { projects, deletedProjects: meta.deletedProjects } as CanvasStore, version: 0 };
}

async function migrateLegacyState(name: string, legacy: StorageValue<CanvasStore>) {
    await Promise.all(legacy.state.projects.map((project) => projectStore.setItem(project.id, project)));
    await metaStore.setItem<CanvasStorageMeta>("state", { version: CANVAS_STORAGE_VERSION, projectIds: legacy.state.projects.map((project) => project.id), deletedProjects: legacy.state.deletedProjects });
    persistedProjects = new Map(legacy.state.projects.map((project) => [project.id, project]));
    persistedProjectIds = new Set(legacy.state.projects.map((project) => project.id));
    void name;
}

async function flushSplitState(name: string, state: PersistedCanvasState) {
    const nextIds = new Set(state.projects.map((project) => project.id));
    await Promise.all(
        state.projects.filter((project) => persistedProjects.get(project.id) !== project).map((project) => projectStore.setItem(project.id, project)),
    );
    await Promise.all(Array.from(persistedProjectIds).filter((id) => !nextIds.has(id)).map((id) => projectStore.removeItem(id)));
    await metaStore.setItem<CanvasStorageMeta>("state", { version: CANVAS_STORAGE_VERSION, projectIds: state.projects.map((project) => project.id), deletedProjects: state.deletedProjects });
    persistedProjects = new Map(state.projects.map((project) => [project.id, project]));
    persistedProjectIds = nextIds;
    void name;
}

const canvasStorage: PersistStorage<CanvasStore> = {
    getItem: async (name) => {
        const splitState = await readSplitState().catch(() => null);
        if (splitState) {
            queuedPersistState = splitState.state as PersistedCanvasState;
            persistedProjects = new Map(splitState.state.projects.map((project) => [project.id, project]));
            persistedProjectIds = new Set(splitState.state.projects.map((project) => project.id));
            return splitState;
        }
        const value = await localForageStorage.getItem(name);
        if (!value) return null;
        const parsed = JSON.parse(value) as StorageValue<CanvasStore>;
        queuedPersistState = parsed.state as PersistedCanvasState;
        persistedProjects = new Map(parsed.state.projects.map((project) => [project.id, project]));
        persistedProjectIds = new Set(parsed.state.projects.map((project) => project.id));
        writeQueue = writeQueue.then(() => migrateLegacyState(name, parsed));
        return parsed;
    },
    setItem: (name, value) => {
        const nextState = value.state as PersistedCanvasState;
        if (queuedPersistState && queuedPersistState.projects === nextState.projects && queuedPersistState.deletedProjects === nextState.deletedProjects) return;
        queuedPersistState = nextState;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveTimer = null;
            writeQueue = writeQueue.then(() => flushSplitState(name, nextState)).catch(() => localForageStorage.setItem(name, JSON.stringify({ state: nextState, version: 0 })));
        }, 400);
    },
    removeItem: async (name) => {
        await localForageStorage.removeItem(name);
        await metaStore.removeItem("state");
        await Promise.all(Array.from(persistedProjectIds).map((id) => projectStore.removeItem(id)));
        persistedProjects.clear();
        persistedProjectIds.clear();
    },
};

export const useCanvasStore = create<CanvasStore>()(
    persist(
        (set, get) => ({
            hydrated: false,
            projects: [],
            deletedProjects: [],
            createProject: (title = i18n.t("canvas.project.untitled")) => {
                const now = new Date().toISOString();
                const id = nanoid();
                const project: CanvasProject = {
                    id,
                    title,
                    createdAt: now,
                    updatedAt: now,
                    nodes: [],
                    connections: [],
                    chatSessions: [],
                    activeChatId: null,
                    backgroundMode: "lines",
                    showImageInfo: false,
                    viewport: initialViewport,
                };
                set((state) => ({ projects: [project, ...state.projects] }));
                return id;
            },
            importProject: (source) => {
                const now = new Date().toISOString();
                const project: CanvasProject = {
                    id: nanoid(),
                    title: source.title || i18n.t("canvas.project.imported"),
                    createdAt: source.createdAt || now,
                    updatedAt: now,
                    nodes: source.nodes || [],
                    connections: source.connections || [],
                    chatSessions: source.chatSessions || [],
                    activeChatId: source.activeChatId || null,
                    backgroundMode: source.backgroundMode || "lines",
                    showImageInfo: source.showImageInfo || false,
                    viewport: source.viewport || initialViewport,
                };
                set((state) => ({ projects: [project, ...state.projects] }));
                return project.id;
            },
            openProject: (id) => {
                return get().projects.find((item) => item.id === id) || null;
            },
            renameProject: (id, title) =>
                set((state) => ({
                    projects: state.projects.map((project) => (project.id === id ? { ...project, title: title.trim() || project.title, updatedAt: new Date().toISOString() } : project)),
                })),
            deleteProjects: (ids) =>
                set((state) => {
                    const now = new Date().toISOString();
                    const removing = new Set(ids);
                    const projects = state.projects.filter((project) => !removing.has(project.id));
                    const deletedProjects = [...state.deletedProjects.filter((item) => !removing.has(item.id)), ...ids.map((id) => ({ id, deletedAt: now }))];
                    return { projects, deletedProjects };
                }),
            replaceProjects: (projects, deletedProjects = []) => set({ projects, deletedProjects }),
            updateProject: (id, patch) =>
                set((state) => ({
                    projects: state.projects.map((project) => (project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project)),
                })),
        }),
        {
            name: CANVAS_STORE_KEY,
            storage: canvasStorage,
            partialize: (state) =>
                ({
                    projects: state.projects,
                    deletedProjects: state.deletedProjects,
                }) as StorageValue<CanvasStore>["state"],
            onRehydrateStorage: () => () => {
                useCanvasStore.setState({ hydrated: true });
            },
        },
    ),
);
