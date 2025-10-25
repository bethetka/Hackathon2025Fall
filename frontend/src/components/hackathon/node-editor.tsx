import { Node, COLLISION_PADDING, NODE_HEIGHT, NODE_WIDTH, type INodeInfo, type IWorkspaceInfo } from "@/components/hackathon/node";
import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { NodeSettingsDrawer } from "./node-settings-drawer";
import { NodeSelector } from "./node-selector";
import { nodeTypes } from "@/lib/nodes";
import * as z from "zod";

function snapToGrid(x: number, y: number, gridSize = 1, gridSizeY = gridSize) {
    const snap = (value: number, size: number) =>
        size ? Math.round(value / Math.abs(size)) * Math.abs(size) : value;

    return {
        x: snap(x, gridSize),
        y: snap(y, gridSizeY)
    };
}

export interface NodeEditorHandle {
    serialize: () => INodeInfo[];
    deserialize: (nodes: INodeInfo[]) => void;
}

const NodeEditor = forwardRef<NodeEditorHandle>((_props, ref) => {
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
    const [nodeValidationErrors, setNodeValidationErrors] = useState<Record<number, z.ZodError>>({});
    
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<number>>(new Set());
    const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
    const [nodesWithinMarquee, setNodesWithinMarquee] = useState<Set<number>>(new Set());

    const handleNodeDrag = (id: number, x: number, y: number) => {
        let newX = x;
        let newY = y;

        const snapped = snapToGrid(newX, newY, 40);
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

    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        if (!self.current) return { x: 0, y: 0 };
        const rect = self.current.getBoundingClientRect();
        const x = (screenX - rect.left - workspaceInfo.offsetX) / workspaceInfo.zoom;
        const y = (screenY - rect.top - workspaceInfo.offsetY) / workspaceInfo.zoom;
        return { x, y };
    }, [workspaceInfo.offsetX, workspaceInfo.offsetY, workspaceInfo.zoom]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.ctrlKey || e.metaKey) {
            setIsMarqueeSelecting(true);
            const worldPos = screenToWorld(e.clientX, e.clientY);
            setMarqueeStart(worldPos);
            setMarqueeRect({ 
                x: worldPos.x, 
                y: worldPos.y, 
                width: 0, 
                height: 0 
            });
            setSelectedNodeIds(new Set());
        } else {
            setIsPanning(true);
            setInitialMousePos({ x: e.clientX, y: e.clientY });
            setInitialOffset({ x: workspaceInfo.offsetX, y: workspaceInfo.offsetY });
        }
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
        } else if (isMarqueeSelecting && marqueeStart && self.current) {
                const currentWorldPos = screenToWorld(e.clientX, e.clientY);
            
            const newMarqueeRect = {
                x: Math.min(marqueeStart.x, currentWorldPos.x),
                y: Math.min(marqueeStart.y, currentWorldPos.y),
                width: Math.abs(currentWorldPos.x - marqueeStart.x),
                height: Math.abs(currentWorldPos.y - marqueeStart.y)
            };
            setMarqueeRect(newMarqueeRect);

            const newNodesWithinMarquee = new Set<number>();
            nodes.forEach(node => {
                const nodeLeft = node.x;
                const nodeRight = node.x + NODE_WIDTH;
                const nodeTop = node.y;
                const nodeBottom = node.y + NODE_HEIGHT;
                
                const marqueeLeft = newMarqueeRect.x;
                const marqueeRight = newMarqueeRect.x + newMarqueeRect.width;
                const marqueeTop = newMarqueeRect.y;
                const marqueeBottom = newMarqueeRect.y + newMarqueeRect.height;
                
                const intersects = !(nodeRight < marqueeLeft || 
                                   nodeLeft > marqueeRight || 
                                   nodeBottom < marqueeTop || 
                                   nodeTop > marqueeBottom);
                
                if (intersects) {
                    newNodesWithinMarquee.add(node.id);
                }
            });
            setNodesWithinMarquee(newNodesWithinMarquee);
        }
    }, [isPanning, isMarqueeSelecting, initialMousePos, initialOffset, workspaceInfo, marqueeStart, screenToWorld, nodes]);

    const handleMouseUp = useCallback(() => {
        if (isPanning) {
            setIsPanning(false);
        } else if (isMarqueeSelecting) {
            if (marqueeRect && self.current) {
                if (Math.abs(marqueeRect.width) > 2 || Math.abs(marqueeRect.height) > 2) {
                    const selectedIds = new Set<number>();
                    
                    nodes.forEach(node => {
                        const nodeLeft = node.x;
                        const nodeRight = node.x + NODE_WIDTH;
                        const nodeTop = node.y;
                        const nodeBottom = node.y + NODE_HEIGHT;
                        
                        const marqueeLeft = marqueeRect.x;
                        const marqueeRight = marqueeRect.x + marqueeRect.width;
                        const marqueeTop = marqueeRect.y;
                        const marqueeBottom = marqueeRect.y + marqueeRect.height;
                        
                        const intersects = !(nodeRight < marqueeLeft || 
                                          nodeLeft > marqueeRight || 
                                          nodeBottom < marqueeTop || 
                                          nodeTop > marqueeBottom);
                        
                        if (intersects) {
                            selectedIds.add(node.id);
                        }
                    });
                    
                    if ((window.event as MouseEvent)?.ctrlKey || (window.event as MouseEvent)?.metaKey) {
                        const newSelection = new Set([...selectedNodeIds, ...selectedIds]);
                        setSelectedNodeIds(newSelection);
                    } else {
                        setSelectedNodeIds(selectedIds);
                    }
                }
            }
            
            setIsMarqueeSelecting(false);
            setMarqueeRect(null);
            setMarqueeStart(null);
            setNodesWithinMarquee(new Set());
        }
    }, [isPanning, isMarqueeSelecting, marqueeRect, nodes, selectedNodeIds]);

    useEffect(() => {
        if (isPanning || isMarqueeSelecting) {
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
    }, [isPanning, isMarqueeSelecting, handleMouseMove, handleMouseUp]);

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

    const handleNodeClicked = (id: number, e?: React.MouseEvent) => {
        if (e && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            
            setSelectedNodeIds(prev => {
                const newSelection = new Set(prev);
                if (newSelection.has(id)) {
                    newSelection.delete(id);
                } else {
                    newSelection.add(id);
                }
                return newSelection;
            });
        } else {
            setSelectedNode(nodes.find(i => i.id == id) || null);
            setNodeInfoDrawerOpen(true);
        }
    }

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isMarqueeSelecting && !e.ctrlKey && !e.metaKey) {
            setSelectedNodeIds(new Set());
        }
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
        setNodes(prevNodes =>
            prevNodes.map(node =>
                node.id === selectedNode!.id ? { ...node, fields } : node
            )
        );
    }

    const serialize = () => {
        const errors: Record<number, z.ZodError> = {};
        let hasErrors = false;

        for (const node of nodes) {
            const nodeType = nodeTypes[node.type];
            if (!nodeType || !nodeType.parameters) continue;

            try {
                nodeType.parameters.parse(node.fields);
            } catch (e) {
                if (e instanceof z.ZodError) {
                    errors[node.id] = e;
                    hasErrors = true;
                }
            }
        }

        setNodeValidationErrors(errors);

        if (hasErrors) {
            const errorMessages = Object.entries(errors).map(([id, err]) => {
                return `Node ${id}: ${err.issues.map(e => e.message).join(', ')}`;
            });
            throw new Error(`Validation errors:\n${errorMessages.join('\n')}`);
        }

        return [...nodes];
    };

    const deserialize = (data: INodeInfo[]) => {
        const errors: string[] = [];
        for (const node of data) {
            if (typeof node.id !== 'number' || typeof node.type !== 'string' || !node.fields) {
                errors.push(`Invalid node structure: ${JSON.stringify(node)}`);
                continue;
            }

            const nodeType = nodeTypes[node.type];
            if (!nodeType) {
                errors.push(`Unknown node type: ${node.type}`);
                continue;
            }

            try {
                nodeType.parameters.parse(node.fields);
            } catch (e) {
                if (e instanceof z.ZodError) {
                    errors.push(`Node ${node.id}: ${e.issues.map(err => err.message).join(', ')}`);
                }
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }

        setNodes(data);
        setNodeValidationErrors({});
    };

    useImperativeHandle(ref, () => ({
        serialize,
        deserialize
    }), [nodes, setNodes]);

    function handleDeleteNode(id: number): void {
        setNodes((ns) => ns.filter(i => i.id !== id))
    }

    return (
        <>
            <NodeSettingsDrawer open={nodeInfoDrawerOpen} setOpen={setNodeInfoDrawerOpen} selectedNode={selectedNode} setFields={handleSetFields} deleteNode={handleDeleteNode}/>
            <NodeSelector open={nodeSelectorOpen} setOpen={setNodeSelectorOpen} onSelected={handleNewNode} />
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
                    onClick={handleCanvasClick}
                >
                    {nodes.map((i) => (
                        <Node 
                            interactable={true} 
                            info={i} 
                            key={i.id} 
                            workspaceInfo={workspaceInfo} 
                            onNodeDrag={handleNodeDrag} 
                            onNodeClicked={handleNodeClicked}
                            hasError={nodeValidationErrors[i.id] !== undefined}
                            isSelected={selectedNodeIds.has(i.id)}
                            isWithinMarquee={nodesWithinMarquee.has(i.id)}
                            isMarqueeSelecting={isMarqueeSelecting}
                        />
                    ))}
                    
                    {/* Marquee selection rectangle */}
                    {marqueeRect && (
                        <div
                            className="absolute border-2 border-blue-500 pointer-events-none"
                            style={{
                                left: `${marqueeRect.x}px`,
                                top: `${marqueeRect.y}px`,
                                width: `${marqueeRect.width}px`,
                                height: `${marqueeRect.height}px`,
                                backgroundColor: 'rgba(0, 150, 255, 0.1)',
                            }}
                        />
                    )}
                </div>
            </div>
        </>
    );
});

export default NodeEditor;