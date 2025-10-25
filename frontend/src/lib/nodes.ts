import redisIcon from "../icons/tech/redis.svg";
import mongoIcon from "../icons/tech/mongo.svg";
import nodeIcon from "../icons/tech/node.svg";
import dockerIcon from "../icons/tech/docker.svg";
import dbIcon from "../icons/tech/database.svg";
import serviceIcon from "../icons/tech/service.svg";
import * as z from "zod";

export interface INodeType {
    icon: string;
    name: string;
    parameters: z.ZodType;
}

export const nodeTypes: Record<string, INodeType> = {
    "redis": {
        icon: redisIcon,
        name: "Redis",
        parameters: z.object({
            password: z.string()
        })
    },
    "mongo": { 
        icon: mongoIcon, 
        name: "MongoDB", 
        parameters: z.object({
            database: z.string(),
            username: z.string(),
            password: z.string()
        }) 
    },
    "node": { 
        icon: nodeIcon, 
        name: "NodeJS", 
        parameters: z.object() 
    },
    "docker": { 
        icon: dockerIcon, 
        name: "Docker", 
        parameters: z.object() 
    },
}

export interface ICategoryForCreation {
    name: string;
    icon: string;
    variants: Record<string, string>;
}

export const categoriesForCreation: Record<string, ICategoryForCreation> = {
    "database": {
        icon: dbIcon,
        name: "Database",
        variants: {
            "Redis": "redis",
            "MongoDB": "mongo"
        }
    },
    "service": {
        icon: serviceIcon,
        name: "Application Service",
        variants: {
            "NodeJS": "node",
            "Dockerfile": "docker"
        }
    }
}