import type { ActionSchema, Context } from "moleculer";
import { Topologies } from "../../../models/Topology.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
import { Errors, MakeError } from "../../../utils/Errors.js";
import { toTopologyResponse } from "../utils.js";

interface GetTopologyParams {
	id: string;
}

export default {
	name: "get",
	rest: {
		method: "GET",
		path: "/:id",
	},
	params: {
		id: { type: "string", empty: false, trim: true },
	},
	async handler(ctx: Context<GetTopologyParams, AuthContextMeta>) {
		if (!(await authenticate(ctx))) return;

		const ownerId = ctx.meta.user!._id;

		try {
			const topology = await Topologies.findOne({ _id: ctx.params.id, owner: ownerId }).lean().exec();
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
