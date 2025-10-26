import type { INodeInfo } from '@/components/hackathon/node';

interface IHistoryDelta {
    added: INodeInfo[];
    removed: number[];
    modified: Array<{
        id: number;
        before: Partial<INodeInfo>;
        after: Partial<INodeInfo>;
    }>;
}

interface IHistoryNode {
    state: INodeInfo[];
    delta: IHistoryDelta | null;
    fullState?: INodeInfo[];
    parent: IHistoryNode | null;
    children: IHistoryNode[];
    description: string;
    timestamp: number;
}

export class History {
    private root: IHistoryNode;
    private current: IHistoryNode;
    private pruneThreshold = 1000;

    private computeDelta(oldState: INodeInfo[], newState: INodeInfo[]): IHistoryDelta {
        const oldMap = new Map(oldState.map(node => [node.id, node]));
        const newMap = new Map(newState.map(node => [node.id, node]));

        const added: INodeInfo[] = [];
        const removed: number[] = [];
        const modified: Array<{ id: number; before: Partial<INodeInfo>; after: Partial<INodeInfo> }> = [];

        for (const [id, oldNode] of oldMap) {
            const newNode = newMap.get(id);
            if (!newNode) {
                removed.push(id);
            } else if (!this.areNodesEqual(oldNode, newNode)) {
                modified.push({
                    id,
                    before: oldNode,
                    after: newNode
                });
            }
        }

        for (const [id, newNode] of newMap) {
            if (!oldMap.has(id)) {
                added.push(newNode);
            }
        }

        return { added, removed, modified };
    }

    private areNodesEqual(node1: INodeInfo, node2: INodeInfo): boolean {
        return node1.id === node2.id &&
            node1.type === node2.type &&
            node1.x === node2.x &&
            node1.y === node2.y &&
            JSON.stringify(node1.fields) === JSON.stringify(node2.fields);
    }

    constructor(initialState: INodeInfo[]) {
        this.root = {
            state: this.deepCopyState(initialState),
            delta: null,
            parent: null,
            children: [],
            description: 'Initial state',
            timestamp: Date.now()
        };
        this.current = this.root;
    }

    private areStatesEqual(state1: INodeInfo[], state2: INodeInfo[]): boolean {
        if (state1.length !== state2.length) return false;
        return state1.every((node1, index) => {
            const node2 = state2[index];
            return node1.id === node2.id &&
                node1.type === node2.type &&
                node1.x === node2.x &&
                node1.y === node2.y &&
                JSON.stringify(node1.fields) === JSON.stringify(node2.fields);
        });
    }

    public push(state: INodeInfo[], description: string): void {
        if (this.areStatesEqual(state, this.current.state)) {
            return;
        }

        const delta = this.computeDelta(this.current.state, state);
        const isSignificantChange = delta.added.length > 0 ||
            delta.removed.length > 0 ||
            delta.modified.length > 0;

        if (!isSignificantChange) {
            return;
        }

        const newNode: IHistoryNode = {
            state: this.deepCopyState(state),
            delta,
            parent: this.current,
            children: [],
            description,
            timestamp: Date.now()
        };

        if (this.getDepth(newNode) % 10 === 0) {
            newNode.fullState = this.deepCopyState(state);
        }

        this.current.children.push(newNode);
        this.current = newNode;

        if (this.getTreeSize() > this.pruneThreshold) {
            this.pruneOldestBranch();
        }
    }

    private deepCopyState(state: INodeInfo[]): INodeInfo[] {
        return state.map(node => ({
            ...node,
            fields: JSON.parse(JSON.stringify(node.fields)),
            x: node.x,
            y: node.y,
            id: node.id,
            type: node.type
        }));
    }

    public undo(): INodeInfo[] | null {
        if (!this.current.parent) {
            return null;
        }
        this.current = this.current.parent;
        return this.current.state;
    }

    public getBranchOptions(): { index: number; description: string; timestamp: number }[] {
        return this.current.children.map((child, index) => ({
            index,
            description: child.description,
            timestamp: child.timestamp
        }));
    }

    public selectBranch(index: number): INodeInfo[] | null {
        if (index < 0 || index >= this.current.children.length) {
            return null;
        }
        this.current = this.current.children[index];
        return this.current.state;
    }

    public redo(childIndex = 0): INodeInfo[] | null {
        return this.selectBranch(childIndex);
    }

    public canUndo(): boolean {
        return this.current.parent !== null;
    }

    public canRedo(): boolean {
        return this.current.children.length > 0;
    }

    public getBranches(): INodeInfo[][] {
        return this.current.children.map(child => child.state);
    }

    public hasBranches(): boolean {
        return this.current.children.length > 1;
    }

    public getCurrentState(): INodeInfo[] {
        return this.current.state;
    }

    public getDescription(): string {
        return this.current.description;
    }

    public getCurrentPath(): INodeInfo[][] {
        const path: INodeInfo[][] = [];
        let node: IHistoryNode | null = this.current;
        while (node) {
            path.unshift(node.state);
            node = node.parent;
        }
        return path;
    }

    public getBranchCount(): number {
        return this.current.children.length;
    }

    public getBranchDescriptions(): string[] {
        return this.current.children.map(child => child.description);
    }

    private getTreeSize(): number {
        let size = 0;
        const traverse = (node: IHistoryNode) => {
            size++;
            node.children.forEach(traverse);
        };
        traverse(this.root);
        return size;
    }

    private getDepth(node: IHistoryNode): number {
        let depth = 0;
        let current: IHistoryNode | null = node;
        while (current.parent) {
            depth++;
            current = current.parent;
        }
        return depth;
    }

    public mergeBranch(sourceIndex: number, targetIndex: number): INodeInfo[] | null {
        const source = this.current.children[sourceIndex];
        const target = this.current.children[targetIndex];

        if (!source || !target) return null;

        const baseState = this.deepCopyState(this.current.state);
        const mergedState = this.applyDeltas(baseState, [source.delta, target.delta].filter(Boolean) as IHistoryDelta[]);

        const mergedNode: IHistoryNode = {
            state: mergedState,
            delta: this.computeDelta(this.current.state, mergedState),
            fullState: mergedState,
            parent: this.current,
            children: [],
            description: `Merged: ${source.description} + ${target.description}`,
            timestamp: Date.now()
        };

        this.current.children.push(mergedNode);
        this.current = mergedNode;
        return mergedState;
    }

    private applyDeltas(baseState: INodeInfo[], deltas: IHistoryDelta[]): INodeInfo[] {
        let state = [...baseState];

        for (const delta of deltas) {
            state = state.filter(node => !delta.removed.includes(node.id));

            state = [...state, ...delta.added];

            for (const mod of delta.modified) {
                const index = state.findIndex(node => node.id === mod.id);
                if (index !== -1) {
                    state[index] = { ...state[index], ...mod.after };
                }
            }
        }

        return state;
    }

    private pruneOldestBranch(): void {
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const currentPath = new Set<IHistoryNode>();
        let currentNode: IHistoryNode | null = this.current;

        while (currentNode) {
            currentPath.add(currentNode);
            currentNode = currentNode.parent;
        }

        const findOldestLeaf = (node: IHistoryNode): IHistoryNode | null => {
            if (node.children.length === 0 && !currentPath.has(node)) {
                return node;
            }

            let oldest: IHistoryNode | null = null;
            for (const child of node.children) {
                const leafInBranch = findOldestLeaf(child);
                if (leafInBranch && (!oldest || leafInBranch.timestamp < oldest.timestamp)) {
                    oldest = leafInBranch;
                }
            }
            return oldest;
        };

        const pruneNode = (node: IHistoryNode): boolean => {
            if (currentPath.has(node)) return true;

            if (node.children.length === 0 && (now - node.timestamp) > MAX_AGE) {
                return false;
            }

            node.children = node.children.filter(child => pruneNode(child));

            return node.children.length > 0 || currentPath.has(node);
        };

        pruneNode(this.root);

        if (this.getTreeSize() > this.pruneThreshold) {
            const oldestLeaf = findOldestLeaf(this.root);
            if (oldestLeaf && oldestLeaf.parent) {
                const parent = oldestLeaf.parent;
                parent.children = parent.children.filter(child => child !== oldestLeaf);
            }
        }

        const cleanupFullStates = (node: IHistoryNode) => {
            const depth = this.getDepth(node);
            if (depth % 10 !== 0) {
                delete node.fullState;
            }
            node.children.forEach(cleanupFullStates);
        };

        cleanupFullStates(this.root);
    }
}