
import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { UserSessions } from "../../../models/UserSession.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
export default {
    name: "me",
    rest: {
        method: "GET",
        path: "/me"
    },
    async handler(ctx: Context<void, AuthContextMeta>) {
        if (await authenticate(ctx)) {
            return ctx.meta.user!;
        }
    }
} as ActionSchema