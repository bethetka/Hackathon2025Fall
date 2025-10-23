import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses.js';
import type { Types } from 'mongoose';
export declare class User extends TimeStamps {
    _id: Types.ObjectId;
    username: string;
    password: string;
}
export declare const Users: import("@typegoose/typegoose").ReturnModelType<typeof User, import("@typegoose/typegoose/lib/types.js").BeAnObject>;
//# sourceMappingURL=User.d.ts.map