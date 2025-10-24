import NodeEditor from "@/components/hackathon/node-editor";
import React from "react";

export const MainPage: React.FC = () => {
    return <div className="w-full flex flex-col items-center justify-center p-4 pt-12">
        <h1 className="text-[36px] mb-4">Aéza interactive something</h1>
        <NodeEditor/>
    </div>
}