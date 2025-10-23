import { getSchema, ObjectId, Schema, SCHEMA_KEY, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { UserSessions } from "../../../models/UserSession.js";
import { jwtEncode } from "../../../utils/jwt.js";
import { encodeSessionJwt } from "../utils/sessionJwt.js";

@Schema()
export class CreateSessionParams {
    @String()
    public userId!: string;

    @String()
    public userAgent!: string;
}

export default {
    name: "createSession",
    params: getSchema(CreateSessionParams),
    async handler(ctx: Context<CreateSessionParams>) {
        const session = await UserSessions.create({
            user: ctx.params.userId,
            userAgent: ctx.params.userAgent,
            lastUse: new Date()
        });

        let jwt = encodeSessionJwt(session);
        return {
            session,
            jwt
        };
    }
} as ActionSchema