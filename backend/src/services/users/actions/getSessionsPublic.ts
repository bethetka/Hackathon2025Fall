
import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { UserSession, UserSessions } from "../../../models/UserSession.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
export default {
    name: "getSessionsPublic",
    rest: {
        method: "GET",
        path: "/me/sessions"
    },
    async handler(ctx: Context<void, AuthContextMeta>) {
        if (await authenticate(ctx)) {
            return ((await ctx.call("users.getSessions", {
                userId: ctx.meta.user!._id.toString()
            })) as UserSession[]).map(i => ({...i, current: i._id.toString() == ctx.meta.session!._id.toString()}));
        }
    }
} as ActionSchema