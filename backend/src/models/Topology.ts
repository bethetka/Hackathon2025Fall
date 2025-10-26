import { getModelForClass, modelOptions, prop, type Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses.js";
import type { Types } from "mongoose";
import { User } from "./User.js";

@modelOptions({ schemaOptions: { _id: false } })
export class TopologyNode {
	@prop({ required: true })
	public id!: number;

	@prop({ required: true })
	public type!: string;

	@prop({ required: true })
	public x!: number;

	@prop({ required: true })
	public y!: number;

	@prop({ type: () => Object, default: {} })
	public fields!: Record<string, unknown>;
}

export class Topology extends TimeStamps {
	public _id!: Types.ObjectId;

	@prop({ ref: () => User, required: true })
	public owner!: Ref<User>;

	@prop({ required: true, trim: true })
	public name!: string;

	@prop({ trim: true })
	public description?: string;

	@prop({ required: true, type: () => [TopologyNode], default: [] })
	public nodes!: TopologyNode[];
}

export const Topologies = getModelForClass(Topology);
