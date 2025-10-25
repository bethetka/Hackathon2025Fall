import React, { useCallback, useEffect } from "react";
import { CommandDialog, CommandInput, CommandItem, CommandSeparator, CommandShortcut } from "../ui/command";
import { CommandList } from "cmdk";
import { categoriesForCreation, type ICategoryForCreation } from "@/lib/nodes";

interface INodeSelectorProps {
    open: boolean;
    setOpen: (value: boolean) => void;
    onSelected: (nodeType: string) => void;
}

export const NodeSelector: React.FC<INodeSelectorProps> = ({ open, setOpen, onSelected }: INodeSelectorProps) => {
    const [search, setSearch] = React.useState("");
    const [pages, setPages] = React.useState<ICategoryForCreation[]>([]);
    const page = pages[pages.length - 1];

    const down = useCallback((e: KeyboardEvent) => {
        const key = typeof e.key === "string" ? e.key.toLowerCase() : "";
        const isShiftA = e.shiftKey && (e.code === "KeyA" || key === "a");

        if (isShiftA && !e.repeat) {
            e.preventDefault();
            setOpen(!open);
            return;
        }

        if (open && e.key === "Backspace" && search.length === 0) {
            e.preventDefault();
            setPages((prevPages) => prevPages.slice(0, -1));
        }
    }, [open, search, setOpen]);

    useEffect(() => {
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [down])


    return <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
            placeholder="Search here..."
            value={search}
            onValueChange={setSearch}
        />
        <CommandList>
            {!page && Object.entries(categoriesForCreation).map(([key, category]) => (
                <CommandItem onSelect={() => setPages((prev) => [...prev, category])} key={key}>
                    <img src={category.icon} width={32} />
                    {category.name}
                </CommandItem>
            ))}

            {!!page && <>
                <CommandItem onSelect={() => {
                    setPages((pages) => pages.slice(0, -1))
                }}>Go back <CommandShortcut>Backspace</CommandShortcut></CommandItem>
                <CommandItem disabled={true}>Selecting type of {page.name}</CommandItem>
                <CommandSeparator />
                {Object.entries(page.variants).map(([label, nodeType]) => (
                    <CommandItem
                        key={nodeType}
                        onSelect={() => {
                            setOpen(false);
                            onSelected(nodeType);
                        }}
                    >
                        {label}
                    </CommandItem>
                ))}
            </>}
        </CommandList>
    </CommandDialog>
}
