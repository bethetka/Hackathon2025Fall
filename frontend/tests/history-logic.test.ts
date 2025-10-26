import { describe, expect, it } from "vitest";

describe("History branching logic", () => {
	interface INodeInfo {
		id: number;
		type: string;
		x: number;
		y: number;
		fields: Record<string, unknown>;
	}

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
		parent: IHistoryNode | null;
		children: IHistoryNode[];
		description: string;
		timestamp: number;
	}

	class History {
		private root: IHistoryNode;
		private current: IHistoryNode;

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

		private deepCopyState(state: INodeInfo[]): INodeInfo[] {
			return state.map(node => ({
				...node,
				fields: JSON.parse(JSON.stringify(node.fields))
			}));
		}

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

			this.current.children.push(newNode);
			this.current = newNode;
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

		public undo(): INodeInfo[] | null {
			if (!this.current.parent) {
				return null;
			}
			this.current = this.current.parent;
			return this.current.state;
		}

		public redo(childIndex = 0): INodeInfo[] | null {
			if (childIndex < 0 || childIndex >= this.current.children.length) {
				return null;
			}
			this.current = this.current.children[childIndex];
			return this.current.state;
		}

		public canUndo(): boolean {
			return this.current.parent !== null;
		}

		public canRedo(): boolean {
			return this.current.children.length > 0;
		}

		public getBranchDescriptions(): string[] {
			return this.current.children.map(child => child.description);
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
	}

	function clone(nodes: INodeInfo[]): INodeInfo[] {
		return nodes.map(node => ({ ...node, fields: { ...node.fields } }));
	}

	const baseNode: INodeInfo = { id: 1, type: "redis", x: 0, y: 0, fields: { password: "secret" } };
	const secondNode: INodeInfo = { id: 2, type: "docker", x: 40, y: 40, fields: { image: "nginx" } };

	it("supports undo/redo across divergent branches", () => {
		const history = new History([baseNode]);
		const addedState = clone([baseNode, secondNode]);
		history.push(addedState, "Add service");

		const movedState = clone([
			baseNode,
			{ ...secondNode, x: 200 },
		]);
		history.push(movedState, "Move service v1");

		expect(history.canUndo()).toBe(true);
		expect(history.canRedo()).toBe(false);

		const afterUndo = history.undo();
		expect(afterUndo).toEqual(addedState);
		expect(history.canRedo()).toBe(true);

		const alternateMove = clone([
			baseNode,
			{ ...secondNode, x: 320 },
		]);
		history.push(alternateMove, "Move service v2");

		// Go back to the branching point to inspect options
		history.undo();
		expect(history.getBranchDescriptions()).toEqual(["Move service v1", "Move service v2"]);

		const redoFirst = history.redo(0);
		expect(redoFirst).toEqual(movedState);

		history.undo();
		const redoSecond = history.redo(1);
		expect(redoSecond).toEqual(alternateMove);
	});

	it("merges divergent branches into a combined state", () => {
		const history = new History([baseNode, secondNode]);
		const branchA = clone([
			baseNode,
			{ ...secondNode, x: 100, y: 40 },
		]);
		history.push(branchA, "Offset X");

		history.undo();
		const branchB = clone([
			baseNode,
			{ ...secondNode, x: 40, y: 200 },
		]);
		history.push(branchB, "Offset Y");

		history.undo();
		const merged = history.mergeBranch(0, 1);
		expect(merged).toBeTruthy();
		const [, mergedNode] = merged ?? [];
		expect(mergedNode?.x).toBe(40);
		expect(mergedNode?.y).toBe(200);
	});
});
