import type { Context } from "moleculer";
import { Errors, MakeError } from "./Errors.js";
import type { User } from "../models/User.js";
import type { UserSession } from "../models/UserSession.js";

export interface AuthContextMeta {
    user?: User;
    session?: UserSession;
}

export async function authenticate(ctx: Context<any, AuthContextMeta>): Promise<boolean> {
    const meta = ctx.meta;

    if (!meta.user || !meta.session) {
        return MakeError(Errors.UNAUTHORIZED);
    }

    return true;
}