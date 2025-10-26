import type { ServiceSchema } from "moleculer";
import list from "./actions/list.js";
import get from "./actions/get.js";
import create from "./actions/create.js";
import update from "./actions/update.js";
import remove from "./actions/remove.js";

export default {
	name: "topologies",
	settings: {
		rest: "topologies",
	},
	actions: {
		list,
		get,
		create,
		update,
		remove,
	},
} as ServiceSchema;
