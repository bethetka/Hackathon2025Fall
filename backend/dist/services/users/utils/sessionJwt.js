import { env } from "../../../env.js";
import { jwtEncode, jwtVerify } from "../../../utils/jwt.js";
export function encodeSessionJwt(session) {
    const payload = {
        magic: env.JWT_MAGIC,
        type: "session",
        sessionId: session._id.toString()
    };
    return jwtEncode(payload);
}
export function tryDecodeSessionJwt(token) {
    try {
        const payload = jwtVerify(token);
        if (!payload)
            return null;
        if (payload.type != "session" &&
            payload.magic != env.JWT_MAGIC &&
            typeof payload.sessionId != "string")
            return null;
        return payload;
    }
    catch (e) {
        return null;
    }
}
//# sourceMappingURL=sessionJwt.js.map