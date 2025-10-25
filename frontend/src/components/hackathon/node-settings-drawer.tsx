import React, { useEffect } from "react";
import type { INodeInfo } from "./node";
import { nodeTypes } from "@/lib/nodes";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Button } from "../ui/button";
import * as z from "zod";
import type { JSONSchema } from "zod/v4/core";
import { ZodFieldEditor } from "./field-editor";

interface INodeSettingsDrawerProps {
    open: boolean;
    setOpen: (value: boolean) => void;
    setFields: (value: Record<string, object>) => void;
    selectedNode: INodeInfo | null;
}

export const NodeSettingsDrawer: React.FC<INodeSettingsDrawerProps> = (props: INodeSettingsDrawerProps) => {
    if (!props.selectedNode) return <></>
    let nodeType = props.selectedNode != null ? nodeTypes[props.selectedNode.type] : null;
    let params = z.toJSONSchema(nodeType?.parameters || z.object())
    let [fields, setFields] = React.useState<Record<string, object>>(props.selectedNode!.fields);
    return <Drawer open={props.open} onOpenChange={(v) => {
        props.setOpen(v);
        if (!v) {
            props.setFields(fields);
            setFields({});
        }
    }} direction="right">
        {(props.selectedNode) && <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Editing {nodeType!.name}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4 p-4">
                <h1 className="text-lg">Parameters</h1>
                {Object.entries(params.properties!).map(i => <ZodFieldEditor key={i[0]} propName={i[0]} schema={i[1] as JSONSchema.JSONSchema} setValue={(v) => setFields(f => ({...f, [i[0]]: v}))} value={fields[i[0]]}/>)}   
            </div>
            <DrawerFooter>
                <Button>Save</Button>

                <Button className="w-full" variant={"outline"}>
                    Cancel
                </Button>
            </DrawerFooter>
        </DrawerContent>}
    </Drawer>;
}