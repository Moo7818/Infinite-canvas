import { type CanvasTheme } from "@/lib/canvas-theme";
import { resolveModelCustomParams, type AiConfig, type CustomParamControl, type CustomParamOption } from "@/stores/use-config-store";

function optionValue(option: CustomParamOption) {
    return typeof option === "string" ? option : option.value;
}
function optionLabel(option: CustomParamOption) {
    return typeof option === "string" ? option : option.label || option.value;
}

type ModelParamsPanelProps = {
    config: AiConfig;
    theme: CanvasTheme;
    onValueChange: (key: string, value: string) => void;
};

/** 按渠道模型声明的 customParams 动态渲染参数控件；模型未声明时返回 null。 */
export function ModelParamsPanel({ config, theme, onValueChange }: ModelParamsPanelProps) {
    const controls = resolveModelCustomParams(config, config.model);
    const values = config.customParams || {};
    if (!controls.length) return null;
    return (
        <div className="space-y-3">
            {controls.map((control) => (
                <ControlRow key={control.key} control={control} value={values[control.key] || ""} theme={theme} onChange={onValueChange} />
            ))}
        </div>
    );
}

export function customParamsSummary(config: AiConfig) {
    const controls = resolveModelCustomParams(config, config.model);
    if (!controls.length) return "";
    const values = config.customParams || {};
    return controls
        .map((control) => {
            const current = values[control.key] || "";
            const matched = control.type === "select" ? control.options.find((option) => optionValue(option) === current) : undefined;
            return `${control.label} ${matched ? optionLabel(matched) : current}`.trim();
        })
        .filter(Boolean)
        .join(" · ");
}

function ControlRow({ control, value, theme, onChange }: { control: CustomParamControl; value: string; theme: CanvasTheme; onChange: (key: string, value: string) => void }) {
    if (control.type === "select") {
        return (
            <div className="space-y-2">
                <div className="text-sm font-medium" style={{ color: theme.node.text }}>
                    {control.label}
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {control.options.map((option) => (
                        <button
                            key={optionValue(option)}
                            type="button"
                            className="h-9 cursor-pointer rounded-full border px-2 text-sm transition hover:opacity-80"
                            style={{ background: "transparent", borderColor: value === optionValue(option) ? theme.node.text : theme.node.stroke, color: theme.node.text }}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={() => onChange(control.key, optionValue(option))}
                        >
                            {optionLabel(option)}
                        </button>
                    ))}
                </div>
            </div>
        );
    }
    if (control.type === "number") {
        return (
            <label className="block">
                <span className="mb-1 block text-sm font-medium" style={{ color: theme.node.text }}>
                    {control.label}
                </span>
                <input
                    type="number"
                    value={value}
                    min={control.min}
                    max={control.max}
                    className="h-9 w-full rounded-full border px-3 text-sm outline-none"
                    style={{ borderColor: theme.node.stroke, color: theme.node.text, background: theme.node.fill }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onChange={(event) => onChange(control.key, event.target.value)}
                />
            </label>
        );
    }
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium" style={{ color: theme.node.text }}>
                {control.label}
            </span>
            <input
                type="text"
                value={value}
                placeholder={control.placeholder}
                className="h-9 w-full rounded-full border px-3 text-sm outline-none"
                style={{ borderColor: theme.node.stroke, color: theme.node.text, background: theme.node.fill }}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => onChange(control.key, event.target.value)}
            />
        </label>
    );
}