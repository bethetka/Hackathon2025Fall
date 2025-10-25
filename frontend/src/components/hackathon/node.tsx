import { nodeTypes } from "@/lib/nodes";
import { ChevronRight } from "lucide-react";
import React, { useState, useCallback, useEffect, useRef } from "react";

export type NodeType = string;

export interface INodeInfo {
    id: number;
    x: number;
    y: number;
    type: NodeType;
    fields: Record<string, object>;
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
    onNodeClicked: (id: number) => void;
    interactable: boolean;
}

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 150;
export const COLLISION_PADDING = 8;

export const Node: React.FC<INodeProps> = ({ info, workspaceInfo, onNodeDrag, onNodeClicked, interactable }) => {
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

    if (interactable) {
        const handleMouseMove = useCallback((e: MouseEvent) => {
            if (!isDragging) return;

            const screenDeltaX = e.clientX - initialMousePos.x;
            const screenDeltaY = e.clientY - initialMousePos.y;
            const distance = Math.sqrt(screenDeltaX ** 2 + screenDeltaY ** 2);

            if (distance > 5) {
                hasMovedRef.current = true;
            }

            const deltaX = screenDeltaX / workspaceInfo.zoom;
            const deltaY = screenDeltaY / workspaceInfo.zoom;
            onNodeDrag(info.id, initialNodePos.x + deltaX, initialNodePos.y + deltaY);
        }, [isDragging, initialMousePos, initialNodePos, info.id, onNodeDrag, workspaceInfo.zoom]);

        const handleMouseUp = useCallback(() => {
            setIsDragging(false);
        }, []);

        useEffect(() => {
            if (isDragging) {
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
        }, [isDragging, handleMouseMove, handleMouseUp]);
    }
    const nodeType = nodeTypes[info.type];

    return (
        <div
            className="absolute cursor-pointer pl-4 pr-4 pt-4 pb-4 select-none bg-white border-2 border-solid rounded-[12px] border-transparent font-medium hover:border-black"
            style={{
                top: info.y,
                left: info.x,
                width: `${NODE_WIDTH}px`,
                height: `${NODE_HEIGHT}px`,
            }}
            onMouseDown={interactable ? handleMouseDown : undefined}
            onClick={() => {
                if (!hasMovedRef.current && interactable) {
                    onNodeClicked(info.id);
                }
            }}
        >
            <div className="flex flex-row gap-2 items-center">
                <img width={32} src={nodeType.icon} className="pointer-events-none" />
                <p className="truncate">{nodeType.name}</p>
            </div>

            {interactable && <div className="absolute top-1/2 right-4 -translate-y-1/2">
                <ChevronRight />
            </div>}
        </div>
    );
};