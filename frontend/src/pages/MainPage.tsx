import NodeEditor, { type NodeEditorHandle } from "@/components/hackathon/node-editor";
import React, { type ChangeEvent, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Check, Container, Copy, Download, FileJson, Keyboard, Plus, RefreshCw, Redo2, Undo2, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildDockerComposeYaml } from "@/lib/generator";
import { parseDockerCompose } from "@/lib/composeParser";

export const MainPage: React.FC = () => {
    const nodeEditorRef = useRef<NodeEditorHandle>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const composeFileInputRef = useRef<HTMLInputElement>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

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
                            </div>
                        </div>
                    </div>
                </div>

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
            </div>

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
        </div>
    );
};
