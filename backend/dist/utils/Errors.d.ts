import { Errors as MErrors } from "moleculer";
declare const MoleculerError: typeof MErrors.MoleculerError;
declare enum Errors {
    SOMETHING_WENT_WRONG = 0,
    NOT_IMPLEMENTED = 1,
    VALIDATION_ERROR = 2,
    INSUFFICIENT_PERMISSIONS = 3,
    UNAUTHORIZED = 4,
    USER_WITH_THIS_USERNAME_ALREADY_EXISTS = 5,
    INVALID_CREDENTIALS = 6,
    YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE = 7,
    SESSION_NOT_FOUND = 8,
    USER_NOT_FOUND = 9
}
declare class ErrorBuilder {
    private error;
    private options;
    constructor(error: Errors);
    message(message: string): ErrorBuilder;
    data(data: any): ErrorBuilder;
    private createError;
}
declare const MakeError: (error: Errors, options?: {
    message?: string;
    data?: any;
}) => Promise<never>;
export { Errors, MakeError, ErrorBuilder, MoleculerError };
//# sourceMappingURL=Errors.d.ts.map