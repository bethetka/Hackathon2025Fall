import { getSchema, Schema, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { Users } from "../../../models/User.js";
import { Errors, MakeError } from "../../../utils/Errors.js";
import argon2 from "argon2";
import type { UserSession } from "../../../models/UserSession.js";
@Schema()
export class LoginParams {
    @String()
    public username!: string;

    @String()
    public password!: string;
}

export default {
    name: "login",
    params: getSchema(LoginParams),
    async handler(ctx: Context<LoginParams>) {
        const candidate = (await Users.findOne({ username: ctx.params.username }))?.toObject();

        if (candidate) {
            if (!await argon2.verify(candidate.password, ctx.params.password)) {
                return MakeError(Errors.INVALID_CREDENTIALS);
            }

            const { session, jwt }: { session: UserSession, jwt: string } = await ctx.call("users.createSession", { userId: candidate._id.toString(), userAgent: "Not/Implemented" })

            return {
                user: candidate,
                session,
                jwt
            }
        }

        return MakeError(Errors.INVALID_CREDENTIALS);
    }
} as ActionSchema;