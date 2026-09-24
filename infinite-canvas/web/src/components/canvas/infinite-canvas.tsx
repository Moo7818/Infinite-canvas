import React, { useEffect, useRef, useState } from "react";

import { canvasThemes, type CanvasBackgroundMode } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { ViewportTransform } from "@/types/canvas";

type InfiniteCanvasProps = {
    containerRef: React.RefObject<HTMLDivElement | null>;
    viewport: ViewportTransform;
    tool: "select" | "pan";
    backgroundMode?: CanvasBackgroundMode;
    onViewportChange: (viewport: ViewportTransform) => void;
    onCanvasMouseDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    onCanvasDeselect?: () => void;
    onCanvasDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
    children: React.ReactNode;
};

export function InfiniteCanvas({ containerRef, viewport, tool, backgroundMode = "lines", onViewportChange, onCanvasMouseDown, onCanvasDeselect, onCanvasDoubleClick, onContextMenu, onDrop, children }: InfiniteCanvasProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const panState = useRef({
        isPanning: false,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        hasMoved: false,
        startedOnBackground: false,
    });
    const scaleRef = useRef(viewport.k);
    const viewportRef = useRef(viewport);
    const frameRef = useRef<number | null>(null);
    const wheelFrameRef = useRef<number | null>(null);
    const viewportCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingWheelRef = useRef<{ delta: number; clientX: number; clientY: number } | null>(null);
    const nextViewportRef = useRef<ViewportTransform | null>(null);
    const worldRef = useRef<HTMLDivElement | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const onViewportChangeRef = useRef(onViewportChange);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isControlPressed, setIsControlPressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);

    const applyViewportToDom = React.useCallback((next: ViewportTransform) => {
        viewportRef.current = next;
        scaleRef.current = next.k;

        const world = worldRef.current;
        if (world) world.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.k})`;

        const grid = gridRef.current;
        if (grid) {
            const gridSize = 48 * next.k;
            grid.style.backgroundSize = `${gridSize}px ${gridSize}px`;
            grid.style.backgroundPosition = `${next.x % gridSize}px ${next.y % gridSize}px`;
        }
    }, []);

    const commitViewport = React.useCallback(() => {
        if (viewportCommitTimerRef.current) {
            clearTimeout(viewportCommitTimerRef.current);
            viewportCommitTimerRef.current = null;
        }
        onViewportChangeRef.current(viewportRef.current);
    }, []);

    const scheduleViewportCommit = React.useCallback(() => {
        if (viewportCommitTimerRef.current) return;
        viewportCommitTimerRef.current = setTimeout(() => {
            viewportCommitTimerRef.current = null;
            onViewportChangeRef.current(viewportRef.current);
        }, 100);
    }, []);

    useEffect(() => {
        onViewportChangeRef.current = onViewportChange;
    }, [onViewportChange]);

    useEffect(() => {
        if (viewport.x === viewportRef.current.x && viewport.y === viewportRef.current.y && viewport.k === viewportRef.current.k) return;
        applyViewportToDom(viewport);
    }, [applyViewportToDom, viewport]);

    useEffect(
        () => () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            if (wheelFrameRef.current) cancelAnimationFrame(wheelFrameRef.current);
            if (viewportCommitTimerRef.current) clearTimeout(viewportCommitTimerRef.current);
        },
        [],
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Control") setIsControlPressed(true);
            if (event.code !== "Space") return;
            const target = event.target instanceof Element ? event.target : null;
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || target?.closest("[contenteditable='true']")) return;
            event.preventDefault();
            setIsSpacePressed(true);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === "Space") {
                const target = event.target instanceof Element ? event.target : null;
                if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || target?.closest("[contenteditable='true']"))) event.preventDefault();
                setIsSpacePressed(false);
            }
            if (event.key === "Control") setIsControlPressed(false);
        };

        const handleBlur = () => {
            setIsSpacePressed(false);
            setIsControlPressed(false);
            panState.current.isPanning = false;
            setIsPanning(false);
            document.body.style.cursor = "";
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("[data-canvas-no-zoom],.ant-modal,.ant-popover,.ant-dropdown,.ant-select-dropdown,.ant-picker-dropdown")) return;

        const pending = pendingWheelRef.current;
        pendingWheelRef.current = {
            delta: (pending?.delta || 0) - event.deltaY,
            clientX: event.clientX,
            clientY: event.clientY,
        };
        if (wheelFrameRef.current) return;

        wheelFrameRef.current = requestAnimationFrame(() => {
            wheelFrameRef.current = null;
            const wheel = pendingWheelRef.current;
            pendingWheelRef.current = null;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!wheel || !rect) return;

            const currentViewport = viewportRef.current;
            const factor = Math.pow(1.1, wheel.delta / 100);
            const newScale = Math.min(Math.max(currentViewport.k * factor, 0.05), 5);
            const mouseX = wheel.clientX - rect.left;
            const mouseY = wheel.clientY - rect.top;
            const worldX = (mouseX - currentViewport.x) / currentViewport.k;
            const worldY = (mouseY - currentViewport.y) / currentViewport.k;
            const nextViewport = {
                x: mouseX - worldX * newScale,
                y: mouseY - worldY * newScale,
                k: newScale,
            };

            applyViewportToDom(nextViewport);
            scheduleViewportCommit();
        });
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("[data-canvas-no-zoom]")) return;
        if (target?.closest("[data-connection-create-menu]")) return;
        const isBackgroundClick = !target?.closest("[data-node-id],[data-connection-id]");
        const temporaryTool = event.ctrlKey || isSpacePressed;
        const activeTool = temporaryTool ? (tool === "select" ? "pan" : "select") : tool;
        const shouldPan = event.button === 1 || (event.button === 0 && activeTool === "pan" && isBackgroundClick);

        if (shouldPan) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            panState.current = {
                isPanning: true,
                startX: event.clientX,
                startY: event.clientY,
                initialX: viewportRef.current.x,
                initialY: viewportRef.current.y,
                hasMoved: false,
                startedOnBackground: isBackgroundClick,
            };
            setIsPanning(true);
            document.body.style.cursor = "grabbing";
            return;
        }

        if (event.button === 0 && isBackgroundClick) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onCanvasMouseDown?.(event);
        }
    };

    const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("[data-canvas-no-zoom],[data-node-id],[data-connection-id]")) return;
        onCanvasDoubleClick?.(event);
    };

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (!panState.current.isPanning) return;

            const dx = event.clientX - panState.current.startX;
            const dy = event.clientY - panState.current.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                panState.current.hasMoved = true;
            }

            nextViewportRef.current = {
                x: panState.current.initialX + dx,
                y: panState.current.initialY + dy,
                k: scaleRef.current,
            };
            if (frameRef.current) return;
            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;
                if (nextViewportRef.current) {
                    applyViewportToDom(nextViewportRef.current);
                    scheduleViewportCommit();
                }
            });
        };

        const handlePointerUp = () => {
            if (!panState.current.isPanning) return;

            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
                if (nextViewportRef.current) applyViewportToDom(nextViewportRef.current);
            }

            if (!panState.current.hasMoved && panState.current.startedOnBackground) {
                onCanvasDeselect?.();
            }
            if (panState.current.hasMoved) commitViewport();
            nextViewportRef.current = null;
            panState.current.isPanning = false;
            setIsPanning(false);
            document.body.style.cursor = "";
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            document.body.style.cursor = "";
        };
    }, [applyViewportToDom, commitViewport, onCanvasDeselect, scheduleViewportCommit]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Prevent canvas scrolling from moving the page while preserving native scrolling inside overlays and dialogs.
        const preventWheelScroll = (event: WheelEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-canvas-no-zoom],.ant-modal,.ant-popover,.ant-dropdown,.ant-select-dropdown,.ant-picker-dropdown")) return;
            event.preventDefault();
        };
        container.addEventListener("wheel", preventWheelScroll, { passive: false });
        return () => container.removeEventListener("wheel", preventWheelScroll);
    }, [containerRef]);

    const temporaryTool = isControlPressed || isSpacePressed;
    const activeTool = temporaryTool ? (tool === "select" ? "pan" : "select") : tool;
    const cursor = isPanning ? "grabbing" : activeTool === "pan" ? "grab" : undefined;

    return (
        <div
            ref={containerRef}
            className="relative h-full w-full select-none overflow-hidden"
            style={{ background: theme.canvas.background, cursor }}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onContextMenu={onContextMenu}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
        >
            <CanvasGrid gridRef={gridRef} viewport={viewport} mode={backgroundMode} />
            <div
                ref={worldRef}
                className="absolute origin-top-left"
                style={{
                    transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.k})`,
                    willChange: "transform",
                }}
            >
                {children}
            </div>
        </div>
    );
}

function CanvasGrid({ gridRef, viewport, mode }: { gridRef: React.RefObject<HTMLDivElement | null>; viewport: ViewportTransform; mode: CanvasBackgroundMode }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    if (mode === "blank") return null;

    const gridSize = 48 * viewport.k;
    const x = viewport.x % gridSize;
    const y = viewport.y % gridSize;
    const dotSize = viewport.k < 0.12 ? 0.8 : 1.15;
    const backgroundImage =
        mode === "dots" ? `radial-gradient(circle, ${theme.canvas.dot} ${dotSize}px, transparent ${dotSize + 0.2}px)` : `linear-gradient(${theme.canvas.line} 1px, transparent 1px), linear-gradient(90deg, ${theme.canvas.line} 1px, transparent 1px)`;

    return (
        <div
            ref={gridRef}
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
                backgroundImage,
                backgroundSize: `${gridSize}px ${gridSize}px`,
                backgroundPosition: `${x}px ${y}px`,
            }}
        />
    );
}
