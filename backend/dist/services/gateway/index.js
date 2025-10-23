import ApiGatewayService, {} from "moleculer-web";
import { env } from "../../env.js";
import { Errors, MakeError } from "../../utils/Errors.js";
export default {
    name: "gateway",
    mixins: [ApiGatewayService],
    settings: {
        port: env.PORT,
        cors: { methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], origin: "*" },
        routes: [
            {
                path: "/users",
                authorization: false,
                autoAliases: false,
                mappingPolicy: "restrict",
                aliases: {
                    "POST /register": "users.register",
                    "POST /login": "users.login",
                }
            },
            {
                path: "/",
                authorization: true,
                autoAliases: true,
                mappingPolicy: "restrict",
            }
        ],
    },
    methods: {
        async authorize(ctx, route, req, res) {
            const tk = req.headers ? req.headers["x-api-token"] : null;
            if (tk) {
                const result = await ctx.call("users.getSessionByJwt", { jwt: tk });
                if (result == null || result.session == null || result.user == null) {
                    return MakeError(Errors.UNAUTHORIZED);
                }
                const { session, user } = result;
                await ctx.call("users.updateSessionLastUse", { sessionId: session._id.toString() });
                ctx.meta.user = user;
                ctx.meta.session = session;
                return ctx;
            }
            else {
                return MakeError(Errors.UNAUTHORIZED);
            }
        }
    },
    actions: { listAliases: { visibility: "public" } },
};
//# sourceMappingURL=index.js.map