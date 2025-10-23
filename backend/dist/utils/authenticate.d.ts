import type { Context } from "moleculer";
import type { User } from "../models/User.js";
import type { UserSession } from "../models/UserSession.js";
export interface AuthContextMeta {
    user?: User;
    session?: UserSession;
}
export declare function authenticate(ctx: Context<any, AuthContextMeta>): Promise<boolean>;
//# sourceMappingURL=authenticate.d.ts.map