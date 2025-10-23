var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { getSchema, ObjectId, String } from "fastest-validator-decorators";
import { UserSessions } from "../../../models/UserSession.js";
export class UpdateSessionLastUseParams {
    sessionId;
}
__decorate([
    String(),
    __metadata("design:type", String)
], UpdateSessionLastUseParams.prototype, "sessionId", void 0);
export default {
    name: "updateSessionLastUse",
    params: getSchema(UpdateSessionLastUseParams),
    async handler(ctx) {
        await UserSessions.updateOne({ _id: ctx.params.sessionId }, {
            $set: {
                lastUse: new Date()
            }
        });
        return { success: true };
    }
};
//# sourceMappingURL=updateSessionLastUse.js.map