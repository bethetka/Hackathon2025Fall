

import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import type { ActionSchema, Context } from "moleculer";
import { UserSessions } from "../../../models/UserSession.js";

export class UpdateSessionLastUseParams {
    @String()
    public sessionId!: string;
}

export default {
    name: "updateSessionLastUse",
    params: getSchema(UpdateSessionLastUseParams),
    async handler(ctx: Context<UpdateSessionLastUseParams>) {
        await UserSessions.updateOne({_id: ctx.params.sessionId}, {
            $set: {
                lastUse: new Date()
            }
        });

        return {success: true};
    }
} as ActionSchema