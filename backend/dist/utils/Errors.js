import { Errors as MErrors } from "moleculer";
const { MoleculerError } = MErrors;
var Errors;
(function (Errors) {
    // common
    Errors[Errors["SOMETHING_WENT_WRONG"] = 0] = "SOMETHING_WENT_WRONG";
    Errors[Errors["NOT_IMPLEMENTED"] = 1] = "NOT_IMPLEMENTED";
    Errors[Errors["VALIDATION_ERROR"] = 2] = "VALIDATION_ERROR";
    Errors[Errors["INSUFFICIENT_PERMISSIONS"] = 3] = "INSUFFICIENT_PERMISSIONS";
    // users
    Errors[Errors["UNAUTHORIZED"] = 4] = "UNAUTHORIZED";
    Errors[Errors["USER_WITH_THIS_USERNAME_ALREADY_EXISTS"] = 5] = "USER_WITH_THIS_USERNAME_ALREADY_EXISTS";
    Errors[Errors["INVALID_CREDENTIALS"] = 6] = "INVALID_CREDENTIALS";
    Errors[Errors["YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE"] = 7] = "YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE";
    Errors[Errors["SESSION_NOT_FOUND"] = 8] = "SESSION_NOT_FOUND";
    Errors[Errors["USER_NOT_FOUND"] = 9] = "USER_NOT_FOUND";
})(Errors || (Errors = {}));
const CodeRecord = {
    404: [],
    403: [Errors.INSUFFICIENT_PERMISSIONS],
    401: [Errors.UNAUTHORIZED, Errors.INVALID_CREDENTIALS],
    400: [
        Errors.USER_NOT_FOUND,
        Errors.USER_WITH_THIS_USERNAME_ALREADY_EXISTS,
        Errors.VALIDATION_ERROR,
        Errors.YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE,
        Errors.SESSION_NOT_FOUND,
    ],
    500: [Errors.SOMETHING_WENT_WRONG],
    501: [Errors.NOT_IMPLEMENTED]
};
const CodeMap = new Map;
for (let code in CodeRecord)
    CodeRecord[code].forEach(value => CodeMap.set(value, Number(code)));
class ErrorBuilder {
    error;
    options = { message: "", data: null };
    constructor(error) {
        this.error = error;
        return new Proxy(this, {
            get: (target, prop) => {
                if (prop in target)
                    return target[prop];
                return target.createError();
            }
        });
    }
    message(message) {
        this.options.message = message;
        return this;
    }
    data(data) {
        this.options.data = data;
        return this;
    }
    createError = () => {
        return new MoleculerError(this.options?.message ?? "", CodeMap.get(this.error) ?? 403, Errors[this.error], this.options?.data);
    };
}
const MakeError = (error, options) => Promise.reject(new MoleculerError(options?.message ?? "", CodeMap.get(error) ?? 403, Errors[error], options?.data));
export { Errors, MakeError, ErrorBuilder, MoleculerError };
//# sourceMappingURL=Errors.js.map