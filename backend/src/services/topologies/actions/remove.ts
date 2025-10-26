import type { ActionSchema, Context } from "moleculer";
import { Topologies } from "../../../models/Topology.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
import { Errors, MakeError } from "../../../utils/Errors.js";

interface RemoveTopologyParams {
	id: string;
}

export default {
	name: "remove",
	rest: {
		method: "DELETE",
		path: "/:id",
	},
	params: {
		id: { type: "string", empty: false, trim: true },
	},
	async handler(ctx: Context<RemoveTopologyParams, AuthContextMeta>) {
		if (!(await authenticate(ctx))) return;

		const ownerId = ctx.meta.user!._id;

		try {
			const removed = await Topologies.findOneAndDelete({ _id: ctx.params.id, owner: ownerId }).lean().exec();
			if (!removed) {
				return MakeError(Errors.TOPOLOGY_NOT_FOUND);
			}
			return { success: true };
		} catch (error: any) {
			if (error?.name === "CastError") {
				return MakeError(Errors.TOPOLOGY_NOT_FOUND);
			}
			throw error;
		}
	},
} as ActionSchema;
