import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import { UserSessions } from "../../../models/UserSession.js";
import { authenticate } from "../../../utils/authenticate.js";
export default {
    name: "me",
    rest: {
        method: "GET",
        path: "/me"
    },
    async handler(ctx) {
        if (await authenticate(ctx)) {
            return ctx.meta.user;
        }
    }
};
//# sourceMappingURL=me.js.map