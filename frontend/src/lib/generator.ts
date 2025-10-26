import type { INodeInfo } from "@/components/hackathon/node";
import { nodeTypes } from "./nodes";

export interface IDockerComposeService {
    image?: string;
    build?: string;
    command?: string[] | string;
    environment?: Record<string, string>;
    volumes?: string[];
    ports?: string[];
    depends_on?: string[];
    networks?: string[];
}

export interface IDockerCompose {
    services: Record<string, IDockerComposeService>;
    networks?: Record<string, Record<string, never>>;
}

const DEFAULT_REDIS_IMAGE = "redis:7-alpine";
const DEFAULT_MONGO_IMAGE = "mongo:7";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringRecord(value: unknown): Record<string, string> | undefined {
    if (!isRecord(value)) return undefined;
    const entries = Object.entries(value).map(([k, v]) => [k, String(v)]);
    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries);
}

function toStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const result = value.map(item => String(item)).filter(item => item.length > 0);
    return result.length > 0 ? result : undefined;
}

function buildVolumes(record: Record<string, string> | undefined): string[] | undefined {
    if (!record) return undefined;
    const entries = Object.entries(record).map(([host, container]) => `${host}:${container}`);
    return entries.length > 0 ? entries : undefined;
}

function makeServiceName(node: INodeInfo): string {
    return `${node.type}-${node.id}`;
}

function mapNodeToService(node: INodeInfo): IDockerComposeService | null {
    const definition = nodeTypes[node.type];
    if (!definition) return null;
    const fields = node.fields as Record<string, unknown>;
    if (node.type === "redis") {
        const password = typeof fields.password === "string" ? String(fields.password) : undefined;
        const port = typeof fields.port === "number" ? Number(fields.port) : 6379;
        const environment = password ? { REDIS_PASSWORD: password } : undefined;
        const command = password ? ["redis-server", "--requirepass", password] : undefined;
        return { image: DEFAULT_REDIS_IMAGE, environment, command, ports: [`${port}:6379`] };
    }
    if (node.type === "mongo") {
        const database = typeof fields.database === "string" ? String(fields.database) : undefined;
        const username = typeof fields.username === "string" ? String(fields.username) : undefined;
        const password = typeof fields.password === "string" ? String(fields.password) : undefined;
        const port = typeof fields.port === "number" ? Number(fields.port) : 27017;
        const environment: Record<string, string> = {};
        if (database) environment.MONGO_INITDB_DATABASE = database;
        if (username) environment.MONGO_INITDB_ROOT_USERNAME = username;
        if (password) environment.MONGO_INITDB_ROOT_PASSWORD = password;
        return { image: DEFAULT_MONGO_IMAGE, environment: Object.keys(environment).length ? environment : undefined, ports: [`${port}:27017`] };
    }
    if (node.type === "docker") {
        const image = typeof fields.image === "string" && fields.image.length ? String(fields.image) : undefined;
        const environment = toStringRecord(fields.environment);
        const volumes = buildVolumes(toStringRecord(fields.volumes));
        const ports = toStringArray(fields.ports);
        return { image, environment, volumes, ports };
    }
    return null;
}

function extractNetworkNames(fields: Record<string, unknown>): string[] {
    const result = new Set<string>();
    const single = fields.network;
    if (typeof single === "string") {
        const trimmed = single.trim();
        if (trimmed.length) result.add(trimmed);
    }
    const multiple = fields.networks;
    if (Array.isArray(multiple)) {
        multiple.forEach(entry => {
            if (typeof entry === "string") {
                const trimmed = entry.trim();
                if (trimmed.length) result.add(trimmed);
            }
        });
    }
    return Array.from(result);
}

function serializeScalar(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    const str = String(value);
    if (/^[\w@%.:/+-]+$/.test(str)) return str;
    return JSON.stringify(str);
}

function serializeYaml(value: unknown, indent = 0): string {
    const pad = "  ".repeat(indent);
    if (Array.isArray(value)) {
        return value.map(item => {
            if (Array.isArray(item) || isRecord(item)) {
                return `${pad}-\n${serializeYaml(item, indent + 1)}`;
            }
            return `${pad}- ${serializeScalar(item)}`;
        }).join("\n");
    }
    if (isRecord(value)) {
        return Object.entries(value).map(([key, val]) => {
            if (Array.isArray(val) || isRecord(val)) {
                const nested = serializeYaml(val, indent + 1);
                if (!nested) return `${pad}${key}: {}`;
                return `${pad}${key}:\n${nested}`;
            }
            if (val === undefined) return "";
            return `${pad}${key}: ${serializeScalar(val)}`;
        }).filter(Boolean).join("\n");
    }
    return `${pad}${serializeScalar(value)}`;
}

export function generateDockerCompose(nodes: INodeInfo[]): IDockerCompose {
    const services: Record<string, IDockerComposeService> = {};
    const networkSet = new Set<string>();
    for (const node of nodes) {
        const service = mapNodeToService(node);
        if (!service) continue;
        const networks = extractNetworkNames(node.fields as Record<string, unknown>);
        if (networks.length > 0) {
            service.networks = networks;
            networks.forEach(name => networkSet.add(name));
        }
        const name = makeServiceName(node);
        services[name] = Object.fromEntries(Object.entries(service).filter(([_, value]) => {
            if (value === undefined) return false;
            if (Array.isArray(value)) return value.length > 0;
            if (isRecord(value)) return Object.keys(value).length > 0;
            return true;
        })) as IDockerComposeService;
    }
    const compose: IDockerCompose = {
        services
    };
    if (networkSet.size > 0) {
        const networksRecord: Record<string, Record<string, never>> = {};
        networkSet.forEach(name => {
            networksRecord[name] = {};
        });
        compose.networks = networksRecord;
    }
    return compose;
}

export function buildDockerComposeYaml(nodes: INodeInfo[]): string {
    const compose = generateDockerCompose(nodes);
    return serializeYaml(compose);
}
