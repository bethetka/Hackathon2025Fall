import redis from "../icons/tech/redis.svg";
import mongo from "../icons/tech/mongo.svg";
import node from "../icons/tech/node.svg";
import docker from "../icons/tech/docker.svg";
import * as z from "zod";

export interface INodeType {
    icon: string;
    name: string;
    parameters: z.ZodType;
}

export const nodeTypes: Record<string, INodeType> = {
    "redis": {
        icon: redis,
        name: "Redis",
        parameters: z.object({
            password: z.string()
        })
    },
    "mongo": { 
        icon: mongo, 
        name: "MongoDB", 
        parameters: z.object({
            database: z.string(),
            username: z.string(),
            password: z.string()
        }) 
    },
    "node": { 
        icon: node, 
        name: "NodeJS", 
        parameters: z.object() 
    },
    "docker": { 
        icon: docker, 
        name: "Docker", 
        parameters: z.object() 
    },
}
