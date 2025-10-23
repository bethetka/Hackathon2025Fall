var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { getSchema, Schema, String } from "fastest-validator-decorators";
import { Users } from "../../../models/User.js";
import { Errors, MakeError } from "../../../utils/Errors.js";
import argon2 from "argon2";
let LoginParams = class LoginParams {
    username;
    password;
};
__decorate([
    String(),
    __metadata("design:type", String)
], LoginParams.prototype, "username", void 0);
__decorate([
    String(),
    __metadata("design:type", String)
], LoginParams.prototype, "password", void 0);
LoginParams = __decorate([
    Schema()
], LoginParams);
export { LoginParams };
export default {
    name: "login",
    params: getSchema(LoginParams),
    async handler(ctx) {
        const candidate = (await Users.findOne({ username: ctx.params.username }))?.toObject();
        if (candidate) {
            if (!await argon2.verify(candidate.password, ctx.params.password)) {
                return MakeError(Errors.INVALID_CREDENTIALS);
            }
            const { session, jwt } = await ctx.call("users.createSession", { userId: candidate._id.toString(), userAgent: "Not/Implemented" });
            return {
                user: candidate,
                session,
                jwt
            };
        }
        return MakeError(Errors.INVALID_CREDENTIALS);
    }
};
//# sourceMappingURL=login.js.map