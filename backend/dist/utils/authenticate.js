import { Errors, MakeError } from "./Errors.js";
export async function authenticate(ctx) {
    const meta = ctx.meta;
    if (!meta.user || !meta.session) {
        return MakeError(Errors.UNAUTHORIZED);
    }
    return true;
}
//# sourceMappingURL=authenticate.js.map