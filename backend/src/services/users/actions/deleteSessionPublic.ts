

import { getSchema, ObjectId, Schema, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { UserSession, UserSessions } from "../../../models/UserSession.js";
import { authenticate, type AuthContextMeta } from "../../../utils/authenticate.js";
import { Errors, MakeError } from "../../../utils/Errors.js";

@Schema()
export class DeleteSessionPublicParams {
    @String()
    public sessionId!: string;
}

export default {
    name: "deleteSessionPublic",
    rest: {
        method: "DELETE",
        path: "/me/session/:sessionId"
    },
    params: getSchema(DeleteSessionPublicParams),
    async handler(ctx: Context<DeleteSessionPublicParams, AuthContextMeta>) {
        if (await authenticate(ctx)) {
            if (ctx.meta.session!._id.toString().toLowerCase() == ctx.params.sessionId.toLowerCase()) {
                return MakeError(Errors.YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE);
            }

            const session = (await UserSessions.findOne({
                _id: ctx.params.sessionId
            }))?.toObject();

            if (!session) return MakeError(Errors.SESSION_NOT_FOUND);
            if (session.user.toString() != ctx.meta.user!._id.toString()) return MakeError(Errors.SESSION_NOT_FOUND);
            
            await UserSessions.deleteOne({
                _id: ctx.params.sessionId
            });

            return {success: true};
        }
    }
} as ActionSchema