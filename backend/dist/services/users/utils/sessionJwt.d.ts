import type { UserSession } from "../../../models/UserSession.js";
export interface SessionJwtPayload {
    magic: string;
    type: "session";
    sessionId: string;
}
export declare function encodeSessionJwt(session: UserSession): string;
export declare function tryDecodeSessionJwt(token: string): SessionJwtPayload | null;
//# sourceMappingURL=sessionJwt.d.ts.map