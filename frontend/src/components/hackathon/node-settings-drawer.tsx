import React from "react";
import type { INodeInfo } from "./node";
import {nodeTypes, type INodeType} from "@/lib/nodes";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Button } from "../ui/button";
import * as z from "zod";
interface INodeSettingsDrawerProps {
    open: boolean;
    setOpen: (value: boolean) => void;
    selectedNode: INodeInfo | null;
}

export const NodeSettingsDrawer: React.FC<INodeSettingsDrawerProps> = (props: INodeSettingsDrawerProps) => {
    let nodeType = props.selectedNode != null ? nodeTypes[props.selectedNode.type] : null;
    let params = z.toJSONSchema(nodeType?.parameters || z.object())
    return <Drawer open={props.open} onOpenChange={props.setOpen} direction="right">
        {(props.selectedNode) && <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Editing {nodeType!.name}</DrawerTitle>
            </DrawerHeader>
            {Object.entries(params.properties!).map(i => <p>{i[0]}</p>)}
            <DrawerFooter>
                <Button>Save</Button>

                <DrawerClose>
                    <Button variant="outline" className="w-full">Cancel</Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>}
    </Drawer>;
}