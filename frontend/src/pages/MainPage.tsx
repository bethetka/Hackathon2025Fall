import NodeEditor, { type NodeEditorHandle } from "@/components/hackathon/node-editor";
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildDockerComposeYaml } from "@/lib/generator";

export const MainPage: React.FC = () => {
    const nodeEditorRef = useRef<NodeEditorHandle>(null);

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
            const data = JSON.parse(deserializeContent);
            if (!Array.isArray(data)) {
                throw new Error("Expected an array of nodes");
            }
            nodeEditorRef.current?.deserialize(data);
            setIsDeserializeDialogOpen(false);
        } catch (e) {
            setDeserializeError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="w-full flex flex-col items-center justify-center p-4 pt-12">
            <h1 className="text-[36px] mb-4">Aéza interactive something</h1>
            <div className="mb-4 space-x-2">
                <Button onClick={handleSerialize}>Serialize</Button>
                <Button onClick={handleDeserialize}>Deserialize</Button>
                <Button onClick={handleDockerCompose}>Docker Compose</Button>
            </div>
            <NodeEditor ref={nodeEditorRef} />

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
