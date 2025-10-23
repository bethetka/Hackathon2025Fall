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
let RegisterParams = class RegisterParams {
    username;
    password;
};
__decorate([
    String(),
    __metadata("design:type", String)
], RegisterParams.prototype, "username", void 0);
__decorate([
    String(),
    __metadata("design:type", String)
], RegisterParams.prototype, "password", void 0);
RegisterParams = __decorate([
    Schema()
], RegisterParams);
export { RegisterParams };
export default {
    name: "register",
    params: getSchema(RegisterParams),
    async handler(ctx) {
        const candidate = (await Users.findOne({ username: ctx.params.username }))?.toObject();
        if (candidate) {
            return MakeError(Errors.USER_WITH_THIS_USERNAME_ALREADY_EXISTS);
        }
        const user = await Users.create({
            username: ctx.params.username,
            password: await argon2.hash(ctx.params.password)
        });
        const { session, jwt } = await ctx.call("users.createSession", { userId: user.id, userAgent: "Not/Implemented" });
        return {
            user,
            session,
            jwt
        };
    }
};
//# sourceMappingURL=register.js.map