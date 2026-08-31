import { Button, Drawer, Input, Modal, Segmented, Select, Space } from "antd";
import { ListPlus, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { defaultBaseUrlForApiFormat, guessCapability, normalizeChannelModels, type ApiCallFormat, type ChannelModel, type CustomParamControl, type CustomParamOption, type ModelCapability, type ModelChannel } from "@/stores/use-config-store";
import { ModelScriptEditor } from "./model-script-editor";
import { ModelSelectModal } from "./model-select-modal";

type ScriptTarget = { name: string; capability: ModelCapability; value: string };
type CustomParamsTarget = { name: string };
type CustomDraftRow = { key: string; label: string; type: "select" | "number" | "text"; optionsText: string };

export function ChannelEditorDrawer({ open, channel, onSave, onClose }: { open: boolean; channel: ModelChannel | null; onSave: (channel: ModelChannel) => void; onClose: () => void }) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<ModelChannel | null>(channel);
    const [selectOpen, setSelectOpen] = useState(false);
    const [scriptTarget, setScriptTarget] = useState<ScriptTarget | null>(null);
    const [customTarget, setCustomTarget] = useState<CustomParamsTarget | null>(null);
    const [customDraft, setCustomDraft] = useState<CustomDraftRow[]>([]);
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

    const openCustomParams = (name: string) => {
        const model = draft.models.find((item) => item.name === name);
        setCustomDraft((model?.customParams || []).map((control) => ({
            key: control.key,
            label: control.label,
            type: control.type,
            optionsText: control.type === "select" ? control.options.join(", ") : "",
        })));
        setCustomTarget({ name });
    };
    const patchCustomDraft = (index: number, row: Partial<CustomDraftRow>) => setCustomDraft((current) => current.map((item, i) => (i === index ? { ...item, ...row } : item)));
    const addCustomDraftRow = () => setCustomDraft((current) => [...current, { key: "", label: "", type: "select", optionsText: "" }]);
    const removeCustomDraftRow = (index: number) => setCustomDraft((current) => current.filter((_, i) => i !== index));
    const saveCustomParams = () => {
        if (!customTarget) return;
        const controls: CustomParamControl[] = customDraft
            .map((row): CustomParamControl | null => {
                const key = row.key.trim();
                const label = row.label.trim();
                if (!key || !label) return null;
                if (row.type === "select") {
                    const options: CustomParamOption[] = row.optionsText
                        .split(/[,，\n]/)
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .map((item) => {
                            const match = item.match(/^([^=]+)=(.*)$/);
                            return match ? { label: match[1].trim(), value: match[2].trim() } : item;
                        });
                    return options.length ? { key, label, type: "select", options } : null;
                }
                return { key, label, type: row.type };
            })
            .filter((control): control is CustomParamControl => Boolean(control));
        setModels(draft.models.map((model) => (model.name === customTarget!.name ? { ...model, customParams: controls.length ? controls : undefined } : model)));
        setCustomTarget(null);
    };

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
                                <Button size="small" type={model.customParams ? "primary" : "default"} ghost={Boolean(model.customParams)} icon={<SlidersHorizontal className="size-3.5" />} onClick={() => openCustomParams(model.name)}>
                                    {t(model.customParams ? "config.channelEditor.customParamsReady" : "config.channelEditor.customParams")}
                                </Button>
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

            <Modal title={t("config.channelEditor.customParamsModal.title")} open={Boolean(customTarget)} width={620} okText={t("common.save")} cancelText={t("common.cancel")} onOk={saveCustomParams} onCancel={() => setCustomTarget(null)}>
                <div className="space-y-3 py-2">
                    <div className="text-xs text-stone-500">{t("config.channelEditor.customParamsModal.hint")}</div>
                    {customDraft.map((row, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 p-2 dark:border-stone-800">
                            <Select
                                size="small"
                                className="w-28"
                                value={row.type}
                                options={[
                                    { value: "select", label: t("config.channelEditor.customParamsModal.types.select") },
                                    { value: "number", label: t("config.channelEditor.customParamsModal.types.number") },
                                    { value: "text", label: t("config.channelEditor.customParamsModal.types.text") },
                                ]}
                                onChange={(value) => patchCustomDraft(index, { type: value })}
                            />
                            <Input size="small" className="w-36" value={row.key} placeholder={t("config.channelEditor.customParamsModal.key")} onChange={(event) => patchCustomDraft(index, { key: event.target.value })} />
                            <Input size="small" className="min-w-32 flex-1" value={row.label} placeholder={t("config.channelEditor.customParamsModal.label")} onChange={(event) => patchCustomDraft(index, { label: event.target.value })} />
                            {row.type === "select" ? (
                                <Input size="small" className="w-full" value={row.optionsText} placeholder={t("config.channelEditor.customParamsModal.options")} onChange={(event) => patchCustomDraft(index, { optionsText: event.target.value })} />
                            ) : null}
                            <Button size="small" danger type="text" icon={<X className="size-3.5" />} onClick={() => removeCustomDraftRow(index)} />
                        </div>
                    ))}
                    <Button type="dashed" block icon={<Plus className="size-3.5" />} onClick={addCustomDraftRow}>
                        {t("config.channelEditor.customParamsModal.add")}
                    </Button>
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
