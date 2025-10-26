import type { ActionSchema, Context } from "moleculer";
import { Topologies } from "../../../models/Topology.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
import { sanitizeNodes, toTopologyResponse } from "../utils.js";
import { Errors, MakeError } from "../../../utils/Errors.js";

interface UpdateTopologyParams {
	id: string;
	name?: string;
	description?: string | null;
	nodes?: unknown[];
}

export default {
	name: "update",
	rest: {
		method: "PUT",
		path: "/:id",
	},
	params: {
		id: { type: "string", empty: false, trim: true },
		name: { type: "string", optional: true, min: 1, max: 120, trim: true },
		description: { type: "string", optional: true, max: 2000, trim: true },
		nodes: { type: "array", items: { type: "object" }, optional: true },
	},
	async handler(ctx: Context<UpdateTopologyParams, AuthContextMeta>) {
		if (!(await authenticate(ctx))) return;

		const ownerId = ctx.meta.user!._id;
		const setOperations: Record<string, unknown> = {};
		const unsetOperations: Record<string, 1> = {};

		if (ctx.params.name !== undefined) {
			setOperations.name = ctx.params.name;
		}

		if (ctx.params.description !== undefined) {
			const trimmed = ctx.params.description?.trim();
			if (trimmed) {
				setOperations.description = trimmed;
			} else {
				unsetOperations.description = 1;
			}
		}

		if (ctx.params.nodes !== undefined) {
			try {
				setOperations.nodes = sanitizeNodes(ctx.params.nodes);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return MakeError(Errors.INVALID_TOPOLOGY_PAYLOAD, { message });
			}
		}

		const hasSetOps = Object.keys(setOperations).length > 0;
		const hasUnsetOps = Object.keys(unsetOperations).length > 0;

		if (!hasSetOps && !hasUnsetOps) {
			const existing = await Topologies.findOne({ _id: ctx.params.id, owner: ownerId }).lean().exec();
			if (!existing) {
				return MakeError(Errors.TOPOLOGY_NOT_FOUND);
			}
			return toTopologyResponse(existing);
		}

		const updateQuery: Record<string, unknown> = {};
		if (hasSetOps) {
			updateQuery.$set = setOperations;
		}
		if (hasUnsetOps) {
			updateQuery.$unset = unsetOperations;
		}

		try {
			const topology = await Topologies.findOneAndUpdate(
				{ _id: ctx.params.id, owner: ownerId },
				updateQuery,
				{ new: true },
			)
				.lean()
				.exec();

			if (!topology) {
				return MakeError(Errors.TOPOLOGY_NOT_FOUND);
			}

			return toTopologyResponse(topology);
		} catch (error: any) {
			if (error?.name === "CastError") {
				return MakeError(Errors.TOPOLOGY_NOT_FOUND);
			}
			throw error;
		}
	},
} as ActionSchema;
