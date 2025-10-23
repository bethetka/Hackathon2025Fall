import createSession from "./actions/createSession.js";
import getSessionByJwt from "./actions/getSessionByJwt.js";
import getSessions from "./actions/getSessions.js";
import getSessionsPublic from "./actions/getSessionsPublic.js";
import login from "./actions/login.js";
import me from "./actions/me.js";
import register from "./actions/register.js";
import updateSessionLastUse from "./actions/updateSessionLastUse.js";
import deleteSessionPublic from "./actions/deleteSessionPublic.js";
export default {
    name: "users",
    settings: {
        rest: "users"
    },
    actions: {
        createSession,
        deleteSessionPublic,
        getSessionByJwt,
        getSessions,
        getSessionsPublic,
        login,
        me,
        register,
        updateSessionLastUse,
    }
};
//# sourceMappingURL=index.js.map