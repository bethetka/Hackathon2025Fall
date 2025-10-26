import NodeEditor, { type NodeEditorHandle } from "@/components/hackathon/node-editor";
import { Link } from "react-router-dom";
import React, { type ChangeEvent, useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Check,
    Container,
    Copy,
    Download,
    FileJson,
    FolderOpen,
    Keyboard,
    Loader2,
    Plus,
    RefreshCw,
    Redo2,
    Save,
    Trash2,
    Undo2,
    Upload,
    X,
    ZoomIn,
    ZoomOut,
    Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildDockerComposeYaml } from "@/lib/generator";
import { parseDockerCompose } from "@/lib/composeParser";
import { useAuth } from "@/providers/AuthProvider";
import { getApiErrorMessage } from "@/lib/apiError";
import type { ApiTopology, ApiTopologyNode, ApiTopologySummary } from "@/lib/apiTypes";
import {
    createTopology,
    deleteTopology,
    getTopology,
    listTopologies,
    updateTopology
} from "@/lib/topologyApi";
import type { INodeInfo } from "@/components/hackathon/node";

export const MainPage: React.FC = () => {
    const nodeEditorRef = useRef<NodeEditorHandle>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const composeFileInputRef = useRef<HTMLInputElement>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isAutoinstallDialogOpen, setIsAutoinstallDialogOpen] = useState(false);
    const [autoinstallContent, setAutoinstallContent] = useState("");
    const [autoinstallCopySuccess, setAutoinstallCopySuccess] = useState(false);

    const handleHistoryChange = useCallback((canUndo: boolean, canRedo: boolean) => {
        setCanUndo(canUndo);
        setCanRedo(canRedo);
    }, []);

    const [isSerializeDialogOpen, setIsSerializeDialogOpen] = useState(false);
    const [serializeContent, setSerializeContent] = useState("");
    const [copySuccess, setCopySuccess] = useState(false);

    const [isDeserializeDialogOpen, setIsDeserializeDialogOpen] = useState(false);
    const [deserializeContent, setDeserializeContent] = useState("");
    const [deserializeError, setDeserializeError] = useState<string | null>(null);
    const [serializeError, setSerializeError] = useState<string | null>(null);
    const [isDockerDialogOpen, setIsDockerDialogOpen] = useState(false);
    const [dockerContent, setDockerContent] = useState("");
    const [dockerCopySuccess, setDockerCopySuccess] = useState(false);
    const [dockerError, setDockerError] = useState<string | null>(null);

    const queryClient = useQueryClient();
    const [selectedTopologyId, setSelectedTopologyId] = useState<string | null>(null);
    const [lastLoadedTopologyId, setLastLoadedTopologyId] = useState<string | null>(null);
    const [topologyStatus, setTopologyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isTopologyDialogOpen, setIsTopologyDialogOpen] = useState(false);
    const [topologyDialogMode, setTopologyDialogMode] = useState<"create" | "update">("create");
    const [topologyNameInput, setTopologyNameInput] = useState("");
    const [topologyDescriptionInput, setTopologyDescriptionInput] = useState("");
    const [topologyDialogError, setTopologyDialogError] = useState<string | null>(null);
    const [isDeleteTopologyDialogOpen, setIsDeleteTopologyDialogOpen] = useState(false);
    const [deleteTopologyError, setDeleteTopologyError] = useState<string | null>(null);

    const applyNodesFromJson = (content: string) => {
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
            throw new Error("Expected an array of nodes");
        }
        nodeEditorRef.current?.deserialize(data);
    };

    const handleSerialize = () => {
        try {
            const nodes = nodeEditorRef.current?.serialize();
            if (nodes) {
                setSerializeContent(JSON.stringify(nodes, null, 2));
                setIsSerializeDialogOpen(true);
                setCopySuccess(false);
                setSerializeError(null);
            }
        } catch (e) {
            setSerializeError(e instanceof Error ? e.message : String(e));
        }
    };

    const handleExportJson = () => {
        try {
            const nodes = nodeEditorRef.current?.serialize();
            if (!nodes) return;
            const json = JSON.stringify(nodes, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `stackpilot-workflow-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            setSerializeError(null);
        } catch (e) {
            setSerializeError(e instanceof Error ? e.message : String(e));
            setSerializeContent("");
            setIsSerializeDialogOpen(true);
        }
    };

    const handleImportButtonClick = () => {
        importFileInputRef.current?.click();
    };

    const handleImportFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            setDeserializeContent(text);
            applyNodesFromJson(text);
            setDeserializeError(null);
            setIsDeserializeDialogOpen(false);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setDeserializeError(message);
            setIsDeserializeDialogOpen(true);
        } finally {
            event.target.value = "";
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(serializeContent).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleDockerCompose = () => {
        try {
            const nodes = nodeEditorRef.current?.serialize();
            if (!nodes) return;
            const yaml = buildDockerComposeYaml(nodes);
            setDockerContent(yaml);
            setDockerCopySuccess(false);
            setDockerError(null);
            setIsDockerDialogOpen(true);
        } catch (e) {
            setDockerContent("");
            const message = e instanceof Error ? e.message : String(e);
            setDockerError(message);
            setDockerCopySuccess(false);
            setIsDockerDialogOpen(true);
        }
    };

    const handleDockerCopy = () => {
        navigator.clipboard.writeText(dockerContent).then(() => {
            setDockerCopySuccess(true);
            setTimeout(() => setDockerCopySuccess(false), 2000);
        });
    };

    const handleExportDockerCompose = () => {
        try {
            const nodes = nodeEditorRef.current?.serialize();
            if (!nodes) return;
            const yaml = buildDockerComposeYaml(nodes);
            const blob = new Blob([yaml], { type: "text/yaml" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `stackpilot-docker-compose-${new Date().toISOString().replace(/[:.]/g, "-")}.yml`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setDockerContent("");
            setDockerError(message);
            setDockerCopySuccess(false);
            setIsDockerDialogOpen(true);
        }
    };

    const handleImportDockerCompose = () => {
        composeFileInputRef.current?.click();
    };

    const handleComposeFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const nodes = parseDockerCompose(text);
            nodeEditorRef.current?.deserialize(nodes);
            const sanitized = nodeEditorRef.current?.serialize();
            const generated = sanitized ? buildDockerComposeYaml(sanitized) : text;
            setDockerContent(generated);
            setDockerError(null);
            setDockerCopySuccess(false);
            setIsDockerDialogOpen(true);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setDockerContent("");
            setDockerCopySuccess(false);
            setDockerError(`Could not import Docker Compose: ${message}`);
            setIsDockerDialogOpen(true);
        } finally {
            event.target.value = "";
        }
    };

    const handleOpenNodePalette = () => {
        nodeEditorRef.current?.openNodePalette();
    };

    const handleZoomIn = () => {
        nodeEditorRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
        nodeEditorRef.current?.zoomOut();
    };

    const handleResetView = () => {
        nodeEditorRef.current?.resetView();
    };

    const handleDeserialize = () => {
        setIsDeserializeDialogOpen(true);
        setDeserializeContent("");
        setDeserializeError(null);
    };

    const handleApplyDeserialize = () => {
        try {
            applyNodesFromJson(deserializeContent);
            setIsDeserializeDialogOpen(false);
        } catch (e) {
            setDeserializeError(e instanceof Error ? e.message : String(e));
        }
    };

    const { user, isLoading: isAuthLoading } = useAuth();

    const createTopologyMutation = useMutation({
        mutationFn: (payload: { name: string; description?: string; nodes: ApiTopologyNode[] }) =>
            createTopology(payload),
        onSuccess: (data: ApiTopology) => {
            queryClient.invalidateQueries({ queryKey: ["topologies"] });
            setSelectedTopologyId(data._id);
        },
    });

    const updateTopologyMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: { name?: string; description?: string; nodes?: ApiTopologyNode[] } }) =>
            updateTopology(id, payload),
        onSuccess: (data: ApiTopology) => {
            queryClient.invalidateQueries({ queryKey: ["topologies"] });
            setSelectedTopologyId(data._id);
        },
    });

    const getTopologyMutation = useMutation({
        mutationFn: (id: string) => getTopology(id),
    });

    const deleteTopologyMutation = useMutation({
        mutationFn: (id: string) => deleteTopology(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["topologies"] });
        },
    });

    const topologiesQuery = useQuery<ApiTopologySummary[]>({
        queryKey: ["topologies"] as const,
        queryFn: listTopologies,
        enabled: Boolean(user),
        staleTime: 60_000,
    });

    const topologies = topologiesQuery.data ?? [];
    const topologiesErrorMessage = topologiesQuery.isError
        ? getApiErrorMessage(topologiesQuery.error, "Could not load saved topologies.")
        : null;

    useEffect(() => {
        if (!user) {
            setSelectedTopologyId(null);
            setLastLoadedTopologyId(null);
            setTopologyStatus(null);
        }
    }, [user]);

    useEffect(() => {
        if (!topologies.length) {
            setSelectedTopologyId(null);
            return;
        }
        setSelectedTopologyId(prev => (prev && topologies.some(item => item._id === prev) ? prev : topologies[0]._id));
    }, [topologies]);

    useEffect(() => {
        if (!topologyStatus) return;
        const timer = window.setTimeout(() => setTopologyStatus(null), 4000);
        return () => window.clearTimeout(timer);
    }, [topologyStatus]);

    const selectedTopology = useMemo(
        () => (selectedTopologyId ? topologies.find(item => item._id === selectedTopologyId) ?? null : null),
        [selectedTopologyId, topologies]
    );

    const isSavingTopology = createTopologyMutation.isPending || updateTopologyMutation.isPending;
    const isLoadingTopology = getTopologyMutation.isPending;
    const isDeletingTopology = deleteTopologyMutation.isPending;

    const openCreateTopologyDialog = useCallback(() => {
        setTopologyDialogMode("create");
        setTopologyNameInput("");
        setTopologyDescriptionInput("");
        setTopologyDialogError(null);
        setIsTopologyDialogOpen(true);
    }, []);

    const openUpdateTopologyDialog = useCallback(() => {
        if (!selectedTopology) return;
        setTopologyDialogMode("update");
        setTopologyNameInput(selectedTopology.name);
        setTopologyDescriptionInput(selectedTopology.description ?? "");
        setTopologyDialogError(null);
        setIsTopologyDialogOpen(true);
    }, [selectedTopology]);

    const handleTopologyDialogSubmit = useCallback(async () => {
        setTopologyDialogError(null);
        const trimmedName = topologyNameInput.trim();
        if (trimmedName.length === 0) {
            setTopologyDialogError("Please provide a name for this topology.");
            return;
        }

        let nodes: INodeInfo[];
        try {
            nodes = nodeEditorRef.current?.serialize() ?? [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setTopologyDialogError(message);
            return;
        }

        const nodePayload: ApiTopologyNode[] = nodes.map(node => ({
            id: node.id,
            type: node.type,
            x: node.x,
            y: node.y,
            fields: { ...(node.fields ?? {}) },
        }));

        const trimmedDescription = topologyDescriptionInput.trim();

        try {
            let result: ApiTopology;
            if (topologyDialogMode === "create") {
                result = await createTopologyMutation.mutateAsync({
                    name: trimmedName,
                    description: trimmedDescription ? trimmedDescription : undefined,
                    nodes: nodePayload,
                });
            } else {
                if (!selectedTopologyId) {
                    setTopologyDialogError("No topology selected to update.");
                    return;
                }
                result = await updateTopologyMutation.mutateAsync({
                    id: selectedTopologyId,
                    payload: {
                        name: trimmedName,
                        description: trimmedDescription ? trimmedDescription : undefined,
                        nodes: nodePayload,
                    },
                });
            }

            setIsTopologyDialogOpen(false);
            setTopologyDialogError(null);
            setTopologyNameInput("");
            setTopologyDescriptionInput("");
            setTopologyStatus({
                type: "success",
                message: `${topologyDialogMode === "create" ? "Saved" : "Updated"} "${result.name}".`,
            });
            setLastLoadedTopologyId(result._id);
        } catch (error) {
            const message = getApiErrorMessage(error, "Could not save topology.");
            setTopologyDialogError(message);
        }
    }, [
        topologyNameInput,
        topologyDescriptionInput,
        topologyDialogMode,
        createTopologyMutation,
        updateTopologyMutation,
        selectedTopologyId,
        nodeEditorRef,
    ]);

    const handleLoadTopology = useCallback(async () => {
        if (!selectedTopologyId) return;
        try {
            const topology = await getTopologyMutation.mutateAsync(selectedTopologyId);
            const nodes: INodeInfo[] = topology.nodes.map(node => ({
                id: node.id,
                type: node.type,
                x: node.x,
                y: node.y,
                fields: { ...(node.fields ?? {}) },
            }));
            nodeEditorRef.current?.deserialize(nodes);
            setLastLoadedTopologyId(topology._id);
            setTopologyStatus({ type: "success", message: `Loaded "${topology.name}".` });
        } catch (error) {
            const message = getApiErrorMessage(error, "Could not load topology.");
            setTopologyStatus({ type: "error", message });
        }
    }, [selectedTopologyId, getTopologyMutation, nodeEditorRef]);

    const handleDeleteTopology = useCallback(async () => {
        if (!selectedTopologyId) return;
        setDeleteTopologyError(null);
        const topologyId = selectedTopologyId;
        try {
            await deleteTopologyMutation.mutateAsync(topologyId);
            setTopologyStatus({ type: "success", message: "Topology deleted." });
            setIsDeleteTopologyDialogOpen(false);
            setSelectedTopologyId(prev => (prev === topologyId ? null : prev));
            setLastLoadedTopologyId(prev => (prev === topologyId ? null : prev));
        } catch (error) {
            const message = getApiErrorMessage(error, "Could not delete topology.");
            setDeleteTopologyError(message);
        }
    }, [selectedTopologyId, deleteTopologyMutation]);

    const handleAutoinstallScript = () => {
        try {
            const nodes = nodeEditorRef.current?.serialize();
            if (!nodes) return;

            const composeYaml = buildDockerComposeYaml(nodes);
            const folder = `/opt/stackpilot/${Math.ceil(Math.random() * 100_000_000).toString(16)}`;
            const script = `#!/bin/bash

set -euo pipefail
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# Check if running as root
if [ "\$(id -u)" -ne 0 ]; then
    echo "This script must be run with sudo privileges" >&2
    exit 1
fi

# 1. Install Docker if not present
if ! command -v docker &>/dev/null; then
    echo "Docker not found. Installing Docker..."
    
    # Detect OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=\$ID
        VERSION=\$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=\$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        VERSION=\$(lsb_release -sr)
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS=\$DISTRIB_ID
        VERSION=\$DISTRIB_RELEASE
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
        VERSION=\$(grep -oE '[0-9]+\\.[0-9]+' /etc/redhat-release | head -1)
    else
        OS=\$(uname -s)
        VERSION=\$(uname -r)
    fi
    
    # Install based on OS
    case "\$OS" in
        ubuntu|debian)
            apt-get update
            apt-get install -y \\
                apt-transport-https \\
                ca-certificates \\
                curl \\
                gnupg \\
                lsb-release
            
            mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/\$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/\$OS \$(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            
            systemctl enable docker
            systemctl start docker
            ;;
        centos|rhel|fedora)
            if [ "\$OS" = "fedora" ]; then
                dnf -y install dnf-plugins-core
                dnf config-manager --add-repo https://download.docker.com/linux/\$OS/docker-ce.repo
                dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            else
                yum install -y yum-utils
                yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
                yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            fi
            
            systemctl enable docker
            systemctl start docker
            ;;
        *)
            echo "Unsupported OS: \$OS" >&2
            exit 1
            ;;
    esac
    
    echo "Docker installed successfully"
fi

# 2. Create application directory
APP_DIR="${folder}"
mkdir -p "\$APP_DIR"
echo "Created application directory: \$APP_DIR"

# 3. Generate docker-compose.yml from embedded content
COMPOSE_FILE="\$APP_DIR/docker-compose.yml"
cat > "\$COMPOSE_FILE" << 'EOF'
${composeYaml}
EOF

# 4. Run docker-compose
echo "Starting containers..."
cd "\$APP_DIR"
docker compose up -d

# Verify
echo -e "\\nInstallation complete! Containers are running:"
docker compose ps`;

            setAutoinstallContent(script);
            setAutoinstallCopySuccess(false);
            setIsAutoinstallDialogOpen(true);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            setAutoinstallContent("");
            setAutoinstallCopySuccess(false);
            setIsAutoinstallDialogOpen(true);
        }
    };

    const handleAutoinstallCopy = () => {
        navigator.clipboard.writeText(autoinstallContent).then(() => {
            setAutoinstallCopySuccess(true);
            setTimeout(() => setAutoinstallCopySuccess(false), 2000);
        });
    };

    const userInitial = user?.username?.charAt(0).toUpperCase() ?? "";

    return (
        <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
            <div className="h-full w-full">
                <NodeEditor ref={nodeEditorRef} onHistoryChange={handleHistoryChange} />
            </div>

            <input
                ref={importFileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFromFile}
            />
            <input
                ref={composeFileInputRef}
                type="file"
                accept=".yml,.yaml,application/x-yaml,text/yaml"
                className="hidden"
                onChange={handleComposeFileImport}
            />

            <div className="pointer-events-none absolute inset-0">
                <div className="pointer-events-auto absolute left-6 top-6 flex flex-col gap-4">
                    <div className="w-64 rounded-2xl border bg-background/90 p-4 shadow-lg backdrop-blur">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">StackPilot</p>
                            <p className="text-xs text-muted-foreground">Build and share your service topology.</p>
                        </div>

                        <div className="mt-4 flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <Button className="justify-start gap-2" onClick={handleOpenNodePalette}>
                                    <Plus className="h-4 w-4" />
                                    Add Node
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => nodeEditorRef.current?.undo()}
                                        disabled={!canUndo}
                                        title="Undo (Ctrl+Z)"
                                    >
                                        <Undo2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => nodeEditorRef.current?.redo()}
                                        disabled={!canRedo}
                                        title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                                    >
                                        <Redo2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={handleZoomIn}
                                        title="Zoom in"
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={handleZoomOut}
                                        title="Zoom out"
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={handleResetView}
                                        title="Reset view"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {!isAuthLoading && !user && (
                                <div className="space-y-2 border-t border-border/60 pt-3">
                                    <div className="text-xs font-semibold uppercase text-muted-foreground">Saved Topologies</div>
                                    <p className="text-xs text-muted-foreground">
                                        Sign in to save and load your topologies across devices.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 border-t border-border/60 pt-3">
                                <div className="text-xs font-semibold uppercase text-muted-foreground">JSON</div>
                                <Button variant="outline" className="justify-start gap-2" onClick={handleExportJson}>
                                    <Download className="h-4 w-4" />
                                    Export JSON
                                </Button>
                                <Button variant="outline" className="justify-start gap-2" onClick={handleImportButtonClick}>
                                    <Upload className="h-4 w-4" />
                                    Import JSON
                                </Button>
                                <Button variant="ghost" className="justify-start gap-2 px-2 text-xs font-medium" onClick={handleSerialize}>
                                    <FileJson className="h-4 w-4" />
                                    View JSON
                                </Button>
                                <Button variant="ghost" className="justify-start gap-2 px-2 text-xs font-medium" onClick={handleDeserialize}>
                                    <FileJson className="h-4 w-4" />
                                    Paste JSON
                                </Button>
                            </div>

                            <div className="space-y-2 border-t border-border/60 pt-3">
                                <div className="text-xs font-semibold uppercase text-muted-foreground">Docker Compose</div>
                                <Button variant="outline" className="justify-start gap-2" onClick={handleDockerCompose}>
                                    <Container className="h-4 w-4" />
                                    View Compose
                                </Button>
                                <Button variant="outline" className="justify-start gap-2" onClick={handleExportDockerCompose}>
                                    <Download className="h-4 w-4" />
                                    Export Compose
                                </Button>
                                <Button variant="outline" className="justify-start gap-2" onClick={handleImportDockerCompose}>
                                    <Upload className="h-4 w-4" />
                                    Import Compose
                                </Button>
                                <Button variant="outline" className="justify-start gap-2" onClick={handleAutoinstallScript}>
                                    <Terminal className="h-4 w-4" />
                                    Autoinstall Script
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {user && (
                    <div className="pointer-events-auto absolute left-1/2 top-6 z-20 flex w-[calc(100%_-_3rem)] max-w-[960px] -translate-x-1/2 flex-col gap-3 rounded-2xl border bg-background/90 px-4 py-3 shadow-lg backdrop-blur">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Saved Topologies</span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="justify-start gap-2"
                                onClick={openCreateTopologyDialog}
                                disabled={isSavingTopology}
                            >
                                {isSavingTopology ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                Save current as new
                            </Button>
                        </div>

                        {topologyStatus && (
                            <div
                                className={cn(
                                    "rounded-md border px-3 py-2 text-[11px] leading-tight",
                                    topologyStatus.type === "success"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-red-200 bg-red-50 text-red-600"
                                )}
                            >
                                {topologyStatus.message}
                            </div>
                        )}

                        {topologiesErrorMessage ? (
                            <Alert variant="destructive">
                                <AlertTitle>Could not load</AlertTitle>
                                <AlertDescription>{topologiesErrorMessage}</AlertDescription>
                            </Alert>
                        ) : topologiesQuery.isPending ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading saved topologies...
                            </div>
                        ) : topologies.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No topologies saved yet. Save your canvas to reuse it later.
                            </p>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select
                                        value={selectedTopologyId ?? undefined}
                                        onValueChange={setSelectedTopologyId}
                                        disabled={isSavingTopology || isLoadingTopology || isDeletingTopology}
                                    >
                                        <SelectTrigger className="w-48 md:w-60">
                                            <SelectValue placeholder="Choose a topology" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {topologies.map(topology => (
                                                <SelectItem key={topology._id} value={topology._id}>
                                                    {topology.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="justify-center gap-2"
                                            onClick={handleLoadTopology}
                                            disabled={!selectedTopologyId || isLoadingTopology}
                                        >
                                            {isLoadingTopology ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <FolderOpen className="h-3.5 w-3.5" />
                                            )}
                                            Load
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="justify-center gap-2"
                                            onClick={openUpdateTopologyDialog}
                                            disabled={!selectedTopologyId || isSavingTopology}
                                        >
                                            {isSavingTopology ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Save className="h-3.5 w-3.5" />
                                            )}
                                            Overwrite
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start gap-2 text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                            setDeleteTopologyError(null);
                                            setIsDeleteTopologyDialogOpen(true);
                                        }}
                                        disabled={!selectedTopologyId || isDeletingTopology}
                                    >
                                        {isDeletingTopology ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                        Delete
                                    </Button>
                                </div>
                                {selectedTopology && (
                                    <div className="flex flex-wrap items-center gap-4 text-[11px] leading-snug text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-foreground">{selectedTopology.nodeCount}</span>
                                            <span>nodes</span>
                                        </div>
                                        {selectedTopology.updatedAt && (
                                            <div className="flex items-center gap-1">
                                                <span>Updated</span>
                                                <span>{formatShortDate(selectedTopology.updatedAt)}</span>
                                            </div>
                                        )}
                                        {lastLoadedTopologyId && lastLoadedTopologyId === selectedTopology._id && (
                                            <span className="text-primary">Currently loaded</span>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="pointer-events-auto absolute bottom-6 left-6">
                    <div className="w-[240px] rounded-xl border bg-background/90 px-4 py-3 shadow-lg backdrop-blur">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                            <Keyboard className="h-4 w-4" />
                            Hotkeys
                        </div>
                        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Shift</kbd>
                                    <span className="text-[10px] font-semibold text-muted-foreground">+</span>
                                    <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">A</kbd>
                                </div>
                                <span>Add Node</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Ctrl</kbd>
                                    <span className="text-[10px] font-semibold text-muted-foreground">+</span>
                                    <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Z</kbd>
                                </div>
                                <span>Undo</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Ctrl</kbd>
                                    <span className="text-[10px] font-semibold text-muted-foreground">+</span>
                                    <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Y</kbd>
                                </div>
                                <span>Redo</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Wheel</span>
                                <span>Zoom canvas</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="rounded border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">Drag</span>
                                <span>Pan canvas</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="pointer-events-auto absolute right-6 top-6 flex items-center gap-3 rounded-2xl border bg-background/90 px-4 py-2 shadow-lg backdrop-blur">
                    {isAuthLoading ? (
                        <div className="h-9 w-9 animate-pulse rounded-full bg-muted/40" />
                    ) : user ? (
                        <Link
                            to="/profile"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold uppercase text-primary transition hover:bg-primary/25"
                            aria-label="Open profile"
                        >
                            {userInitial}
                        </Link>
                    ) : (
                        <>
                            <p className="hidden text-xs text-muted-foreground sm:block">
                                All your changes will be lost if you are not logged in.
                            </p>
                            <Button variant="outline" size="sm" asChild>
                                <Link to="/login">Sign in</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Dialog
                open={isTopologyDialogOpen}
                onOpenChange={(open) => {
                    setIsTopologyDialogOpen(open);
                    if (!open) {
                        setTopologyDialogError(null);
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {topologyDialogMode === "create" ? "Save current topology" : "Overwrite topology"}
                        </DialogTitle>
                        <DialogDescription>
                            {topologyDialogMode === "create"
                                ? "Give your current canvas a meaningful name so you can revisit it later."
                                : "Update the selected topology with your current canvas state."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="topology-name" className="text-xs uppercase text-muted-foreground">
                                Name
                            </Label>
                            <Input
                                id="topology-name"
                                value={topologyNameInput}
                                onChange={(e) => setTopologyNameInput(e.target.value)}
                                disabled={isSavingTopology}
                                placeholder="My topology"
                                autoComplete="off"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="topology-description" className="text-xs uppercase text-muted-foreground">
                                Description (optional)
                            </Label>
                            <Textarea
                                id="topology-description"
                                value={topologyDescriptionInput}
                                onChange={(e) => setTopologyDescriptionInput(e.target.value)}
                                rows={3}
                                disabled={isSavingTopology}
                                placeholder="Add context so future you understands this layout."
                            />
                        </div>

                        {topologyDialogError && (
                            <Alert variant="destructive">
                                <AlertTitle>Could not save</AlertTitle>
                                <AlertDescription>{topologyDialogError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsTopologyDialogOpen(false)}
                                disabled={isSavingTopology}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleTopologyDialogSubmit} disabled={isSavingTopology}>
                                {isSavingTopology ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {topologyDialogMode === "create" ? "Save" : "Overwrite"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isDeleteTopologyDialogOpen}
                onOpenChange={(open) => {
                    setIsDeleteTopologyDialogOpen(open);
                    if (!open) {
                        setDeleteTopologyError(null);
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete topology</DialogTitle>
                        <DialogDescription>
                            This action permanently removes{" "}
                            <span className="font-semibold">
                                {selectedTopology?.name ?? "this topology"}
                            </span>.
                        </DialogDescription>
                    </DialogHeader>

                    {deleteTopologyError && (
                        <Alert variant="destructive">
                            <AlertTitle>Could not delete</AlertTitle>
                            <AlertDescription>{deleteTopologyError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteTopologyDialogOpen(false)}
                            disabled={isDeletingTopology}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteTopology}
                            disabled={isDeletingTopology}
                        >
                            {isDeletingTopology ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSerializeDialogOpen} onOpenChange={setIsSerializeDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Serialized Nodes</DialogTitle>
                        <DialogDescription>
                            Copy your node configuration as JSON. This can be used to save or share your workflow.
                        </DialogDescription>
                    </DialogHeader>

                    {serializeError && (
                        <Alert variant="destructive">
                            <X className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{serializeError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-sm text-muted-foreground">
                                {serializeContent.split('\n').length} lines
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyToClipboard}
                                className="gap-2"
                            >
                                {copySuccess ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        Copy JSON
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-sm">
                            <pre className="whitespace-pre-wrap break-all">
                                {serializeContent}
                            </pre>
                        </div>

                        <div className="mt-4 text-sm text-muted-foreground">
                            <p>Pro Tip: Use this JSON to save your workflow or share it with others.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeserializeDialogOpen} onOpenChange={setIsDeserializeDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Deserialize Nodes</DialogTitle>
                        <DialogDescription>
                            Paste your node configuration JSON to load a saved workflow.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="relative flex-1">
                            <Textarea
                                value={deserializeContent}
                                onChange={(e) => setDeserializeContent(e.target.value)}
                                placeholder='Paste your JSON here.'
                                className={cn(
                                    "font-mono text-sm h-full resize-none",
                                    deserializeError ? "border-red-500 focus-visible:ring-red-500" : ""
                                )}
                                spellCheck="false"
                            />
                            {deserializeError && (
                                <Alert variant="destructive" className="absolute bottom-2 left-2 right-2">
                                    <X className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{deserializeError}</AlertDescription>
                                </Alert>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeserializeDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleApplyDeserialize}
                            >
                                Apply
                            </Button>
                        </div>

                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDockerDialogOpen} onOpenChange={setIsDockerDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Docker Compose</DialogTitle>
                        <DialogDescription>
                            {dockerError ? "Docker Compose tools" : "Generated docker-compose.yml from your current nodes."}
                        </DialogDescription>
                    </DialogHeader>

                    {dockerError && (
                        <Alert variant="destructive">
                            <X className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{dockerError}</AlertDescription>
                        </Alert>
                    )}

                    {!dockerError && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-sm text-muted-foreground">
                                    {dockerContent.split("\n").length} lines
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDockerCopy}
                                    className="gap-2"
                                    disabled={!dockerContent}
                                >
                                    {dockerCopySuccess ? (
                                        <>
                                            <Check className="h-3 w-3" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            Copy YAML
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="flex-1 overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-sm">
                                <pre className="whitespace-pre-wrap break-all">
                                    {dockerContent}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={isAutoinstallDialogOpen} onOpenChange={setIsAutoinstallDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Autoinstall Script</DialogTitle>
                        <DialogDescription>
                            Bash script to automatically install Docker (if needed), create directory, and run your compose.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-sm text-muted-foreground">
                                {autoinstallContent.split('\n').length} lines
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAutoinstallCopy}
                                className="gap-2"
                                disabled={!autoinstallContent}
                            >
                                {autoinstallCopySuccess ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        Copy Script
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto rounded-md border bg-muted/30 p-4 font-mono text-sm">
                            <pre className="whitespace-pre-wrap break-all">
                                {autoinstallContent}
                            </pre>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                            <p>Pro Tip: Save this as install.sh, make it executable with chmod +x install.sh, and run with sudo ./install.sh</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

function formatShortDate(input: Date | string): string {
    const value = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(value.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}
