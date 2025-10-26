import { Node, COLLISION_PADDING, NODE_HEIGHT, NODE_WIDTH, type INodeInfo, type IWorkspaceInfo } from "@/components/hackathon/node";
import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import { NodeSettingsDrawer } from "./node-settings-drawer";
import { NodeSelector } from "./node-selector";
import { nodeTypes } from "@/lib/nodes";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Undo2, Redo2 } from "lucide-react";
import { History } from "@/lib/history";

function snapToGrid(x: number, y: number, gridSize = 1, gridSizeY = gridSize) {
    const snap = (value: number, size: number) =>
        size ? Math.round(value / Math.abs(size)) * Math.abs(size) : value;

    return {
        x: snap(x, gridSize),
        y: snap(y, gridSizeY)
    };
}

export interface NodeEditorProps {
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface NodeEditorHandle {
    serialize: () => INodeInfo[];
    deserialize: (nodes: INodeInfo[]) => void;
    openNodePalette: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

const NodeEditor = forwardRef<NodeEditorHandle, NodeEditorProps>(({ onHistoryChange }, ref) => {
    const BOUND_SCALE = 3;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 4;

    const DEFAULT_WORKSPACE = { width: 1366, height: 768 };
    const MIN_WORKSPACE_SIZE = 320;

    const [workspaceInfo, setWorkspaceInfo] = useState<IWorkspaceInfo>(() => {
        const { width, height } = DEFAULT_WORKSPACE;
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
    const [canUndoState, setCanUndoState] = useState(false);
    const [canRedoState, setCanRedoState] = useState(false);
    const history = useRef<History | null>(null);

    const notifyHistoryChange = useCallback(() => {
        if (history.current) {
            const canUndo = history.current.canUndo();
            const canRedo = history.current.canRedo();
            setCanUndoState(canUndo);
            setCanRedoState(canRedo);
            onHistoryChange?.(canUndo, canRedo);
        } else {
            setCanUndoState(false);
            setCanRedoState(false);
            onHistoryChange?.(false, false);
        }
    }, [onHistoryChange]);

    useEffect(() => {
        if (!history.current) {
            history.current = new History(nodes);
            notifyHistoryChange();
        }
    }, [nodes, notifyHistoryChange]);

    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<number>>(new Set());
    const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
    const [nodesWithinMarquee, setNodesWithinMarquee] = useState<Set<number>>(new Set());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
    const [lastAction, setLastAction] = useState<{ type: 'undo' | 'redo', description: string } | null>(null);
    const lastActionTimeoutRef = useRef<number | null>(null);

    const handleHistoryUpdate = useCallback((newState: INodeInfo[], description: string) => {
        if (!history.current) {
            history.current = new History(newState);
        } else {
            history.current.push(newState, description);
        }
        notifyHistoryChange();
    }, [notifyHistoryChange]);

    useEffect(() => {
        if (lastAction) {
            if (lastActionTimeoutRef.current) {
                window.clearTimeout(lastActionTimeoutRef.current);
            }
            lastActionTimeoutRef.current = window.setTimeout(() => {
                setLastAction(null);
                lastActionTimeoutRef.current = null;
            }, 2000);
        }
        return () => {
            if (lastActionTimeoutRef.current) {
                window.clearTimeout(lastActionTimeoutRef.current);
            }
        };
    }, [lastAction]);

    const clampOffset = useCallback((width: number, height: number, zoom: number, offsetX: number, offsetY: number) => {
        const worldWidth = width * BOUND_SCALE;
        const worldHeight = height * BOUND_SCALE;
        const minOffsetX = width - worldWidth * zoom;
        const minOffsetY = height - worldHeight * zoom;
        const clampedOffsetX = Math.max(minOffsetX, Math.min(0, offsetX));
        const clampedOffsetY = Math.max(minOffsetY, Math.min(0, offsetY));
        return { offsetX: clampedOffsetX, offsetY: clampedOffsetY };
    }, []);

    const zoomBy = useCallback((delta: number) => {
        setWorkspaceInfo(prev => {
            const oldZoom = prev.zoom;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom + delta));
            if (newZoom === oldZoom) {
                return prev;
            }

            const centerX = prev.width / 2;
            const centerY = prev.height / 2;
            const worldX = (centerX - prev.offsetX) / oldZoom;
            const worldY = (centerY - prev.offsetY) / oldZoom;

            const nextOffsetX = centerX - worldX * newZoom;
            const nextOffsetY = centerY - worldY * newZoom;
            const clamped = clampOffset(prev.width, prev.height, newZoom, nextOffsetX, nextOffsetY);

            return {
                ...prev,
                zoom: newZoom,
                offsetX: clamped.offsetX,
                offsetY: clamped.offsetY,
            };
        });
    }, [clampOffset]);

    const zoomIn = useCallback(() => zoomBy(0.2), [zoomBy]);
    const zoomOut = useCallback(() => zoomBy(-0.2), [zoomBy]);

    const resetView = useCallback(() => {
        setWorkspaceInfo(prev => {
            const worldWidth = prev.width * BOUND_SCALE;
            const worldHeight = prev.height * BOUND_SCALE;
            return {
                ...prev,
                zoom: 1,
                offsetX: (prev.width - worldWidth) / 2,
                offsetY: (prev.height - worldHeight) / 2,
            };
        });
    }, []);

    const openNodePalette = useCallback(() => {
        setNodeSelectorOpen(true);
    }, []);

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

    const [dragStartNodes, setDragStartNodes] = useState<INodeInfo[] | null>(null);

    const handleNodeDragStart = (id: number) => {
        setDragStartNodes(nodes.map(node => ({ ...node })));
    };

    const handleNodeDragEnd = () => {
        if (dragStartNodes) {
            handleHistoryUpdate(nodes, 'Move nodes');
            setDragStartNodes(null);
        }
    };

    const handleNodeDrag = (id: number, x: number, y: number) => {
        if (!dragStartNodes) {
            handleNodeDragStart(id);
        }

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

        const updatedNodes = nodes.map((node) =>
            nodesToMove.has(node.id)
                ? {
                    ...node,
                    x: Math.min(maxX, Math.max(minX, node.x + adjustedDeltaX)),
                    y: Math.min(maxY, Math.max(minY, node.y + adjustedDeltaY))
                }
                : node
        );
        setNodes(updatedNodes);

        if (e.type === 'mouseup' && dragStartNodes) {
            handleHistoryUpdate(updatedNodes, 'Move nodes');
            setDragStartNodes(null);
        }
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
        const handleGlobalMouseUp = () => {
            if (dragStartNodes && JSON.stringify(dragStartNodes) !== JSON.stringify(nodes)) {
                handleHistoryUpdate(nodes, `Move node${selectedNodeIds.size > 1 ? 's' : ''} ${Array.from(selectedNodeIds).join(', ')}`);
            }
            setDragStartNodes(null);
        };

        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, [dragStartNodes, nodes, selectedNodeIds, handleHistoryUpdate]);

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
        const rect = self.current?.getBoundingClientRect();
        if (!rect) return;

        const delta = e.deltaY * -0.001;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setWorkspaceInfo(prev => {
            const oldZoom = prev.zoom;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom + delta));
            if (newZoom === oldZoom) {
                return prev;
            }

            const worldX = (mouseX - prev.offsetX) / oldZoom;
            const worldY = (mouseY - prev.offsetY) / oldZoom;

            const nextOffsetX = mouseX - worldX * newZoom;
            const nextOffsetY = mouseY - worldY * newZoom;
            const clamped = clampOffset(prev.width, prev.height, newZoom, nextOffsetX, nextOffsetY);

            return {
                ...prev,
                zoom: newZoom,
                offsetX: clamped.offsetX,
                offsetY: clamped.offsetY,
            };
        });
    }, [clampOffset]);

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
            return;
        } else {
            setSelectedNodeIds(new Set([id]));
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
        const nextId = nodes.reduce((max, node) => Math.max(max, node.id), 0) + 1;
        const updatedNodes = [...nodes, { id: nextId, type: nodeType, x: worldCenterX, y: worldCenterY, fields: {} as Record<string, unknown> }];
        const { errors } = computeValidation(updatedNodes);
        setNodeValidationErrors(errors);
        setNodes(updatedNodes);
        handleHistoryUpdate(updatedNodes, `Add ${nodeType} node`);
    }

    function handleSetFields(fields: Record<string, unknown>): void {
        const selectedId = selectedNode?.id;
        if (selectedId === undefined) return;
        const updatedNodes = nodes.map(node =>
            node.id === selectedId ? { ...node, fields } : node
        );
        const { errors } = computeValidation(updatedNodes);
        setNodeValidationErrors(errors);
        const updatedSelected = updatedNodes.find(node => node.id === selectedId) || null;
        setSelectedNode(updatedSelected);
        setNodes(updatedNodes);
        handleHistoryUpdate(updatedNodes, `Edit node ${selectedId} fields`);
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

        history.current = new History(sanitized);
    }, [computeValidation]);

    const undo = useCallback(() => {
        if (!history.current || !history.current.canUndo()) return;
        const prevState = history.current.undo();
        if (prevState) {
            const newNodes = prevState.map(node => ({ ...node, fields: JSON.parse(JSON.stringify(node.fields)) }));
            setNodes(newNodes);
            const { errors } = computeValidation(newNodes);
            setNodeValidationErrors(errors);
            setSelectedNode(null);
            setSelectedNodeIds(new Set());
            setNodeInfoDrawerOpen(false);
            notifyHistoryChange();
            setLastAction({
                type: 'undo',
                description: history.current.getDescription()
            });
        }
    }, [computeValidation, notifyHistoryChange]);

    const redo = useCallback(() => {
        if (!history.current || !history.current.canRedo()) return;
        const nextState = history.current.redo(0);
        if (nextState) {
            const newNodes = nextState.map(node => ({ ...node, fields: JSON.parse(JSON.stringify(node.fields)) }));
            setNodes(newNodes);
            const { errors } = computeValidation(newNodes);
            setNodeValidationErrors(errors);
            setSelectedNode(null);
            setSelectedNodeIds(new Set());
            setNodeInfoDrawerOpen(false);
            notifyHistoryChange();
            setLastAction({
                type: 'redo',
                description: history.current.getDescription()
            });
        }
    }, [computeValidation, notifyHistoryChange]);

    const canUndo = useCallback(() => canUndoState, [canUndoState]);
    const canRedo = useCallback(() => canRedoState, [canRedoState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    redo();
                } else {
                    e.preventDefault();
                    undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    useImperativeHandle(ref, () => ({
        serialize,
        deserialize,
        openNodePalette,
        zoomIn,
        zoomOut,
        resetView,
        undo,
        redo,
        canUndo,
        canRedo
    }), [serialize, deserialize, openNodePalette, zoomIn, zoomOut, resetView, undo, redo, canUndo, canRedo]);

    const deleteNodes = useCallback((ids: number[]) => {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        const remaining = nodes.filter(node => !idSet.has(node.id));
        const { errors } = computeValidation(remaining);
        setNodeValidationErrors(errors);
        setNodes(remaining);
        setSelectedNode(prev => (prev && idSet.has(prev.id) ? null : prev));
        setSelectedNodeIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.delete(id));
            return next;
        });
        setNodesWithinMarquee(new Set());
        setNodeInfoDrawerOpen(false);
        handleHistoryUpdate(remaining, `Delete node${ids.length > 1 ? 's' : ''} ${ids.join(', ')}`);
    }, [computeValidation, handleHistoryUpdate, nodes]);

    function handleDeleteNode(id: number): void {
        deleteNodes([id]);
    }

    useEffect(() => {
        if (!self.current) return;
        const element = self.current;
        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            const measuredWidth = Math.max(entry.contentRect.width, MIN_WORKSPACE_SIZE);
            const measuredHeight = Math.max(entry.contentRect.height, MIN_WORKSPACE_SIZE);

            setWorkspaceInfo(prev => {
                const worldWidth = measuredWidth * BOUND_SCALE;
                const worldHeight = measuredHeight * BOUND_SCALE;
                const minOffsetX = measuredWidth - worldWidth * prev.zoom;
                const minOffsetY = measuredHeight - worldHeight * prev.zoom;
                const maxOffsetX = 0;
                const maxOffsetY = 0;
                const offsetXRatio = prev.width !== 0 ? prev.offsetX / prev.width : -((BOUND_SCALE - 1) / 2);
                const offsetYRatio = prev.height !== 0 ? prev.offsetY / prev.height : -((BOUND_SCALE - 1) / 2);
                const nextOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetXRatio * measuredWidth));
                const nextOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetYRatio * measuredHeight));

                const widthDelta = Math.abs(prev.width - measuredWidth);
                const heightDelta = Math.abs(prev.height - measuredHeight);
                const offsetXDelta = Math.abs(prev.offsetX - nextOffsetX);
                const offsetYDelta = Math.abs(prev.offsetY - nextOffsetY);

                if (widthDelta < 1 && heightDelta < 1) {
                    if (offsetXDelta < 0.5 && offsetYDelta < 0.5) {
                        return prev;
                    }

                    return {
                        ...prev,
                        offsetX: nextOffsetX,
                        offsetY: nextOffsetY,
                    };
                }

                return {
                    ...prev,
                    width: measuredWidth,
                    height: measuredHeight,
                    offsetX: nextOffsetX,
                    offsetY: nextOffsetY,
                };
            });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Delete" && event.key !== "Backspace") return;
            const target = event.target as HTMLElement | null;
            if (target) {
                const tagName = target.tagName;
                if (tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable) {
                    return;
                }
            }
            const ids = selectedNodeIds.size > 0
                ? Array.from(selectedNodeIds)
                : selectedNode
                    ? [selectedNode.id]
                    : [];
            if (ids.length === 0) return;
            event.preventDefault();
            setPendingDeleteIds(ids);
            setIsDeleteDialogOpen(true);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedNodeIds, selectedNode]);

    const handleConfirmDelete = useCallback(() => {
        deleteNodes(pendingDeleteIds);
        setPendingDeleteIds([]);
        setIsDeleteDialogOpen(false);
    }, [deleteNodes, pendingDeleteIds]);

    const handleRequestDelete = useCallback(() => {
        const ids = selectedNodeIds.size > 0
            ? Array.from(selectedNodeIds)
            : selectedNode
                ? [selectedNode.id]
                : [];
        if (ids.length === 0) return;
        setPendingDeleteIds(ids);
        setIsDeleteDialogOpen(true);
    }, [selectedNodeIds, selectedNode]);

    const selectedCount = selectedNodeIds.size;

    return (
        <>
            <NodeSettingsDrawer open={nodeInfoDrawerOpen} setOpen={setNodeInfoDrawerOpen} selectedNode={selectedNode} setFields={handleSetFields} deleteNode={handleDeleteNode} existingNetworks={existingNetworks} />
            <NodeSelector open={nodeSelectorOpen} setOpen={setNodeSelectorOpen} onSelected={handleNewNode} />
            <div
                ref={self}
                className="relative h-full min-h-[480px] w-full overflow-hidden"
                style={{ maxHeight: "100%" }}
            >
                <div
                    style={{
                        width: `${workspaceInfo.width * BOUND_SCALE}px`,
                        height: `${workspaceInfo.height * BOUND_SCALE}px`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
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
                            onNodeDragStart={handleNodeDragStart}
                            onNodeDragEnd={handleNodeDragEnd}
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
                {lastAction && (
                    <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2">
                        <div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-background/90 px-4 py-2 shadow-lg backdrop-blur">
                            <span className="text-sm font-medium text-foreground">
                                {lastAction.type === 'undo' ? 'Undone to' : 'Redone to'} {lastAction.description}
                            </span>
                            {lastAction.type === 'undo' ? (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={redo}
                                    disabled={!canRedoState}
                                >
                                    <Redo2 className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={undo}
                                    disabled={!canUndoState}
                                >
                                    <Undo2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                {selectedCount > 0 && (
                    <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
                        <div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-background/90 px-4 py-2 shadow-lg backdrop-blur">
                            <span className="text-sm font-medium text-foreground">
                                Selected {selectedCount} {selectedCount === 1 ? "item" : "items"}
                            </span>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={handleRequestDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) {
                    setPendingDeleteIds([]);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {pendingDeleteIds.length} {pendingDeleteIds.length === 1 ? "node" : "nodes"}?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                        >
                            Delete
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setPendingDeleteIds([]);
                                setIsDeleteDialogOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
});

export default NodeEditor;
