import * as jwtPkg from "jsonwebtoken";
import { env } from "../env.js";
const jwt = jwtPkg.default;
export function jwtEncode(payload) {
    return jwt.sign(payload, env.JWT_SECRET);
}
export function jwtVerify(token) {
    try {
        let tk = jwt.verify(token, env.JWT_SECRET);
        if (typeof tk != "object") {
            return null;
        }
        return tk;
    }
    catch (e) {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map