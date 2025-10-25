import React, { useCallback, useEffect } from "react";
import { CommandDialog, CommandInput, CommandItem, CommandSeparator, CommandShortcut } from "../ui/command";
import { CommandList } from "cmdk";
import { categoriesForCreation, type ICategoryForCreation } from "@/lib/nodes";

interface INodeSelectorProps {
    open: boolean;
    setOpen: (value: boolean) => void;
    onSelected: (nodeType: string) => void;
}

export const NodeSelector: React.FC<INodeSelectorProps> = (props: INodeSelectorProps) => {
    const [search, setSearch] = React.useState('')
    const [pages, setPages] = React.useState<ICategoryForCreation[]>([])
    const page = pages[pages.length - 1]

    const down = useCallback(
        (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'a' && e.shiftKey) {
                e.preventDefault()
                props.setOpen(!props.open)
            }
            if (props.open) {
                if (e.key === 'Backspace' && search.length == 0) {
                    console.log(search, search.length)
                    e.preventDefault()
                    setPages((pages) => pages.slice(0, -1))
                }
            }
        }, [search]
    )

    useEffect(() => {
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [down])


    return <CommandDialog open={props.open} onOpenChange={props.setOpen}>
        <CommandInput placeholder="Search here..." value={search} onValueChange={s => {
            setSearch(s);
            console.log(s, search)
        }} />
        <CommandList>
            {!page && Object.entries(categoriesForCreation).map(i => <CommandItem onSelect={() => setPages([...pages, i[1]])} key={i[0]}><img src={i[1].icon} width={32} />{i[1].name}</CommandItem>)}

            {!!page && <>
                <CommandItem onSelect={() => {
                    setPages((pages) => pages.slice(0, -1))
                }}>Go back <CommandShortcut>Backspace</CommandShortcut></CommandItem>
                <CommandItem disabled={true}>Selecting type of {page.name}</CommandItem>
                <CommandSeparator />
                {Object.entries(page.variants).map(i => <CommandItem key={i[1]} onSelect={() => {
                    props.setOpen(false);
                    props.onSelected(i[1])
                }}>{i[0]}</CommandItem>)}
            </>}
        </CommandList>
    </CommandDialog>
}