import NodeEditor, { type NodeEditorHandle } from "@/components/hackathon/node-editor";
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

export const MainPage: React.FC = () => {
    const nodeEditorRef = useRef<NodeEditorHandle>(null);

    const handleSerialize = () => {
        try {
            const nodes = nodeEditorRef.current?.serialize();
            if (nodes) {
                alert(JSON.stringify(nodes, null, 2));
            }
        } catch (e) {
            alert(`Validation error:\n${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const handleDeserialize = () => {
        const json = prompt("Enter serialized JSON");
        if (!json) return;

        try {
            const data = JSON.parse(json);
            if (!Array.isArray(data)) {
                throw new Error("Expected an array of nodes");
            }
            nodeEditorRef.current?.deserialize(data);
        } catch (e) {
            alert(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    return (
        <div className="w-full flex flex-col items-center justify-center p-4 pt-12">
            <h1 className="text-[36px] mb-4">Aéza interactive something</h1>
            <div className="mb-4 space-x-2">
                <Button onClick={handleSerialize}>Serialize</Button>
                <Button onClick={handleDeserialize}>Deserialize</Button>
            </div>
            <NodeEditor ref={nodeEditorRef} />
        </div>
    );
};