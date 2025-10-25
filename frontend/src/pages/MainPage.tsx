import NodeEditor, { type NodeEditorHandle } from "@/components/hackathon/node-editor";
import React, { type ChangeEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Check, Container, Copy, Download, FileJson, Keyboard, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildDockerComposeYaml } from "@/lib/generator";

export const MainPage: React.FC = () => {
    const nodeEditorRef = useRef<NodeEditorHandle>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="min-h-screen bg-background flex flex-col">
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight">StackPilot Canvas</h1>
                        <p className="text-sm text-muted-foreground">
                            Sketch the architecture, focus on the editor, and keep sharing effortless.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        <Keyboard className="h-5 w-5 text-foreground" />
                        <div className="space-y-1">
                            <div className="font-medium text-foreground">Hotkeys</div>
                            <div className="flex flex-wrap items-center gap-1">
                                <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-wide">Shift</kbd>
                                <span className="text-[10px] font-semibold text-muted-foreground">+</span>
                                <kbd className="rounded border bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-wide">A</kbd>
                                <span className="text-xs text-muted-foreground">Add new node</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={handleExportJson} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export JSON
                        </Button>
                        <Button variant="outline" onClick={handleImportButtonClick} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Import JSON
                        </Button>
                        <Button variant="outline" onClick={handleSerialize} className="gap-2">
                            <FileJson className="h-4 w-4" />
                            View JSON
                        </Button>
                        <Button variant="outline" onClick={handleDockerCompose} className="gap-2">
                            <Container className="h-4 w-4" />
                            View Docker Compose
                        </Button>
                        <input
                            ref={importFileInputRef}
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={handleImportFromFile}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span>Importing from a file applies immediately.</span>
                        <span>Use View JSON to copy or audit the current layout,</span>
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto px-0 text-xs"
                            onClick={handleDeserialize}
                        >
                            or paste JSON manually.
                        </Button>
                    </div>
                </div>

                <section className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-xl border bg-muted/20">
                    <div className="flex-1 overflow-hidden p-4">
                        <NodeEditor ref={nodeEditorRef} />
                    </div>
                </section>
            </main>

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
                            Generated docker-compose.yml from your current nodes.
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
