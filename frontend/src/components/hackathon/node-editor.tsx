import { Node, COLLISION_PADDING, NODE_HEIGHT, NODE_WIDTH, type INodeInfo, type IWorkspaceInfo } from "@/components/hackathon/node";
import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
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

    const computeValidation = useCallback((nodesToValidate: INodeInfo[]) => {
        const errors: Record<number, z.ZodError> = {};
        const messages: string[] = [];

        for (const node of nodesToValidate) {
            const nodeType = nodeTypes[node.type];
            if (!nodeType || !nodeType.parameters) continue;

            try {
                nodeType.parameters.parse(node.fields);
            } catch (e) {
                if (e instanceof z.ZodError) {
                    errors[node.id] = e;
                    messages.push(`Node ${node.id}: ${e.issues.map(issue => issue.message).join(", ")}`);
                }
            }
        }

        return { errors, messages };
    }, []);

    const existingNetworks = useMemo(() => {
        const values = new Set<string>();
        nodes.forEach(node => {
            const fields = node.fields as Record<string, unknown>;
            const single = fields.network;
            if (typeof single === "string") {
                const trimmed = single.trim();
                if (trimmed.length) values.add(trimmed);
            }
            const multiple = fields.networks;
            if (Array.isArray(multiple)) {
                multiple.forEach(item => {
                    if (typeof item === "string") {
                        const trimmed = item.trim();
                        if (trimmed.length) values.add(trimmed);
                    }
                });
            }
        });
        return Array.from(values).sort((a, b) => a.localeCompare(b));
    }, [nodes]);

    const handleNodeDrag = (id: number, x: number, y: number) => {
        let newX = x;
        let newY = y;

        const snapped = snapToGrid(newX, newY, 40);
        newX = snapped.x;
        newY = snapped.y;

        const draggedNode = nodes.find(node => node.id === id);
        if (!draggedNode) return;

        const deltaX = newX - draggedNode.x;
        const deltaY = newY - draggedNode.y;
        const worldWidth = workspaceInfo.width * BOUND_SCALE;
        const worldHeight = workspaceInfo.height * BOUND_SCALE;
        const minX = 0;
        const minY = 0;
        const maxX = worldWidth - NODE_WIDTH;
        const maxY = worldHeight - NODE_HEIGHT;

        const nodesToMove = new Set([id, ...(selectedNodeIds.has(id) ? selectedNodeIds : [])]);
        const movingNodes = nodes.filter(node => nodesToMove.has(node.id));
        const staticNodes = nodes.filter(node => !nodesToMove.has(node.id));

        let adjustedDeltaX = deltaX;
        let adjustedDeltaY = deltaY;

        for (const movingNode of movingNodes) {
            const newNodeX = movingNode.x + deltaX;
            const newNodeY = movingNode.y + deltaY;

            for (const staticNode of staticNodes) {
                const movingLeft = newNodeX - COLLISION_PADDING;
                const movingRight = newNodeX + NODE_WIDTH + COLLISION_PADDING;
                const movingTop = newNodeY - COLLISION_PADDING;
                const movingBottom = newNodeY + NODE_HEIGHT + COLLISION_PADDING;

                const staticLeft = staticNode.x;
                const staticRight = staticNode.x + NODE_WIDTH;
                const staticTop = staticNode.y;
                const staticBottom = staticNode.y + NODE_HEIGHT;

                const isColliding =
                    movingRight > staticLeft &&
                    movingLeft < staticRight &&
                    movingBottom > staticTop &&
                    movingTop < staticBottom;

                if (isColliding) {
                    const overlapX = Math.min(movingRight, staticRight) - Math.max(movingLeft, staticLeft);
                    const overlapY = Math.min(movingBottom, staticBottom) - Math.max(movingTop, staticTop);

                    if (overlapX < overlapY) {
                        if (movingNode.x < staticNode.x) {
                            adjustedDeltaX = Math.min(adjustedDeltaX, deltaX - overlapX);
                        } else {
                            adjustedDeltaX = Math.max(adjustedDeltaX, deltaX + overlapX);
                        }
                    } else {
                        if (movingNode.y < staticNode.y) {
                            adjustedDeltaY = Math.min(adjustedDeltaY, deltaY - overlapY);
                        } else {
                            adjustedDeltaY = Math.max(adjustedDeltaY, deltaY + overlapY);
                        }
                    }
                }
            }
        }

        for (const movingNode of movingNodes) {
            const targetX = movingNode.x + adjustedDeltaX;
            if (targetX < minX) {
                adjustedDeltaX = Math.max(adjustedDeltaX, minX - movingNode.x);
            }
            if (targetX > maxX) {
                adjustedDeltaX = Math.min(adjustedDeltaX, maxX - movingNode.x);
            }
            const targetY = movingNode.y + adjustedDeltaY;
            if (targetY < minY) {
                adjustedDeltaY = Math.max(adjustedDeltaY, minY - movingNode.y);
            }
            if (targetY > maxY) {
                adjustedDeltaY = Math.min(adjustedDeltaY, maxY - movingNode.y);
            }
        }

        setNodes((prevNodes) =>
            prevNodes.map((node) => 
                nodesToMove.has(node.id) 
                    ? { 
                        ...node, 
                        x: Math.min(maxX, Math.max(minX, node.x + adjustedDeltaX)),
                        y: Math.min(maxY, Math.max(minY, node.y + adjustedDeltaY))
                    } 
                    : node
            )
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
        setNodes(prevNodes => {
            const nextId = prevNodes.reduce((max, node) => Math.max(max, node.id), 0) + 1;
            const updatedNodes = [...prevNodes, { id: nextId, type: nodeType, x: worldCenterX, y: worldCenterY, fields: {} as Record<string, unknown> }];
            const { errors } = computeValidation(updatedNodes);
            setNodeValidationErrors(errors);
            return updatedNodes;
        });
    }

    function handleSetFields(fields: Record<string, unknown>): void {
        const selectedId = selectedNode?.id;
        if (selectedId === undefined) return;
        setNodes(prevNodes => {
            const updatedNodes = prevNodes.map(node =>
                node.id === selectedId ? { ...node, fields } : node
            );
            const { errors } = computeValidation(updatedNodes);
            setNodeValidationErrors(errors);
            const updatedSelected = updatedNodes.find(node => node.id === selectedId) || null;
            setSelectedNode(updatedSelected);
            return updatedNodes;
        });
    }

    const serialize = useCallback(() => {
        const { errors, messages } = computeValidation(nodes);
        setNodeValidationErrors(errors);
        if (messages.length > 0) {
            throw new Error(`Validation errors:\n${messages.join('\n')}`);
        }
        return nodes.map(node => ({ ...node, fields: { ...node.fields } }));
    }, [nodes, computeValidation]);

    const deserialize = useCallback((data: INodeInfo[]) => {
        const structureErrors: string[] = [];
        const sanitized: INodeInfo[] = [];

        data.forEach(node => {
            if (typeof node !== "object" || node === null) {
                structureErrors.push("Invalid node entry");
                return;
            }

            if (typeof node.id !== "number" || typeof node.type !== "string" || typeof node.x !== "number" || typeof node.y !== "number") {
                structureErrors.push(`Invalid node structure: ${JSON.stringify(node)}`);
                return;
            }

            if (!nodeTypes[node.type]) {
                structureErrors.push(`Unknown node type: ${node.type}`);
                return;
            }

            const fields = node.fields && typeof node.fields === "object" ? node.fields : {};
            sanitized.push({ ...node, fields: { ...fields } });
        });

        if (structureErrors.length > 0) {
            throw new Error(structureErrors.join("\n"));
        }

        const { errors, messages } = computeValidation(sanitized);
        if (messages.length > 0) {
            setNodeValidationErrors(errors);
            throw new Error(messages.join("\n"));
        }

        setNodes(sanitized);
        setNodeValidationErrors(errors);
        setSelectedNode(null);
        setSelectedNodeIds(new Set());
    }, [computeValidation]);

    useImperativeHandle(ref, () => ({
        serialize,
        deserialize
    }), [serialize, deserialize]);

    function handleDeleteNode(id: number): void {
        setNodes(prevNodes => {
            const updatedNodes = prevNodes.filter(node => node.id !== id);
            const { errors } = computeValidation(updatedNodes);
            setNodeValidationErrors(errors);
            return updatedNodes;
        });
        setSelectedNode(null);
        setSelectedNodeIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }

    return (
        <>
            <NodeSettingsDrawer open={nodeInfoDrawerOpen} setOpen={setNodeInfoDrawerOpen} selectedNode={selectedNode} setFields={handleSetFields} deleteNode={handleDeleteNode} existingNetworks={existingNetworks}/>
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
