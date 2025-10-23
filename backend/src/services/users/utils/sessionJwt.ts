import { env } from "../../../env.js";
import type { UserSession } from "../../../models/UserSession.js";
import { jwtEncode, jwtVerify } from "../../../utils/jwt.js";

export interface SessionJwtPayload {
    magic: string;
    type: "session";
    sessionId: string;
}

export function encodeSessionJwt(session: UserSession): string {
    const payload: SessionJwtPayload = {
        magic: env.JWT_MAGIC,
        type: "session",
        sessionId: session._id.toString()
    };

    return jwtEncode(payload);
}

export function tryDecodeSessionJwt(token: string): SessionJwtPayload | null {
    try {
        const payload: any = jwtVerify(token);

        if (!payload) return null;

        if (
            payload.type != "session" &&
            payload.magic != env.JWT_MAGIC &&
            typeof payload.sessionId != "string"
        ) return null;
        return payload as SessionJwtPayload;
    }
    catch (e) {
        return null;
    }
}