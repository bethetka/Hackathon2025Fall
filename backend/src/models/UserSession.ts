import { getModelForClass, prop, type Ref } from '@typegoose/typegoose';
import { User } from './User.js';
import { TimeStamps, type Base } from '@typegoose/typegoose/lib/defaultClasses.js';
import type { Types } from 'mongoose';

export class UserSession extends TimeStamps {
  public _id!: Types.ObjectId;

  @prop({ ref: () => User, required: true })
  public user!: Ref<User>;

  @prop({ required: true })
  public userAgent!: string;

  @prop({ required: true }) 
  public lastUse!: Date;
}

export const UserSessions = getModelForClass(UserSession);