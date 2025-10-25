import { Node, COLLISION_PADDING, NODE_HEIGHT, NODE_WIDTH, type INodeInfo, type IWorkspaceInfo } from "@/components/hackathon/node";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { NodeSettingsDrawer } from "./node-settings-drawer";
import { NodeSelector } from "./node-selector";

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
    const [nodeInfoDrawerOpen, setNodeInfoDrawerOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<INodeInfo | null>(null);
    const [nodeSelectorOpen, setNodeSelectorOpen] = useState(false);

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

    const handleNodeClicked = (id: number) => {
        setSelectedNode(nodes.find(i => i.id == id) || null);
        setNodeInfoDrawerOpen(true);
    }

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

    function handleNewNode(nodeType: string): void {
        const worldCenterX = (workspaceInfo.width / 2 - workspaceInfo.offsetX) / workspaceInfo.zoom;
        const worldCenterY = (workspaceInfo.height / 2 - workspaceInfo.offsetY) / workspaceInfo.zoom;
        setNodes((s) => [...s, { id: s.length + 1, type: nodeType, x: worldCenterX, y: worldCenterY, fields: {} }])
    }

    function handleSetFields(fields: Record<string, object>): void {
        nodes.find(i => i.id == selectedNode!.id)!.fields = fields;
    }

    return (
        <div
            style={{
                width: `${workspaceInfo.width}px`,
                height: `${workspaceInfo.height}px`,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: `12px`
            }}
            ref={self}
        >
            <NodeSettingsDrawer open={nodeInfoDrawerOpen} setOpen={setNodeInfoDrawerOpen} selectedNode={selectedNode} setFields={handleSetFields}/>
            <NodeSelector open={nodeSelectorOpen} setOpen={setNodeSelectorOpen} onSelected={handleNewNode} />
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
                    <Node interactable={true} info={i} key={i.id} workspaceInfo={workspaceInfo} onNodeDrag={handleNodeDrag} onNodeClicked={handleNodeClicked} />
                ))}
            </div>
        </div>
    );
};

export default NodeEditor;