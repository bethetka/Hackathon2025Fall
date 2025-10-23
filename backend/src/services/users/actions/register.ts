import { getSchema, Schema, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { Users } from "../../../models/User.js";
import { Errors, MakeError } from "../../../utils/Errors.js";
import argon2 from "argon2";
import type { UserSession } from "../../../models/UserSession.js";
@Schema()
export class RegisterParams {
    @String()
    public username!: string;

    @String()
    public password!: string;
}

export default {
    name: "register",
    params: getSchema(RegisterParams),
    async handler(ctx: Context<RegisterParams>) {
        const candidate = (await Users.findOne({username: ctx.params.username}))?.toObject();
        if (candidate) {
            return MakeError(Errors.USER_WITH_THIS_USERNAME_ALREADY_EXISTS);
        }

        const user = await Users.create({
            username: ctx.params.username,
            password: await argon2.hash(ctx.params.password)
        });
        const {session, jwt}: {session: UserSession, jwt: string} = await ctx.call("users.createSession", {userId: user.id, userAgent: "Not/Implemented"})

        return {
            user,
            session,
            jwt
        }
    }
} as ActionSchema;