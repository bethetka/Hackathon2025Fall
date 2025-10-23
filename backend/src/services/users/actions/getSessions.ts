
import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { UserSessions } from "../../../models/UserSession.js";

export class GetSessionsParams {
    @String()
    public userId!: string;
}

export default {
    name: "getSessions",
    params: getSchema(GetSessionsParams),
    async handler(ctx: Context<GetSessionsParams>) {
        return (await UserSessions.find({
            user: ctx.params.userId
        })).map(i => i.toObject())
    }
} as ActionSchema