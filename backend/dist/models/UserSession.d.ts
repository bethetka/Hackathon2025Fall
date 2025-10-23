import { type Ref } from '@typegoose/typegoose';
import { User } from './User.js';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses.js';
import type { Types } from 'mongoose';
export declare class UserSession extends TimeStamps {
    _id: Types.ObjectId;
    user: Ref<User>;
    userAgent: string;
    lastUse: Date;
}
export declare const UserSessions: import("@typegoose/typegoose").ReturnModelType<typeof UserSession, import("@typegoose/typegoose/lib/types.js").BeAnObject>;
//# sourceMappingURL=UserSession.d.ts.map