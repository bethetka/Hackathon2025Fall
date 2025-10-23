import { getModelForClass, prop } from '@typegoose/typegoose';
import { TimeStamps, type Base } from '@typegoose/typegoose/lib/defaultClasses.js';
import type { Types } from 'mongoose';

export class User extends TimeStamps {
  public _id!: Types.ObjectId;
  
  @prop({ required: true })
  public username!: string;

  @prop({ required: true })
  public password!: string;
}

export const Users = getModelForClass(User);