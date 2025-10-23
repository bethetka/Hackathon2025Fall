
import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { tryDecodeSessionJwt } from "../utils/sessionJwt.js";
import { UserSessions } from "../../../models/UserSession.js";
import { Users } from "../../../models/User.js";

export class GetSessionByJwtParams {
    @String()
    public jwt!: string;
}

export default {
    name: "getSessionByJwt",
    params: getSchema(GetSessionByJwtParams),
    async handler(ctx: Context<GetSessionByJwtParams>) {
        const sessionInfo = tryDecodeSessionJwt(ctx.params.jwt);

        if (!sessionInfo) return {user: null, session: null};

        const session = (await UserSessions.findOne({_id: sessionInfo.sessionId}))?.toObject();

        if (!session) return null;

        const user = (await Users.findOne({_id: session.user}))?.toObject();

        return {user, session}; 
    }
} as ActionSchema