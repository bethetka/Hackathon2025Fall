import type { ActionSchema, Context } from "moleculer";
import { Topologies } from "../../../models/Topology.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
import { toTopologySummary } from "../utils.js";

export default {
	name: "list",
	rest: {
		method: "GET",
		path: "/",
	},
	async handler(ctx: Context<void, AuthContextMeta>) {
		if (!(await authenticate(ctx))) return;

		const ownerId = ctx.meta.user!._id;
		const items = await Topologies.find({ owner: ownerId }).sort({ updatedAt: -1 }).lean().exec();

		return items.map(toTopologySummary);
	},
} as ActionSchema;
