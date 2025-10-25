import type { INodeInfo } from "@/components/hackathon/node";
import { nodeTypes } from "./nodes";

interface IDockerComposeService {
    image: string;
    environment: Record<string, string>;
    volumes: Record<string, string>;

}

interface IDockerCompose {
    services: IDockerComposeService[];
}

function generateDockerCompose(nodes: INodeInfo[]): IDockerCompose {
    let services: IDockerComposeService[] = [];

    // for (const node of nodes) {
    //     let nodeType = nodeTypes[node.type]!;
    //     switch (node.type) {
    //         case "docker":
    //             break;
    //         default:
    //             console.warn(node.type, "unsupported")
    //     }   
    // }

    return { services }
}