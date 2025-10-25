import React, { useEffect, useState } from "react";
import type { INodeInfo } from "./node";
import { nodeTypes } from "@/lib/nodes";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Button } from "../ui/button";
import * as z from "zod";
import type { JSONSchema } from "zod/v4/core";
import { ZodFieldEditor } from "./field-editor";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "../ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";

interface INodeSettingsDrawerProps {
    open: boolean;
    setOpen: (value: boolean) => void;
    setFields: (value: Record<string, object>) => void;
    deleteNode: (id: number) => void;
    selectedNode: INodeInfo | null;
}

export const NodeSettingsDrawer: React.FC<INodeSettingsDrawerProps> = (props: INodeSettingsDrawerProps) => {
    if (!props.selectedNode) return <></>

    const nodeType = nodeTypes[props.selectedNode.type];
    const [validationSchema, setValidationSchema] = useState<z.ZodTypeAny | null>(null);
    const [fields, setFields] = useState<Record<string, any>>({});
    const [validationError, setValidationError] = useState<z.ZodError | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    useEffect(() => {
        if (props.selectedNode) {
            setFields(props.selectedNode.fields);
            setValidationSchema(nodeType?.parameters || z.object({}));
            setValidationError(null);
        }
    }, [props.selectedNode, nodeType]);

    const params = validationSchema ? z.toJSONSchema(validationSchema) : { properties: {} };

    const validate = () => {
        if (!validationSchema) return { success: true, error: null };

        try {
            validationSchema.parse(fields);
            return { success: true, error: null };
        } catch (error) {
            return {
                success: false,
                error: error instanceof z.ZodError ? error : null
            };
        }
    };

    const handleSave = () => {
        const { success, error } = validate();
        if (success) {
            props.setFields(fields);
            props.setOpen(false);
            setFields({});
            setValidationError(null);
        } else {
            setValidationError(error);
        }
    };

    const handleCancel = () => {
        if (props.selectedNode) {
            setFields(props.selectedNode.fields);
        }
        props.setOpen(false);
        setFields({});
        setValidationError(null);
    };

    function handleDelete(): void {
        props.deleteNode(props.selectedNode?.id!);
        props.setOpen(false);
        setFields({});
        setValidationError(null);
    }

    return <Drawer open={props.open} onOpenChange={(v) => {
        if (!v && !validationError) {
            props.setOpen(v);
        }
    }} direction="right">
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                        Do you really want to delete this node?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant={"destructive"} onClick={() => {
                        setDeleteDialogOpen(false);
                        handleDelete();
                    }}>Yes</Button>
                    <DialogClose asChild>
                        <Button variant={"outline"}>No</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {(props.selectedNode) && <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Editing {nodeType!.name}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4 p-4">
                <h1 className="text-lg">Parameters</h1>
                {Object.entries(params.properties || {}).map(([propName, schema]) => {
                    const error = validationError?.issues.find(e => e.path[0] === propName);
                    return (
                        <ZodFieldEditor
                            key={propName}
                            propName={propName}
                            schema={schema as JSONSchema.JSONSchema}
                            setValue={(v) => {
                                setFields(prev => ({ ...prev, [propName]: v }));
                                if (validationError) {
                                    const newErrors = validationError.issues.filter(
                                        e => e.path[0] !== propName
                                    );
                                    setValidationError(newErrors.length > 0 ?
                                        new z.ZodError(newErrors) : null);
                                }
                            }}
                            value={fields[propName]}
                            error={error}
                        />
                    );
                })}
            </div>
            {validationError && (
                <div className="px-4 mb-4 text-red-500 text-sm">
                    Please fix the errors above before saving.
                </div>
            )}
            <DrawerFooter>
                <Button onClick={handleSave}>Save</Button>
                <Button onClick={() => {
                    setDeleteDialogOpen(true);
                }} variant={"destructive"}>Delete</Button>
                <DrawerClose asChild>
                    <Button className="w-full" variant={"outline"} onClick={handleCancel}>
                        Cancel
                    </Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>}
    </Drawer>;
}