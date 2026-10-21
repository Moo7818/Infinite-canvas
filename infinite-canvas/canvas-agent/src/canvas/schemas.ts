import { z } from "zod";

/** metadata 等自由对象字段：同时接受对象与 JSON 字符串（模型常把对象序列化成字符串传入）。 */
const recordSchema = z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text.startsWith("{")) return value;
    try {
        return JSON.parse(text);
    } catch {
        return value;
    }
}, z.record(z.unknown()));
const positionSchema = z.object({ x: z.number(), y: z.number() });
const viewportSchema = z.object({ x: z.number(), y: z.number(), k: z.number() });
const nodeTypeSchema = z.enum(["image", "text", "config", "video", "audio"]);
const generationModeSchema = z.enum(["text", "image", "video", "audio"]);

/** Canvas Agent 对外提供的工具名称。 */
export const toolNames = [
    "site_navigate",
    "canvas_list_projects",
    "canvas_get_state",
    "canvas_get_selection",
    "canvas_export_snapshot",
    "canvas_apply_ops",
    "canvas_create_node",
    "canvas_create_attachment_nodes",
    "canvas_list_attachments",
    "canvas_create_text_node",
    "canvas_create_text_nodes",
    "canvas_create_config_node",
    "canvas_create_image_prompt_flow",
    "canvas_create_generation_flow",
    "canvas_list_node_types",
    "canvas_create_character_node",
    "canvas_create_scene_node",
    "canvas_create_prop_node",
    "canvas_create_grid_node",
    "canvas_create_film_node",
    "canvas_generate_text",
    "canvas_generate_image",
    "canvas_generate_video",
    "canvas_generate_audio",
    "canvas_update_node",
    "canvas_update_node_text",
    "canvas_move_nodes",
    "canvas_resize_node",
    "canvas_delete_nodes",
    "canvas_connect_nodes",
    "canvas_select_nodes",
    "canvas_set_viewport",
    "canvas_run_generation",
    "generation_get_status",
    "workbench_image_get_config",
    "workbench_image_generate",
    "workbench_video_get_config",
    "workbench_video_generate",
    "prompts_search",
    "assets_list",
    "assets_add",
] as const;
export type ToolName = (typeof toolNames)[number];

export const canvasOpSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("add_node"), nodeType: nodeTypeSchema.optional(), id: z.string().optional(), title: z.string().optional(), x: z.number().optional(), y: z.number().optional(), width: z.number().optional(), height: z.number().optional(), position: positionSchema.optional(), metadata: recordSchema.optional() }).passthrough(),
    z.object({ type: z.literal("update_node"), id: z.string(), patch: recordSchema.optional(), metadata: recordSchema.optional() }).passthrough(),
    z.object({ type: z.literal("delete_node"), id: z.string().optional(), ids: z.array(z.string()).optional() }).passthrough(),
    z.object({ type: z.literal("delete_connections"), id: z.string().optional(), ids: z.array(z.string()).optional(), all: z.boolean().optional() }).passthrough(),
    z.object({ type: z.literal("connect_nodes"), id: z.string().optional(), fromNodeId: z.string(), toNodeId: z.string() }).passthrough(),
    z.object({ type: z.literal("set_viewport"), viewport: viewportSchema }).passthrough(),
    z.object({ type: z.literal("select_nodes"), ids: z.array(z.string()) }).passthrough(),
    z.object({ type: z.literal("run_generation"), nodeId: z.string(), mode: generationModeSchema.optional(), prompt: z.string().optional() }).passthrough(),
]);

const textNodeSchema = z.object({
    text: z.string(),
    title: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
});

const generationOptionsSchema = z.object({
    model: z.string().optional(),
    size: z.string().optional(),
    quality: z.string().optional(),
    count: z.number().optional(),
    seconds: z.string().optional(),
    vquality: z.string().optional(),
    generateAudio: z.string().optional(),
    watermark: z.string().optional(),
    videoMode: z.string().optional(),
    audioVoice: z.string().optional(),
    audioFormat: z.string().optional(),
    audioSpeed: z.string().optional(),
    audioInstructions: z.string().optional(),
});

const generationFlowSchema = z.object({
    prompt: z.string(),
    title: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    referenceNodeIds: z.array(z.string()).optional(),
});

// 插件节点公共字段：标题与布局，其余字段直接写入节点 metadata。
const pluginNodeBase = {
    title: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
};

/** 图片字段接受 dataURL、http(s) URL 或 attachment:<附件ID>，显式拒绝本地路径／临时文件／节点 ID。 */
const imageRefSchema = z.string().refine((value) => /^data:image\//i.test(value) || /^https?:\/\//i.test(value) || /^attachment:.+/i.test(value), {
    message: "图片字段接受三种写法：data:image/... dataURL、http(s) URL、或 attachment:<附件ID>（用户上传图，用 canvas_list_attachments 查 ID）。file://、blob:、相对路径和画布节点 ID 都不支持；参考图直接作为节点参数写入即可，不要再调用 canvas_create_attachment_nodes 建图片节点。",
});

/** 图片数组字段：格式与插件侧上限一起校验，超量直接报错，避免拖到生图时才失败。 */
const imageListSchema = (max: number, label: string) => z.array(imageRefSchema).max(max, { message: `${label} 最多 ${max} 张图片` });

/** 插件节点的图片字段上限，与插件侧常量保持一致（character/scene/prop/video）。 */
export const IMAGE_FIELD_LIMITS: Record<string, Array<{ field: string; max: number }>> = {
    "character:role": [{ field: "faceImages", max: 3 }, { field: "outfitImages", max: 2 }, { field: "extraImages", max: 3 }],
    "scene:view": [{ field: "envImages", max: 3 }, { field: "lightImages", max: 2 }, { field: "extraImages", max: 2 }, { field: "styleImage", max: 1 }],
    "prop:item": [{ field: "materialImages", max: 2 }, { field: "detailImages", max: 3 }, { field: "extraImages", max: 2 }, { field: "styleImage", max: 1 }],
    "video:film": [{ field: "refs", max: 9 }],
};

/** 判断字符串是否是合法图片地址：data:image/... dataURL、http(s) URL 或 attachment:<附件ID>。 */
function isImageAddress(value: unknown) {
    return typeof value === "string" && (/^data:image\//i.test(value) || /^https?:\/\//i.test(value) || /^attachment:.+/i.test(value));
}

/** 列出某节点类型里承载图片的 metadata 字段名，供附件展开与前端压缩共用（image 节点为 content）。 */
export function imageFieldsFor(nodeType: string): string[] {
    if (nodeType === "image") return ["content"];
    return (IMAGE_FIELD_LIMITS[nodeType] || []).map((item) => item.field);
}

/** 校验插件节点图片字段（格式 + 数量上限），供更新路径复用，避免绕过创建时的收紧。 */
export function assertNodeImageFields(nodeType: string, ...payloads: Array<Record<string, unknown> | undefined>) {
    for (const { field, max } of IMAGE_FIELD_LIMITS[nodeType] || []) {
        for (const payload of payloads) {
            const value = payload?.[field];
            if (value === undefined || value === null) continue;
            const list = Array.isArray(value) ? value : [value];
            if (list.length > max) throw new Error(`${field} 最多 ${max} 张图片`);
            if (!list.every((item) => isImageAddress(item))) {
                throw new Error(`${field} 只能使用 data:image/... dataURL、http(s) URL 或 attachment:<附件ID>（用 canvas_list_attachments 查 ID）；file://、blob:、相对路径和画布节点 ID 不支持。参考图直接作为节点参数写入，不要建附件节点`);
            }
        }
    }
}

/** 校验核心图片节点的图片地址，避免创建出空白图片节点。 */
export function assertImageContent(nodeType: string, ...payloads: Array<Record<string, unknown> | undefined>) {
    if (nodeType !== "image") return;
    for (const payload of payloads) {
        const content = payload?.content;
        if (typeof content !== "string" || !content) continue;
        if (!isImageAddress(content)) {
            throw new Error("图片节点 content 只能使用 data:image/... dataURL、http(s) URL 或 attachment:<附件ID>（用 canvas_list_attachments 查 ID）；file://、blob:、相对路径和画布节点 ID 不支持");
        }
    }
}

const characterNodeSchema = z.object({
    ...pluginNodeBase,
    name: z.string().optional(),
    age: z.number().optional(),
    traits: z.string().optional(),
    style: z.string().optional(),
    faceText: z.string().optional(),
    faceImages: imageListSchema(3, "faceImages").optional(),
    outfitText: z.string().optional(),
    outfitImages: imageListSchema(2, "outfitImages").optional(),
    extraText: z.string().optional(),
    extraImages: imageListSchema(3, "extraImages").optional(),
});

const sceneNodeSchema = z.object({
    ...pluginNodeBase,
    name: z.string().optional(),
    time: z.string().optional(),
    style: z.string().optional(),
    styleImage: imageRefSchema.optional(),
    envText: z.string().optional(),
    envImages: imageListSchema(3, "envImages").optional(),
    lightText: z.string().optional(),
    lightImages: imageListSchema(2, "lightImages").optional(),
    camera: z.string().optional(),
    extraText: z.string().optional(),
    extraImages: imageListSchema(2, "extraImages").optional(),
});

const propNodeSchema = z.object({
    ...pluginNodeBase,
    name: z.string().optional(),
    category: z.string().optional(),
    style: z.string().optional(),
    styleImage: imageRefSchema.optional(),
    materialText: z.string().optional(),
    materialImages: imageListSchema(2, "materialImages").optional(),
    detailText: z.string().optional(),
    detailImages: imageListSchema(3, "detailImages").optional(),
    view: z.string().optional(),
    extraText: z.string().optional(),
    extraImages: imageListSchema(2, "extraImages").optional(),
});

const gridNodeSchema = z.object({
    ...pluginNodeBase,
    name: z.string().optional(),
    castIds: z.array(z.string()).optional(),
    castNames: z.array(z.string()).optional(),
    spaceId: z.string().optional(),
    spaceName: z.string().optional(),
    doc: z.string().optional(),
});

const filmNodeSchema = z.object({
    ...pluginNodeBase,
    name: z.string().optional(),
    model: z.string().optional(),
    ratio: z.string().optional(),
    seconds: z.union([z.string(), z.number()]).optional(),
    prompt: z.string().optional(),
    refs: imageListSchema(9, "refs").optional(),
});

export const toolInputSchemas = {
    site_navigate: z.object({ path: z.string() }),
    canvas_list_projects: z.object({ keyword: z.string().optional(), page: z.number().optional(), pageSize: z.number().optional() }),
    canvas_get_state: z.object({}).passthrough(),
    canvas_get_selection: z.object({}).passthrough(),
    canvas_export_snapshot: z.object({}).passthrough(),
    canvas_apply_ops: z.object({ ops: z.array(canvasOpSchema) }),
    canvas_create_node: z.object({ nodeType: nodeTypeSchema, title: z.string().optional(), x: z.number().optional(), y: z.number().optional(), width: z.number().optional(), height: z.number().optional(), metadata: recordSchema.optional() }),
    canvas_create_attachment_nodes: z.object({ attachmentIds: z.array(z.string()).min(1), x: z.number().optional(), y: z.number().optional(), gap: z.number().optional(), direction: z.enum(["row", "column"]).optional() }),
    canvas_list_attachments: z.object({}).passthrough(),
    canvas_create_text_node: z.object({ text: z.string().optional(), x: z.number().optional(), y: z.number().optional(), title: z.string().optional(), width: z.number().optional(), height: z.number().optional() }),
    canvas_create_text_nodes: z.object({ items: z.array(textNodeSchema).min(1), x: z.number().optional(), y: z.number().optional(), gap: z.number().optional(), direction: z.enum(["row", "column"]).optional() }),
    canvas_create_config_node: z.object({ prompt: z.string().optional(), mode: generationModeSchema.optional(), title: z.string().optional(), x: z.number().optional(), y: z.number().optional(), width: z.number().optional(), height: z.number().optional(), autoRun: z.boolean().optional() }).merge(generationOptionsSchema),
    canvas_create_image_prompt_flow: z.object({ prompt: z.string(), x: z.number().optional(), y: z.number().optional(), autoRun: z.boolean().optional() }).merge(generationOptionsSchema),
    canvas_create_generation_flow: generationFlowSchema.extend({ mode: generationModeSchema.optional(), autoRun: z.boolean().optional() }).merge(generationOptionsSchema),
    canvas_list_node_types: z.object({ pluginId: z.string().optional() }).passthrough(),
    canvas_create_character_node: characterNodeSchema,
    canvas_create_scene_node: sceneNodeSchema,
    canvas_create_prop_node: propNodeSchema,
    canvas_create_grid_node: gridNodeSchema,
    canvas_create_film_node: filmNodeSchema,
    canvas_generate_text: generationFlowSchema.merge(generationOptionsSchema),
    canvas_generate_image: generationFlowSchema.merge(generationOptionsSchema),
    canvas_generate_video: generationFlowSchema.merge(generationOptionsSchema),
    canvas_generate_audio: generationFlowSchema.merge(generationOptionsSchema),
    canvas_update_node: z.object({ id: z.string(), patch: recordSchema.optional(), metadata: recordSchema.optional() }),
    canvas_update_node_text: z.object({ id: z.string(), text: z.string(), title: z.string().optional() }),
    canvas_move_nodes: z.object({ items: z.array(z.object({ id: z.string(), x: z.number().optional(), y: z.number().optional(), dx: z.number().optional(), dy: z.number().optional() })).min(1) }),
    canvas_resize_node: z.object({ id: z.string(), width: z.number(), height: z.number(), freeResize: z.boolean().optional() }),
    canvas_delete_nodes: z.object({ ids: z.array(z.string()).min(1) }),
    canvas_connect_nodes: z.object({ connections: z.array(z.object({ fromNodeId: z.string(), toNodeId: z.string() })).min(1) }),
    canvas_select_nodes: z.object({ ids: z.array(z.string()) }),
    canvas_set_viewport: z.object({ viewport: viewportSchema }),
    canvas_run_generation: z.object({ nodeId: z.string(), mode: generationModeSchema.optional(), prompt: z.string().optional() }),
    generation_get_status: z.object({ scope: z.enum(["all", "canvas", "image", "video"]).optional(), taskId: z.string().optional(), nodeIds: z.array(z.string()).optional(), limit: z.number().optional() }),
    workbench_image_get_config: z.object({}).passthrough(),
    workbench_image_generate: z.object({ prompt: z.string(), model: z.string().optional(), quality: z.string().optional(), size: z.string().optional(), count: z.number().optional(), run: z.boolean().optional() }),
    workbench_video_get_config: z.object({}).passthrough(),
    workbench_video_generate: z.object({ prompt: z.string(), model: z.string().optional(), size: z.string().optional(), seconds: z.string().optional(), resolution: z.string().optional(), generateAudio: z.boolean().optional(), watermark: z.boolean().optional(), mode: z.enum(["frames", "reference"]).optional(), run: z.boolean().optional() }),
    prompts_search: z.object({ keyword: z.string().optional(), category: z.string().optional(), tags: z.array(z.string()).optional(), page: z.number().optional(), pageSize: z.number().optional() }),
    assets_list: z.object({ kind: z.enum(["all", "text", "image", "video"]).optional(), keyword: z.string().optional(), page: z.number().optional(), pageSize: z.number().optional() }),
    assets_add: z.object({ kind: z.enum(["text", "image"]), title: z.string(), content: z.string().optional(), imageUrl: z.string().optional(), tags: z.array(z.string()).optional(), source: z.string().optional(), note: z.string().optional() }),
} satisfies Record<ToolName, z.AnyZodObject>;

export const toolDescriptions: Record<ToolName, string> = {
    site_navigate: "跳转网站页面。path 可为 / (首页)、/canvas (我的画布)、/canvas/:id (指定画布)、/image (生图工作台)、/video (视频创作台)、/prompts (提示词库)、/assets (我的素材)、/config (配置)。操作画布前若不在画布页，先用本工具打开画布。",
    canvas_list_projects: "列出用户全部画布（仅标题、创建/更新时间、节点数、连线数，不含完整数据），支持 keyword 搜索和 page/pageSize 分页。返回的 id 可配合 site_navigate 跳转到 /canvas/:id 打开对应画布。",
    canvas_get_state: "读取当前网页画布的节点、连线、选区和视口。",
    canvas_get_selection: "读取当前网页画布选中的节点。",
    canvas_export_snapshot: "导出当前画布快照，用于理解布局。",
    canvas_apply_ops: "批量操作当前网页画布。ops 支持 add_node、update_node、delete_node、delete_connections、connect_nodes、set_viewport、select_nodes、run_generation。",
    canvas_create_node: "创建任意类型节点：text、image、config、video、audio。适合创建占位图、媒体占位、配置节点或自定义 metadata 节点。",
    canvas_create_attachment_nodes: "把用户上传的图片附件创建成真实画布图片节点。attachmentIds 取附件清单中的 ID（本轮或此前上传且仍在保留期内的附件都可）；返回的节点 ID 可传给 canvas_create_generation_flow.referenceNodeIds 作为生成参考图。",
    canvas_list_attachments: "列出当前标签页最近上传、仍可使用的图片附件（attachmentId、文件名、尺寸）。不确定旧附件 ID 时先调用本工具；创建图片节点仍用 canvas_create_attachment_nodes。",
    canvas_create_text_node: "在当前画布创建单个文本节点。",
    canvas_create_text_nodes: "批量创建文本节点，适合生成标题、段落、脚本、说明等内容块。",
    canvas_create_config_node: "创建生成配置节点，可指定 text/image/video/audio 模式和生成参数，可选择立即触发生成。",
    canvas_create_image_prompt_flow: "创建提示词文本节点和图片生成配置节点，并自动连线，可选择立即触发生图。",
    canvas_create_generation_flow: "创建通用生成流程：提示词文本节点、生成配置节点、参考节点连线，可用于文案、生图、视频或音频。referenceNodeIds 传画布节点 ID（用户上传的图片先经 canvas_create_attachment_nodes 变成图片节点）。",
    canvas_list_node_types: "列出当前网页已注册的画布节点类型，包含节点类型 ID、标题、所属插件和默认尺寸。插件节点不在 canvas_create_node 的固定枚举内，创建前先用本工具确认类型 ID。",
    canvas_create_character_node: "在当前画布创建角色节点。name、age、traits、style 描述角色；faceImages（≤3）、outfitImages（≤2）、extraImages（≤3）为参考图数组。参考图直接作为节点参数写入，接受 data:image/... base64 dataURL、http(s) URL 或 attachment:<附件ID>（用户上传图用 canvas_list_attachments 查 ID）；禁止 file://、本地路径、blob:、相对路径和画布节点 ID。不要再为参考图调用 canvas_create_attachment_nodes 建独立图片节点；超限图片会自动压缩（长边≤4096、JPEG），远程图拉取失败会中断并报错。",
    canvas_create_scene_node: "在当前画布创建场景节点。name、time、style、camera 描述场景；envImages（≤3）、lightImages（≤2）、extraImages（≤2）为参考图数组，styleImage 为单张风格图。参考图直接作为节点参数写入，接受 data:image/... base64 dataURL、http(s) URL 或 attachment:<附件ID>（用户上传图用 canvas_list_attachments 查 ID）；禁止 file://、本地路径、blob:、相对路径和画布节点 ID。不要再为参考图调用 canvas_create_attachment_nodes 建独立图片节点；超限图片会自动压缩（长边≤4096、JPEG），远程图拉取失败会中断并报错。",
    canvas_create_prop_node: "在当前画布创建道具节点。name、category、style、view 描述道具；materialImages（≤2）、detailImages（≤3）、extraImages（≤2）为参考图数组，styleImage 为单张风格图。参考图直接作为节点参数写入，接受 data:image/... base64 dataURL、http(s) URL 或 attachment:<附件ID>（用户上传图用 canvas_list_attachments 查 ID）；禁止 file://、本地路径、blob:、相对路径和画布节点 ID。不要再为参考图调用 canvas_create_attachment_nodes 建独立图片节点；超限图片会自动压缩（长边≤4096、JPEG），远程图拉取失败会中断并报错。",
    canvas_create_grid_node: "在当前画布创建宫格节点（2×2 四宫格）。用 castIds 传入角色节点 ID（有序），castNames 保存角色名快照，spaceId/spaceName 关联场景节点，doc 填写整体说明。",
    canvas_create_film_node: "在当前画布创建影片节点。可设置 name、model、ratio（如 16:9）、seconds、prompt；refs 为参考图数组（≤9）。参考图直接作为节点参数写入，接受 data:image/... base64 dataURL、http(s) URL 或 attachment:<附件ID>（用户上传图用 canvas_list_attachments 查 ID）；禁止 file://、本地路径、blob:、相对路径和画布节点 ID。不要再为参考图调用 canvas_create_attachment_nodes 建独立图片节点；超限图片会自动压缩（长边≤4096、JPEG），远程图拉取失败会中断并报错。生成仍在节点面板内触发。",
    canvas_generate_text: "创建通用文本生成流程并立即触发生成。",
    canvas_generate_image: "创建通用图片生成流程并立即触发生成。",
    canvas_generate_video: "创建通用视频生成流程并立即触发生成。",
    canvas_generate_audio: "创建通用音频生成流程并立即触发生成。",
    canvas_update_node: "更新节点基础字段或 metadata。",
    canvas_update_node_text: "更新文本节点内容和标题。",
    canvas_move_nodes: "移动一个或多个节点，支持绝对坐标或 dx/dy 偏移。",
    canvas_resize_node: "调整节点尺寸。",
    canvas_delete_nodes: "删除指定节点及相关连线。",
    canvas_connect_nodes: "批量连接节点。",
    canvas_select_nodes: "设置当前选中节点。",
    canvas_set_viewport: "调整画布视口。",
    canvas_run_generation: "触发指定节点生成，通常用于配置节点或文本/图片/视频/音频节点。",
    generation_get_status: "查询当前活动网页的生成任务状态。默认返回画布、生图工作台和视频工作台最近任务；可用 scope 过滤来源，用 taskId 查询工作台任务，用 nodeIds 查询画布节点。",
    workbench_image_get_config: "读取生图工作台的当前参数和可选项（可用模型、质量、分辨率 1k/2k/4k/auto、宽高比、张数范围），在调用 workbench_image_generate 前先了解可选值。",
    workbench_image_generate: "在生图工作台填入提示词并按需设置 model、quality、size（如 16:9 或 2048x1152）、count，run 默认 true 会自动点击生成按钮。会自动跳转到生图工作台。生成为异步过程，提交后返回 taskId，可用 generation_get_status 查询状态。",
    workbench_video_get_config: "读取视频创作台的当前参数和可选项（可用模型、清晰度 480/720/1080、比例 1:1/3:4/4:3/16:9/9:16/21:9/auto、时长 4–30 秒、首尾帧或全能参考模式、是否生成声音与水印）。",
    workbench_video_generate: "在视频创作台填入提示词并按需设置 model、size（1:1、3:4、4:3、16:9、9:16、21:9、auto 或 1280x720）、seconds（4–30）、resolution（480/720/1080）、generateAudio、watermark、mode（frames 首尾帧 / reference 全能参考），run 默认 true 会自动点击生成按钮。会自动跳转到视频创作台。生成为异步过程，提交后返回 taskId，可用 generation_get_status 查询状态。",
    prompts_search: "搜索提示词库（第三方提示词合集），支持 keyword、category、tags 过滤和 page/pageSize 分页，返回标题、提示词、分类、标签、封面等。",
    assets_list: "列出用户「我的素材」，支持 kind（text/image/video）过滤、keyword 搜索和 page/pageSize 分页。为控制体积不返回图片/视频原始 data，仅返回封面与元信息。",
    assets_add: "向「我的素材」新增素材。kind=text 时用 content 传文本内容；kind=image 时用 imageUrl 传图片地址或 dataURL。可附带 title、tags、source、note。",
};
