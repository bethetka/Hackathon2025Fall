import redis from "../icons/tech/redis.svg";
import mongo from "../icons/tech/mongo.svg";
import node from "../icons/tech/node.svg";
import docker from "../icons/tech/docker.svg";

interface INodeType {
    icon: string;
    name: string;
}

export const nodes: Record<string, INodeType> = {
    "redis": {icon: redis, name: "Redis"},
    "mongo": {icon: mongo, name: "MongoDB"},
    "node": {icon: node, name: "NodeJS"},
    "docker": {icon: docker, name: "Docker"},
}