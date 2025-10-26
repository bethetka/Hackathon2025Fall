import yaml from 'js-yaml';
import { NODE_HEIGHT, NODE_WIDTH, type INodeInfo } from '@/components/hackathon/node';
import { nodeTypes } from './nodes';

const DEFAULT_NODE_IMAGE = "node:20-alpine";
const DEFAULT_REDIS_IMAGE = "redis:7-alpine";
const DEFAULT_MONGO_IMAGE = "mongo:7";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEnv(env: unknown): Record<string, string> | undefined {
  if (!env) return undefined;
  if (Array.isArray(env)) {
    const result: Record<string, string> = {};
    for (const entry of env) {
      if (typeof entry === 'string') {
        const idx = entry.indexOf('=');
        if (idx === -1) continue;
        const key = entry.slice(0, idx);
        const val = entry.slice(idx + 1);
        result[key] = val;
      }
    }
    return Object.keys(result).length ? result : undefined;
  }
  if (isRecord(env)) {
    const out: Record<string, string> = {};
    Object.entries(env).forEach(([k, v]) => { out[k] = v === undefined || v === null ? '' : String(v); });
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

function parseVolumes(vols: unknown): Record<string, string> | undefined {
  if (!vols) return undefined;
  const result: Record<string, string> = {};
  if (Array.isArray(vols)) {
    for (const v of vols) {
      if (typeof v !== 'string') continue;
      const parts = v.split(':');
      if (parts.length >= 2) {
        const host = parts[0];
        const container = parts.slice(1).join(':');
        result[host] = container;
      }
    }
  } else if (isRecord(vols)) {
    Object.entries(vols).forEach(([k, val]) => {
      if (typeof val === 'string') result[k] = val;
      else result[k] = '';
    });
  }
  return Object.keys(result).length ? result : undefined;
}

function parsePorts(ports: unknown): string[] | undefined {
  if (!ports) return undefined;
  if (!Array.isArray(ports)) return undefined;
  const out: string[] = [];
  for (const p of ports) {
    out.push(String(p));
  }
  return out.length ? out : undefined;
}

function chooseNodeTypeForService(svc: Record<string, unknown>): string {
  const image = typeof svc.image === 'string' ? svc.image : undefined;
  const env = parseEnv(svc.environment ?? svc.env_file ?? svc.environment);
  if (image === DEFAULT_NODE_IMAGE) return 'node';

  if (image === DEFAULT_REDIS_IMAGE) {
    if (env?.REDIS_PASSWORD) return 'redis';
    if (Array.isArray(svc.command) && svc.command.some(c => typeof c === 'string' && c.includes('--requirepass'))) return 'redis';
  }

  if (image === DEFAULT_MONGO_IMAGE) {
    if (env?.MONGO_INITDB_DATABASE && env.MONGO_INITDB_ROOT_USERNAME && env.MONGO_INITDB_ROOT_PASSWORD) return 'mongo';
  }

  if (Array.isArray(svc.command) && svc.command.some(c => typeof c === 'string' && c.includes('redis-server'))) {
    if (env?.REDIS_PASSWORD) return 'redis';
  }

  if (env && env.MONGO_INITDB_ROOT_USERNAME && env.MONGO_INITDB_ROOT_PASSWORD && env.MONGO_INITDB_DATABASE) return 'mongo';

  return 'docker';
}

export function parseDockerCompose(yamlText: string): INodeInfo[] {
  const doc = yaml.load(yamlText);
  if (!isRecord(doc)) throw new Error('Invalid compose YAML');

  const services = isRecord(doc.services) ? doc.services as Record<string, unknown> : {};
  const networks = isRecord(doc.networks) ? Object.keys(doc.networks || {}) : [];

  const nodes: INodeInfo[] = [];
  let nextId = 1;

  const groups: Record<string, string[]> = {};
  const defaultGroup = '_default_';

  for (const [svcName, svcRaw] of Object.entries(services)) {
    if (!isRecord(svcRaw)) continue;
    const svc = svcRaw as Record<string, unknown>;
    const nodeType = chooseNodeTypeForService(svc);

    const env = parseEnv(svc.environment ?? svc.env_file ?? svc.environment);
    const volumes = parseVolumes(svc.volumes);
    const ports = parsePorts(svc.ports);

    const fields: Record<string, unknown> = {};

    if (nodeType === 'redis') {
      const password = env?.REDIS_PASSWORD;
      if (password) fields.password = password;
    } else if (nodeType === 'mongo') {
      if (env?.MONGO_INITDB_DATABASE) fields.database = env.MONGO_INITDB_DATABASE;
      if (env?.MONGO_INITDB_ROOT_USERNAME) fields.username = env.MONGO_INITDB_ROOT_USERNAME;
      if (env?.MONGO_INITDB_ROOT_PASSWORD) fields.password = env.MONGO_INITDB_ROOT_PASSWORD;
    } else if (nodeType === 'node') {
      //
    } else if (nodeType === 'docker') {
      if (typeof svc.image === 'string') fields.image = svc.image;
      if (env) fields.environment = env;
      if (volumes) fields.volumes = volumes;
      if (ports) fields.ports = ports as unknown as string[];
      if (!fields.image) {
        fields.image = DEFAULT_NODE_IMAGE;
      }
    }

    let assignedNetwork: string | undefined;
    const svcNetworks = svc.networks;
    if (Array.isArray(svcNetworks) && svcNetworks.length > 0) {
      const first = svcNetworks.find(n => typeof n === 'string');
      if (first) assignedNetwork = first as string;
    }
    if (!assignedNetwork && typeof svc.network === 'string') assignedNetwork = svc.network;
    if (!assignedNetwork && networks.length === 1) assignedNetwork = networks[0];

    if (assignedNetwork) {
      fields.network = assignedNetwork;
      groups[assignedNetwork] = groups[assignedNetwork] || [];
      groups[assignedNetwork].push(svcName);
    } else {
      groups[defaultGroup] = groups[defaultGroup] || [];
      groups[defaultGroup].push(svcName);
    }

    nodes.push({ id: nextId++, type: nodeType, x: 0, y: 0, fields });
  }

  const SPACING_X = 80;
  const SPACING_Y = 40;

  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  let col = 0;
  let placed = 0;
  for (const groupName of groupNames) {
    const items = groups[groupName];
    for (let i = 0; i < items.length; i++) {
      const index = placed;
      const node = nodes[index];
      node.x = col * (NODE_WIDTH + SPACING_X) + 40;
      node.y = i * (NODE_HEIGHT + SPACING_Y) + 40;
      placed++;
    }
    col++;
  }

  for (const n of nodes) {
    if (!nodeTypes[n.type]) {
      n.type = 'docker';
    }
  }

  return nodes;
}

export default parseDockerCompose;
