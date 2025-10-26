import type { TopologyNode } from "../../models/Topology.js";
interface RawNode {
	id: unknown;
	type: unknown;
	x: unknown;
	y: unknown;
	fields?: unknown;
}

interface RawTopologyLike {
	_id: any;
	name: string;
	description?: string | null;
	nodes?: TopologyNode[];
	createdAt?: Date;
	updatedAt?: Date;
}

export interface TopologySummary {
	_id: string;
	name: string;
	description?: string | null;
	nodeCount: number;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface TopologyResponse {
	_id: string;
	name: string;
	description?: string | null;
	nodes: TopologyNode[];
	createdAt?: Date;
	updatedAt?: Date;
}

function ensureObject(input: unknown, message: string): Record<string, unknown> {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		throw new Error(message);
	}
	return { ...(input as Record<string, unknown>) };
}

export function sanitizeNodes(nodesInput: unknown): TopologyNode[] {
	if (!Array.isArray(nodesInput)) {
		throw new Error("Nodes must be provided as an array.");
	}

	return nodesInput.map((raw, index) => {
		const node = raw as RawNode;
		if (typeof node.id !== "number" || !Number.isFinite(node.id)) {
			throw new Error(`Node at index ${index} has invalid id.`);
		}
		if (typeof node.type !== "string" || node.type.trim().length === 0) {
			throw new Error(`Node at index ${index} has invalid type.`);
		}
		if (typeof node.x !== "number" || !Number.isFinite(node.x) || typeof node.y !== "number" || !Number.isFinite(node.y)) {
			throw new Error(`Node at index ${index} must include numeric x and y coordinates.`);
		}

		const fields =
			node.fields === undefined
				? {}
				: ensureObject(node.fields, `Node at index ${index} has invalid fields payload.`);

		return {
			id: node.id,
			type: node.type.trim(),
			x: node.x,
			y: node.y,
			fields,
		};
	});
}

export function toTopologySummary(topology: RawTopologyLike): TopologySummary {
	const base: TopologySummary = {
		_id: topology._id.toString(),
		name: topology.name,
		description: topology.description ?? null,
		nodeCount: topology.nodes?.length ?? 0,
	};
	if (topology.createdAt) {
		base.createdAt = topology.createdAt;
	}
	if (topology.updatedAt) {
		base.updatedAt = topology.updatedAt;
	}
	return base;
}

export function toTopologyResponse(topology: RawTopologyLike): TopologyResponse {
	const base: TopologyResponse = {
		_id: topology._id.toString(),
		name: topology.name,
		description: topology.description ?? null,
		nodes: (topology.nodes ?? []).map(node => ({
			id: node.id,
			type: node.type,
			x: node.x,
			y: node.y,
			fields: { ...(node.fields ?? {}) },
		})),
	};
	if (topology.createdAt) {
		base.createdAt = topology.createdAt;
	}
	if (topology.updatedAt) {
		base.updatedAt = topology.updatedAt;
	}
	return base;
}
