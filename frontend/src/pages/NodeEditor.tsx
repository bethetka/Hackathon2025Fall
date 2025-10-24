import { nodes } from "@/lib/nodes";
import { ChevronRight } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

type NodeType = string;

interface INodeInfo {
    id: number;
    x: number;
    y: number;
    type: NodeType;
}

interface IWorkspaceInfo {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    zoom: number;
}

interface INodeProps {
    info: INodeInfo;
    workspaceInfo: IWorkspaceInfo;
    onNodeDrag: (id: number, x: number, y: number) => void;
}

const NODE_WIDTH = 300;
const NODE_HEIGHT = 150;
const COLLISION_PADDING = 8;

const Node: React.FC<INodeProps> = ({ info, workspaceInfo, onNodeDrag }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
    const [initialNodePos, setInitialNodePos] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setInitialMousePos({ x: e.clientX, y: e.clientY });
        setInitialNodePos({ x: info.x, y: info.y });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            const deltaX = (e.clientX - initialMousePos.x) / workspaceInfo.zoom;
            const deltaY = (e.clientY - initialMousePos.y) / workspaceInfo.zoom;
            onNodeDrag(info.id, initialNodePos.x + deltaX, initialNodePos.y + deltaY);
        }
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
    const nodeType = nodes[info.type];
    return (
        <div
            className={`absolute cursor-pointer pl-4 pr-4 pt-4 pb-4 select-none bg-white border-2 border-solid rounded-[12px] border-transparent font-medium hover:border-black`}
            style={{
                top: info.y,
                left: info.x,
                width: `${NODE_WIDTH}px`,
                height: `${NODE_HEIGHT}px`,
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="flex flex-row gap-2 items-center">
                <img width={32} src={nodeType.icon} className="pointer-events-none" />
                <p className="truncate">{nodeType.name}</p>
            </div>

            <div className="absolute top-1/2 right-4 -translate-y-1/2">
                <ChevronRight />
            </div>
        </div>
    );
};

function snapToGrid(x: number, y: number, gridSize = 1, gridSizeY = gridSize) {
  const snap = (value: number, size: number) => 
    size ? Math.round(value / Math.abs(size)) * Math.abs(size) : value;
  
  return {
    x: snap(x, gridSize),
    y: snap(y, gridSizeY)
  };
}

const NodeEditor: React.FC = () => {
    const BOUND_SCALE = 3;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 4;

    const [workspaceInfo, setWorkspaceInfo] = useState<IWorkspaceInfo>(() => {
        const width = 1366;
        const height = 768;
        return {
            width,
            height,
            offsetX: (width - width * BOUND_SCALE) / 2,
            offsetY: (height - height * BOUND_SCALE) / 2,
            zoom: 1,
        };
    });

    const [nodes, setNodes] = useState<INodeInfo[]>([]);
    const [isPanning, setIsPanning] = useState(false);
    const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
    const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });
    const self = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setNodes([
            {
                id: 1,
                type: "redis",
                x: (workspaceInfo.width * BOUND_SCALE) / 2 - 200,
                y: (workspaceInfo.height * BOUND_SCALE) / 2,
            },
            {
                id: 2,
                type: "mongo",
                x: (workspaceInfo.width * BOUND_SCALE) / 2 + 100,
                y: (workspaceInfo.height * BOUND_SCALE) / 2 + 80,
            },
        ]);
    }, []);

    const handleNodeDrag = (id: number, x: number, y: number) => {
        let newX = x;
        let newY = y;

        let snapped = snapToGrid(newX, newY, 40);
        newX = snapped.x;
        newY = snapped.y;

        const draggedNode = nodes.find(node => node.id === id);
        if (!draggedNode) return;

        for (const otherNode of nodes) {
            if (otherNode.id === id) continue;

            const draggedLeft = newX - COLLISION_PADDING;
            const draggedRight = newX + NODE_WIDTH + COLLISION_PADDING;
            const draggedTop = newY - COLLISION_PADDING;
            const draggedBottom = newY + NODE_HEIGHT + COLLISION_PADDING;

            const otherLeft = otherNode.x;
            const otherRight = otherNode.x + NODE_WIDTH;
            const otherTop = otherNode.y;
            const otherBottom = otherNode.y + NODE_HEIGHT;

            const isColliding =
                draggedRight > otherLeft &&
                draggedLeft < otherRight &&
                draggedBottom > otherTop &&
                draggedTop < otherBottom;

            if (isColliding) {
                const overlapX = Math.min(draggedRight, otherRight) - Math.max(draggedLeft, otherLeft);
                const overlapY = Math.min(draggedBottom, otherBottom) - Math.max(draggedTop, otherTop);

                if (overlapX < overlapY) {
                    if (draggedNode.x < otherNode.x) {
                        newX -= overlapX;
                    } else {
                        newX += overlapX;
                    }
                } else {
                    if (draggedNode.y < otherNode.y) {
                        newY -= overlapY;
                    } else {
                        newY += overlapY;
                    }
                }
            }
        }

        setNodes((prevNodes) =>
            prevNodes.map((node) => (node.id === id ? { ...node, x: newX, y: newY } : node))
        );
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsPanning(true);
        setInitialMousePos({ x: e.clientX, y: e.clientY });
        setInitialOffset({ x: workspaceInfo.offsetX, y: workspaceInfo.offsetY });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isPanning) {
            const deltaX = e.clientX - initialMousePos.x;
            const deltaY = e.clientY - initialMousePos.y;
            const newOffsetX = initialOffset.x + deltaX;
            const newOffsetY = initialOffset.y + deltaY;

            const worldWidth = workspaceInfo.width * BOUND_SCALE;
            const worldHeight = workspaceInfo.height * BOUND_SCALE;
            const minOffsetX = workspaceInfo.width - worldWidth * workspaceInfo.zoom;
            const minOffsetY = workspaceInfo.height - worldHeight * workspaceInfo.zoom;
            const maxOffsetX = 0;
            const maxOffsetY = 0;

            setWorkspaceInfo((prev) => ({
                ...prev,
                offsetX: Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX)),
                offsetY: Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY)),
            }));
        }
    }, [isPanning, initialMousePos, initialOffset, workspaceInfo]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    useEffect(() => {
        if (isPanning) {
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
    }, [isPanning, handleMouseMove, handleMouseUp]);

    const handleScroll = useCallback((e: WheelEvent) => {
        e.preventDefault();
        if (!self.current) return;

        const rect = self.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldZoom = workspaceInfo.zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom + e.deltaY * -0.001));

        const worldX = (mouseX - workspaceInfo.offsetX) / oldZoom;
        const worldY = (mouseY - workspaceInfo.offsetY) / oldZoom;

        let newOffsetX = mouseX - worldX * newZoom;
        let newOffsetY = mouseY - worldY * newZoom;

        const worldWidth = workspaceInfo.width * BOUND_SCALE;
        const worldHeight = workspaceInfo.height * BOUND_SCALE;
        const minOffsetX = workspaceInfo.width - worldWidth * newZoom;
        const minOffsetY = workspaceInfo.height - worldHeight * newZoom;
        const maxOffsetX = 0;
        const maxOffsetY = 0;

        newOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX));
        newOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY));

        setWorkspaceInfo((state) => ({
            ...state,
            zoom: newZoom,
            offsetX: newOffsetX,
            offsetY: newOffsetY,
        }));
    }, [workspaceInfo]);


    useEffect(() => {
        const currentRef = self.current;
        if (currentRef) {
            currentRef.addEventListener("wheel", handleScroll, { passive: false });
        }
        return () => {
            if (currentRef) {
                currentRef.removeEventListener("wheel", handleScroll);
            }
        }
    }, [self, handleScroll])

    return (
        <div
            style={{
                width: `${workspaceInfo.width}px`,
                height: `${workspaceInfo.height}px`,
                position: 'relative',
                overflow: 'hidden',
                
            }}
            ref={self}
        >
            <div
                style={{
                    width: `${workspaceInfo.width * BOUND_SCALE}px`,
                    height: `${workspaceInfo.height * BOUND_SCALE}px`,
                    position: 'relative',
                    transformOrigin: '0 0',
                    transform: `translate(${workspaceInfo.offsetX}px, ${workspaceInfo.offsetY}px) scale(${workspaceInfo.zoom})`,
                    cursor: isPanning ? 'grabbing' : 'grab',
                    background: "#f1f1f1",
                    backgroundImage: "radial-gradient(black 2px, transparent 0)",
                    backgroundSize: "40px 40px",
                }}
                onMouseDown={handleMouseDown}
            >
                {nodes.map((i) => (
                    <Node info={i} key={i.id} workspaceInfo={workspaceInfo} onNodeDrag={handleNodeDrag} />
                ))}
            </div>
        </div>
    );
};

export default NodeEditor;