import type { INodeInfo } from "@/components/hackathon/node";

interface IDockerComposeService {
    image: string;
    environment: Record<string, string>;
    volumes: Record<string, string>;

}

interface IDockerCompose {
    services: IDockerComposeService[];
}

function generateDockerCompose(nodes: INodeInfo[]): IDockerCompose {
    return {services: []}
}