import * as jwtPkg from "jsonwebtoken";
import { env } from "../env.js";
const jwt = jwtPkg.default;
export function jwtEncode(payload: object): string {
    return jwt.sign(payload, env.JWT_SECRET);
}

export function jwtVerify(token: string): object | null {
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