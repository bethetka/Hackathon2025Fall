import type { ActionSchema, Context } from "moleculer";
import { Topologies } from "../../../models/Topology.js";
import type { TopologyNode } from "../../../models/Topology.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
import { sanitizeNodes, toTopologyResponse } from "../utils.js";
import { Errors, MakeError } from "../../../utils/Errors.js";

interface CreateTopologyParams {
	name: string;
	description?: string;
	nodes: unknown[];
}

export default {
	name: "create",
	rest: {
		method: "POST",
		path: "/",
	},
	params: {
		name: { type: "string", min: 1, max: 120, trim: true },
		description: { type: "string", optional: true, max: 2000, trim: true },
		nodes: {
			type: "array",
			items: { type: "object" },
			optional: false,
		},
	},
	async handler(ctx: Context<CreateTopologyParams, AuthContextMeta>) {
		if (!(await authenticate(ctx))) return;

		const ownerId = ctx.meta.user!._id;
		let nodes: TopologyNode[];
		try {
			nodes = sanitizeNodes(ctx.params.nodes);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return MakeError(Errors.INVALID_TOPOLOGY_PAYLOAD, { message });
		}

		const topology = await Topologies.create({
			owner: ownerId,
			name: ctx.params.name,
			description: ctx.params.description?.trim() || undefined,
			nodes,
		});

		return toTopologyResponse(topology.toObject());
	},
} as ActionSchema;
