import { Button, Drawer, Input, Modal, Segmented, Select, Space } from "antd";
import { ListPlus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { defaultBaseUrlForApiFormat, guessCapability, normalizeChannelModels, type ApiCallFormat, type ChannelModel, type ImageSizeMode, type ModelCapability, type ModelChannel } from "@/stores/use-config-store";
import { ModelScriptEditor } from "./model-script-editor";
import { ModelSelectModal } from "./model-select-modal";

type ScriptTarget = { name: string; capability: ModelCapability; value: string };
type ImageParamsTarget = { name: string; capability: ModelCapability };

export function ChannelEditorDrawer({ open, channel, onSave, onClose }: { open: boolean; channel: ModelChannel | null; onSave: (channel: ModelChannel) => void; onClose: () => void }) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<ModelChannel | null>(channel);
    const [selectOpen, setSelectOpen] = useState(false);
    const [scriptTarget, setScriptTarget] = useState<ScriptTarget | null>(null);
    const [imageParamsTarget, setImageParamsTarget] = useState<ImageParamsTarget | null>(null);
    const [sizeModeDraft, setSizeModeDraft] = useState<ImageSizeMode>("ratioOrPixels");
    const [pixelPresetsText, setPixelPresetsText] = useState("");
    const [aspectPresetsText, setAspectPresetsText] = useState("");
    const apiFormatOptions: Array<{ label: string; value: ApiCallFormat }> = [
        { label: "OpenAI", value: "openai" },
        { label: "Gemini", value: "gemini" },
    ];
    const capabilityOptions: Array<{ label: string; value: ModelCapability }> = ["image", "video", "text", "audio"].map((value) => ({ label: t(`config.channelEditor.capabilities.${value}`), value: value as ModelCapability }));

    useEffect(() => {
        if (open && channel) setDraft(channel);
    }, [open, channel]);

    if (!draft) return null;

    const patch = (value: Partial<ModelChannel>) => setDraft((current) => (current ? { ...current, ...value } : current));
    const setModels = (models: ChannelModel[]) => patch({ models });

    const changeApiFormat = (apiFormat: ApiCallFormat) => {
        const baseUrl = !draft.baseUrl.trim() || draft.baseUrl.trim() === defaultBaseUrlForApiFormat(draft.apiFormat) ? defaultBaseUrlForApiFormat(apiFormat) : draft.baseUrl;
        patch({ apiFormat, baseUrl });
    };

    const applySelection = (names: string[]) => {
        const map = new Map(draft.models.map((model) => [model.name, model]));
        setModels(names.map((name) => map.get(name) || { name, capability: guessCapability(name) }));
    };

    const setCapability = (name: string, capability: ModelCapability) => setModels(draft.models.map((model) => (model.name === name ? { ...model, capability } : model)));
    const setScript = (name: string, script: string) => setModels(draft.models.map((model) => (model.name === name ? { ...model, script: script || undefined } : model)));
    const removeModel = (name: string) => setModels(draft.models.filter((model) => model.name !== name));

    const openImageParams = (target: ImageParamsTarget) => {
        const entry = draft.models.find((model) => model.name === target.name);
        const params = entry?.imageParams || {};
        setSizeModeDraft(params.sizeMode || "ratioOrPixels");
        setPixelPresetsText((params.pixelPresets || []).join(", "));
        setAspectPresetsText((params.aspectPresets || []).join(", "));
        setImageParamsTarget(target);
    };
    const saveImageParams = () => {
        if (!imageParamsTarget) return;
        const splitList = (text: string) => text.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
        const presets = {
            ...(splitList(aspectPresetsText).length ? { aspectPresets: splitList(aspectPresetsText) } : {}),
            ...(splitList(pixelPresetsText).length ? { pixelPresets: splitList(pixelPresetsText) } : {}),
        };
        setModels(draft.models.map((model) => (model.name === imageParamsTarget!.name ? { ...model, imageParams: { sizeMode: sizeModeDraft, ...presets } } : model)));
        setImageParamsTarget(null);
    };
    const sizeModeOptions: Array<{ label: string; value: ImageSizeMode }> = (["auto", "ratio", "pixels", "ratioOrPixels"] as ImageSizeMode[]).map((value) => ({ value, label: t(`config.channelEditor.sizeMode.${value}`) }));

    const save = () => {
        onSave({ ...draft, name: draft.name.trim() || t("config.channels.unnamed"), models: normalizeChannelModels(draft.models) });
        onClose();
    };

    return (
        <Drawer
            open={open}
            width={640}
            title={t("config.channelEditor.title")}
            onClose={onClose}
            styles={{ body: { paddingTop: 16 } }}
            extra={
                <Space>
                    <Button onClick={onClose}>{t("common.cancel")}</Button>
                    <Button type="primary" onClick={save}>
                        {t("common.save")}
                    </Button>
                </Space>
            }
        >
            <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{t("config.channelEditor.name")}</span>
                    <Input value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm font-medium">{t("config.channelEditor.protocol")}</span>
                    <Select className="w-full" value={draft.apiFormat} options={apiFormatOptions} onChange={changeApiFormat} />
                </label>
                <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-medium">{t("config.channelEditor.baseUrl")}</span>
                    <Input value={draft.baseUrl} onChange={(event) => patch({ baseUrl: event.target.value })} placeholder="https://api.example.com" />
                </label>
                <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-medium">API Key</span>
                    <Input.Password value={draft.apiKey} onChange={(event) => patch({ apiKey: event.target.value })} placeholder="sk-..." />
                </label>
            </div>

            <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="text-sm font-semibold">{t("config.channelEditor.models")}</div>
                    <div className="mt-0.5 text-xs text-stone-500">{t("config.channelEditor.modelDescription", { count: draft.models.length })}</div>
                </div>
                <Button type="primary" icon={<ListPlus className="size-4" />} onClick={() => setSelectOpen(true)}>
                    {t("config.channelEditor.selectModels")}
                </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-stone-200 p-2 dark:border-stone-800">
                {draft.models.length ? (
                    draft.models.map((model) => (
                        <div key={model.name} className="flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-900/40">
                            <span className="min-w-0 flex-1 truncate text-sm" title={model.name}>
                                {model.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                                <Segmented size="small" value={model.capability} options={capabilityOptions} onChange={(value) => setCapability(model.name, value as ModelCapability)} />
                                {model.capability === "image" ? (
                                    <Button size="small" type={model.imageParams ? "primary" : "default"} ghost={Boolean(model.imageParams)} icon={<SlidersHorizontal className="size-3.5" />} onClick={() => openImageParams({ name: model.name, capability: model.capability })}>
                                        {t(model.imageParams ? "config.channelEditor.imageParamsReady" : "config.channelEditor.imageParams")}
                                    </Button>
                                ) : null}
                                <Button size="small" type={model.script ? "primary" : "default"} ghost={Boolean(model.script)} onClick={() => setScriptTarget({ name: model.name, capability: model.capability, value: model.script || "" })}>
                                    {t(model.script ? "config.channelEditor.scriptReady" : "config.channelEditor.script")}
                                </Button>
                                <Button size="small" danger type="text" icon={<Trash2 className="size-3.5" />} onClick={() => removeModel(model.name)} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="px-2 py-8 text-center text-sm text-stone-500">{t("config.channelEditor.empty")}</div>
                )}
            </div>

            <ModelSelectModal open={selectOpen} channel={draft} selectedNames={draft.models.map((model) => model.name)} onConfirm={applySelection} onClose={() => setSelectOpen(false)} />

            <Modal title={t("config.channelEditor.imageParamsModal.title")} open={Boolean(imageParamsTarget)} width={520} okText={t("common.save")} cancelText={t("common.cancel")} onOk={saveImageParams} onCancel={() => setImageParamsTarget(null)}>
                <div className="space-y-4 py-2">
                    <div>
                        <div className="mb-1 text-sm font-medium">{t("config.channelEditor.sizeMode.sizeModeLabel")}</div>
                        <Segmented block options={sizeModeOptions} value={sizeModeDraft} onChange={(value) => setSizeModeDraft(value as ImageSizeMode)} />
                        <div className="mt-1 text-xs text-stone-500">{t("config.channelEditor.imageParamsModal.hint")}</div>
                    </div>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">{t("config.channelEditor.imageParamsModal.pixelPresets")}</span>
                        <Input.TextArea rows={3} value={pixelPresetsText} onChange={(event) => setPixelPresetsText(event.target.value)} placeholder="1024x1024, 2048x2048, 3840x2160" />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium">{t("config.channelEditor.imageParamsModal.aspectPresets")}</span>
                        <Input.TextArea rows={2} value={aspectPresetsText} onChange={(event) => setAspectPresetsText(event.target.value)} placeholder="1:1, 16:9, 9:16" />
                    </label>
                </div>
            </Modal>

            <ModelScriptEditor
                open={Boolean(scriptTarget)}
                capability={scriptTarget?.capability || "text"}
                modelName={scriptTarget?.name || ""}
                value={scriptTarget?.value || ""}
                onSave={(script) => scriptTarget && setScript(scriptTarget.name, script)}
                onClose={() => setScriptTarget(null)}
            />
        </Drawer>
    );
}
