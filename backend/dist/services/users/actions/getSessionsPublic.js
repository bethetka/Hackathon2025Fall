import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import { UserSession, UserSessions } from "../../../models/UserSession.js";
import { authenticate } from "../../../utils/authenticate.js";
export default {
    name: "getSessionsPublic",
    rest: {
        method: "GET",
        path: "/me/sessions"
    },
    async handler(ctx) {
        if (await authenticate(ctx)) {
            return (await ctx.call("users.getSessions", {
                userId: ctx.meta.user._id.toString()
            })).map(i => ({ ...i, current: i._id.toString() == ctx.meta.session._id.toString() }));
        }
    }
};
//# sourceMappingURL=getSessionsPublic.js.map