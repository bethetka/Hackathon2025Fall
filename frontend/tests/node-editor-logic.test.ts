import { describe, expect, it } from "vitest";

describe("NodeEditor core logic", () => {
	interface INodeInfo {
		id: number;
		type: string;
		x: number;
		y: number;
		fields: Record<string, unknown>;
	}

	const nodeTypes = {
		redis: {
			parameters: {
				parse: (fields: Record<string, unknown>) => {
					if (typeof fields.password !== "string" || fields.password.length === 0) {
						throw new Error("Redis password is required");
					}
					return fields;
				}
			}
		},
		docker: {
			parameters: {
				parse: (fields: Record<string, unknown>) => {
					if (typeof fields.image !== "string" || fields.image.length === 0) {
						throw new Error("Docker image is required");
					}
					return fields;
				}
			}
		}
	};

	function computeValidation(nodesToValidate: INodeInfo[]) {
		const errors: Record<number, Error> = {};
		const messages: string[] = [];

		for (const node of nodesToValidate) {
			const nodeType = nodeTypes[node.type as keyof typeof nodeTypes];
			if (!nodeType || !nodeType.parameters) continue;

			try {
				nodeType.parameters.parse(node.fields);
			} catch (e) {
				if (e instanceof Error) {
					errors[node.id] = e;
					messages.push(`Node ${node.id}: ${e.message}`);
				}
			}
		}

		return { errors, messages };
	}

	function deepCloneNodes(nodes: INodeInfo[]): INodeInfo[] {
		return nodes.map(node => ({
			...node,
			fields: JSON.parse(JSON.stringify(node.fields))
		}));
	}

	function serialize(nodes: INodeInfo[]): INodeInfo[] {
		const { errors, messages } = computeValidation(nodes);
		if (messages.length > 0) {
			throw new Error(`Validation errors:\n${messages.join('\n')}`);
		}
		return deepCloneNodes(nodes);
	}

	function deserialize(data: INodeInfo[]): INodeInfo[] {
		const structureErrors: string[] = [];
		const sanitized: INodeInfo[] = [];

		data.forEach(node => {
			if (typeof node !== "object" || node === null) {
				structureErrors.push("Invalid node entry");
				return;
			}

			if (typeof node.id !== "number" || typeof node.type !== "string" || typeof node.x !== "number" || typeof node.y !== "number") {
				structureErrors.push(`Invalid node structure: ${JSON.stringify(node)}`);
				return;
			}

			if (!nodeTypes[node.type as keyof typeof nodeTypes]) {
				structureErrors.push(`Unknown node type: ${node.type}`);
				return;
			}

			const fields = node.fields && typeof node.fields === "object" ? node.fields : {};
			sanitized.push({ ...node, fields: { ...fields } });
		});

		if (structureErrors.length > 0) {
			throw new Error(structureErrors.join("\n"));
		}

		const { errors, messages } = computeValidation(sanitized);
		if (messages.length > 0) {
			throw new Error(messages.join("\n"));
		}

		return sanitized;
	}

	function handleMultiSelection(selectedIds: Set<number>, clickedId: number, ctrlKey: boolean): Set<number> {
		if (ctrlKey) {
			const newSelection = new Set(selectedIds);
			if (newSelection.has(clickedId)) {
				newSelection.delete(clickedId);
			} else {
				newSelection.add(clickedId);
			}
			return newSelection;
		} else {
			return new Set([clickedId]);
		}
	}

	function detectCollisions(nodes: INodeInfo[], newNode: INodeInfo): boolean {
		const NODE_WIDTH = 200;
		const NODE_HEIGHT = 100;
		const COLLISION_PADDING = 10;

		for (const node of nodes) {
			if (node.id === newNode.id) continue;

			const nodeLeft = newNode.x - COLLISION_PADDING;
			const nodeRight = newNode.x + NODE_WIDTH + COLLISION_PADDING;
			const nodeTop = newNode.y - COLLISION_PADDING;
			const nodeBottom = newNode.y + NODE_HEIGHT + COLLISION_PADDING;

			const otherLeft = node.x;
			const otherRight = node.x + NODE_WIDTH;
			const otherTop = node.y;
			const otherBottom = node.y + NODE_HEIGHT;

			const isColliding =
				nodeRight > otherLeft &&
				nodeLeft < otherRight &&
				nodeBottom > otherTop &&
				nodeTop < otherBottom;

			if (isColliding) {
				return true;
			}
		}
		return false;
	}

	it("validates node fields correctly", () => {
		const validNodes: INodeInfo[] = [
			{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "secret" } },
			{ id: 2, type: "docker", x: 40, y: 40, fields: { image: "nginx:alpine" } }
		];

		const { errors, messages } = computeValidation(validNodes);
		expect(errors).toEqual({});
		expect(messages).toHaveLength(0);
	});

	it("detects validation errors", () => {
		const invalidNodes: INodeInfo[] = [
			{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "" } },
			{ id: 2, type: "docker", x: 40, y: 40, fields: { image: "" } }
		];

		const { errors, messages } = computeValidation(invalidNodes);
		expect(Object.keys(errors)).toHaveLength(2);
		expect(messages).toHaveLength(2);
		expect(messages[0]).toContain("Redis password is required");
		expect(messages[1]).toContain("Docker image is required");
	});

	it("serializes nodes with deep cloning", () => {
		const nodes: INodeInfo[] = [
			{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "secret" } }
		];

		const serialized = serialize(nodes);
		expect(serialized).toHaveLength(1);
		expect(serialized[0]).toEqual(nodes[0]);

		serialized[0].fields.password = "mutated";
		expect(nodes[0].fields.password).toBe("secret");
	});

	it("rejects invalid serialization data", () => {
		const invalidData: INodeInfo[] = [
			{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "" } }
		];

		expect(() => serialize(invalidData)).toThrow("Validation errors");
	});

	it("deserializes valid data correctly", () => {
		const validData: INodeInfo[] = [
			{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "secret" } },
			{ id: 2, type: "docker", x: 40, y: 40, fields: { image: "nginx:alpine" } }
		];

		const deserialized = deserialize(validData);
		expect(deserialized).toHaveLength(2);
		expect(deserialized[0]).toEqual(validData[0]);
		expect(deserialized[1]).toEqual(validData[1]);
	});

	it("rejects invalid deserialization data", () => {
		const invalidData = [
			{ id: 1, type: "unknown", x: 0, y: 0, fields: {} }
		];

		expect(() => deserialize(invalidData as INodeInfo[])).toThrow("Unknown node type");
	});

	it("handles multi-selection with ctrl key", () => {
		const selectedIds = new Set([1, 2]);
		
		const newSelection = handleMultiSelection(selectedIds, 3, true);
		expect(newSelection).toEqual(new Set([1, 2, 3]));

		const removedSelection = handleMultiSelection(newSelection, 2, true);
		expect(removedSelection).toEqual(new Set([1, 3]));

		const singleSelection = handleMultiSelection(selectedIds, 4, false);
		expect(singleSelection).toEqual(new Set([4]));
	});

	it("detects node collisions", () => {
		const nodes: INodeInfo[] = [
			{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "secret" } }
		];

		const collidingNode: INodeInfo = { id: 2, type: "docker", x: 50, y: 50, fields: { image: "nginx" } };
		const nonCollidingNode: INodeInfo = { id: 3, type: "docker", x: 300, y: 300, fields: { image: "nginx" } };

		expect(detectCollisions(nodes, collidingNode)).toBe(true);
		expect(detectCollisions(nodes, nonCollidingNode)).toBe(false);
	});

	it("maintains data integrity during operations", () => {
		const originalNodes: INodeInfo[] = [
			{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "secret" } },
			{ id: 2, type: "docker", x: 40, y: 40, fields: { image: "nginx:alpine" } }
		];

		const serialized = serialize(originalNodes);
		
		serialized[0].fields.password = "modified";
		serialized[1].x = 100;

		expect(originalNodes[0].fields.password).toBe("secret");
		expect(originalNodes[1].x).toBe(40);

		const deserialized = deserialize(serialized);
		expect(deserialized[0].fields.password).toBe("modified");
		expect(deserialized[1].x).toBe(100);
	});
});
