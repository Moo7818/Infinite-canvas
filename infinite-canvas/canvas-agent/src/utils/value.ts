export type JsonRecord = Record<string, unknown>;

/** 安全读取未知对象中的指定字段。 */
export function field(value: unknown, key: string) {
    return value && typeof value === "object" ? (value as JsonRecord)[key] : undefined;
}

/** 将未知异常转换为可展示的错误信息。 */
export function errorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null) {
        const record = error as Record<string, unknown>;
        return String(record.message || JSON.stringify(error).slice(0, 500));
    }
    return String(error);
}
