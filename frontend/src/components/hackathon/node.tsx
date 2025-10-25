import { nodeTypes } from "@/lib/nodes";
import { AlertCircle, ChevronRight } from "lucide-react";
import React, { useState, useCallback, useEffect, useRef } from "react";

export type NodeType = string;

export interface INodeInfo {
    id: number;
    x: number;
    y: number;
    type: NodeType;
    fields: Record<string, unknown>;
}

export interface IWorkspaceInfo {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    zoom: number;
}

export interface INodeProps {
    info: INodeInfo;
    workspaceInfo: IWorkspaceInfo;
    onNodeDrag: (id: number, x: number, y: number) => void;
    onNodeClicked: (id: number, e?: React.MouseEvent) => void;
    interactable: boolean;
    hasError?: boolean;
    isSelected?: boolean;
    isWithinMarquee?: boolean;
    isMarqueeSelecting?: boolean;
}

export const NODE_WIDTH = 320;
export const NODE_HEIGHT = 160;
export const COLLISION_PADDING = 8;

export const Node: React.FC<INodeProps> = ({ info, workspaceInfo, onNodeDrag, onNodeClicked, interactable, hasError, isSelected = false, isWithinMarquee = false, isMarqueeSelecting = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
    const [initialNodePos, setInitialNodePos] = useState({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setInitialMousePos({ x: e.clientX, y: e.clientY });
        setInitialNodePos({ x: info.x, y: info.y });
        hasMovedRef.current = false;
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !interactable) return;

        const screenDeltaX = e.clientX - initialMousePos.x;
        const screenDeltaY = e.clientY - initialMousePos.y;
        const distance = Math.sqrt(screenDeltaX ** 2 + screenDeltaY ** 2);

        if (distance > 5) {
            hasMovedRef.current = true;
        }

        const deltaX = screenDeltaX / workspaceInfo.zoom;
        const deltaY = screenDeltaY / workspaceInfo.zoom;
        onNodeDrag(info.id, initialNodePos.x + deltaX, initialNodePos.y + deltaY);
    }, [isDragging, interactable, initialMousePos, initialNodePos, info.id, onNodeDrag, workspaceInfo.zoom]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging && interactable) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        } else {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, interactable, handleMouseMove, handleMouseUp]);
    const nodeType = nodeTypes[info.type];

    return (
        <div
            className="absolute cursor-pointer select-none"
            style={{
                top: info.y,
                left: info.x,
                width: `${NODE_WIDTH}px`,
                height: `${NODE_HEIGHT}px`,
            }}
        >
            <div
                className={`relative flex h-full w-full flex-col rounded-[12px] border-2 border-solid bg-white font-medium transition-shadow ${hasError
                        ? "border-red-500"
                        : isWithinMarquee
                            ? "border-blue-500"
                            : `border-transparent ${!isMarqueeSelecting ? "hover:border-black" : ""}`
                    } ${isSelected ? "ring-2 ring-blue-500 ring-offset-white" : ""}`}
                onMouseDown={interactable ? handleMouseDown : undefined}
                onClick={(e) => {
                    if (!hasMovedRef.current && interactable) {
                        onNodeClicked(info.id, e);
                    }
                }}
            >
                <div className="flex flex-row items-center gap-2 px-4 pt-4 pb-2">
                    <img width={32} src={nodeType.icon} alt={`${nodeType.name} icon`} className="pointer-events-none" />
                    <p className="truncate">{nodeType.name}</p>
                </div>

                {hasError && (
                    <div className="absolute top-2 right-2 text-red-500">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                )}

                {interactable && (
                    <div className="absolute top-1/2 right-4 -translate-y-1/2">
                        <ChevronRight />
                    </div>
                )}
            </div>
        </div>
    );
};
