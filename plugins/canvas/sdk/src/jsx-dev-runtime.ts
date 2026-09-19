// automatic JSX 的 dev 变体(编译器在 dev 模式会引用 jsxDEV)。转发到同一套 createElement。

import type * as React from "react";

import { getReact } from "./runtime";
import { Fragment } from "./jsx-runtime";

export { Fragment };
export type { JSX } from "./jsx-runtime";

export function jsxDEV(type: unknown, props: Record<string, unknown> | null, key?: unknown): React.ReactElement {
    const react = getReact();
    const resolvedType = type === Fragment ? react.Fragment : type;
    let config = key === undefined ? props : { ...(props ?? {}), key };
    // 同 jsx-runtime：静态多子节点数组补位置 key，避免 classic 转发误报（已有 key 的不动）。
    const children = (config as { children?: unknown } | null)?.children;
    if (Array.isArray(children) && children.some((child) => react.isValidElement(child) && (child as { key?: unknown }).key == null)) {
        config = {
            ...(config ?? {}),
            children: children.map((child, index) =>
                react.isValidElement(child) && (child as { key?: unknown }).key == null ? react.cloneElement(child as never, { key: `__static_${index}` } as never) : child,
            ),
        };
    }
    return react.createElement(resolvedType as never, config as never);
}
