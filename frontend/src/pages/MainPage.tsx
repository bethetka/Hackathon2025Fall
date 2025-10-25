import NodeEditor, { type NodeEditorHandle } from "@/components/hackathon/node-editor";
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

export const MainPage: React.FC = () => {
    const nodeEditorRef = useRef<NodeEditorHandle>(null);

    return (
        <div className="w-full flex flex-col items-center justify-center p-4 pt-12">
            <h1 className="text-[36px] mb-4">Aéza interactive something</h1>
            <div className="mb-4 space-x-2">
                <Button onClick={() => nodeEditorRef.current?.serialize()}>Serialize</Button>
                <Button onClick={() => nodeEditorRef.current?.deserialize()}>Deserialize</Button>
            </div>
            <NodeEditor ref={nodeEditorRef} />
        </div>
    );
};