import { describe, expect, it } from "vitest";

describe("Docker Compose import/export logic", () => {
	interface INodeInfo {
		id: number;
		type: string;
		x: number;
		y: number;
		fields: Record<string, unknown>;
	}

	interface IDockerComposeService {
		image?: string;
		environment?: Record<string, string>;
		volumes?: string[];
		ports?: string[];
		networks?: string[];
		command?: string[];
	}

	interface IDockerCompose {
		services: Record<string, IDockerComposeService>;
		networks?: Record<string, Record<string, never>>;
	}

	function parseDockerCompose(yamlData: any): INodeInfo[] {
		const services = yamlData.services || {};
		const networks = Object.keys(yamlData.networks || {});
		const nodes: INodeInfo[] = [];
		let nextId = 1;

		const groups: Record<string, string[]> = {};
		const defaultGroup = '_default_';

		for (const [svcName, svc] of Object.entries(services)) {
			const service = svc as any;
			const nodeType = chooseNodeTypeForService(service);

			const env = parseEnv(service.environment);
			const volumes = parseVolumes(service.volumes);
			const ports = parsePorts(service.ports);

			const fields: Record<string, unknown> = {};

			if (nodeType === 'redis') {
				const password = env?.REDIS_PASSWORD;
				if (password) fields.password = password;
				if (ports) fields.port = parseInt(ports[0].split(':')[0]) || 6379;
			} else if (nodeType === 'mongo') {
				if (env?.MONGO_INITDB_DATABASE) fields.database = env.MONGO_INITDB_DATABASE;
				if (env?.MONGO_INITDB_ROOT_USERNAME) fields.username = env.MONGO_INITDB_ROOT_USERNAME;
				if (env?.MONGO_INITDB_ROOT_PASSWORD) fields.password = env.MONGO_INITDB_ROOT_PASSWORD;
				if (ports) fields.port = parseInt(ports[0].split(':')[0]) || 27017;
			} else if (nodeType === 'docker') {
				if (service.image) fields.image = service.image;
				if (env) fields.environment = env;
				if (volumes) fields.volumes = volumes;
				if (ports) fields.ports = ports;
			}

			if (Array.isArray(service.networks) && service.networks.length > 0) {
				fields.networks = service.networks;
				const primaryNetwork = service.networks[0];
				groups[primaryNetwork] = groups[primaryNetwork] || [];
				groups[primaryNetwork].push(svcName);
			} else if (typeof service.network === 'string') {
				fields.network = service.network;
				groups[service.network] = groups[service.network] || [];
				groups[service.network].push(svcName);
			} else if (networks.length === 1) {
				fields.network = networks[0];
				groups[networks[0]] = groups[networks[0]] || [];
				groups[networks[0]].push(svcName);
			} else {
				groups[defaultGroup] = groups[defaultGroup] || [];
				groups[defaultGroup].push(svcName);
			}

			nodes.push({ id: nextId++, type: nodeType, x: 0, y: 0, fields });
		}

		const SPACING_X = 80;
		const SPACING_Y = 40;
		const NODE_WIDTH = 200;
		const NODE_HEIGHT = 100;

		const groupNames = Object.keys(groups).sort();
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

		return nodes;
	}

	function generateDockerCompose(nodes: INodeInfo[]): IDockerCompose {
		const services: Record<string, IDockerComposeService> = {};
		const networkSet = new Set<string>();

		for (const node of nodes) {
			const service = mapNodeToService(node);
			if (!service) continue;

			const networks = extractNetworkNames(node.fields);
			if (networks.length > 0) {
				service.networks = networks;
				networks.forEach(name => networkSet.add(name));
			}

			const name = `${node.type}-${node.id}`;
			services[name] = service;
		}

		const compose: IDockerCompose = { services };
		if (networkSet.size > 0) {
			const networksRecord: Record<string, Record<string, never>> = {};
			networkSet.forEach(name => {
				networksRecord[name] = {};
			});
			compose.networks = networksRecord;
		}

		return compose;
	}

	function chooseNodeTypeForService(svc: any): string {
		const image = svc.image;
		const env = parseEnv(svc.environment);

		if (image === "redis:7-alpine" && env?.REDIS_PASSWORD) return 'redis';
		if (image === "mongo:7" && env?.MONGO_INITDB_DATABASE) return 'mongo';
		return 'docker';
	}

	function parseEnv(env: any): Record<string, string> | undefined {
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
		if (typeof env === 'object' && env !== null) {
			const out: Record<string, string> = {};
			Object.entries(env).forEach(([k, v]) => { 
				out[k] = v === undefined || v === null ? '' : String(v); 
			});
			return Object.keys(out).length ? out : undefined;
		}
		return undefined;
	}

	function parseVolumes(vols: any): Record<string, string> | undefined {
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
		} else if (typeof vols === 'object' && vols !== null) {
			Object.entries(vols).forEach(([k, val]) => {
				if (typeof val === 'string') result[k] = val;
				else result[k] = '';
			});
		}
		return Object.keys(result).length ? result : undefined;
	}

	function parsePorts(ports: any): string[] | undefined {
		if (!ports || !Array.isArray(ports)) return undefined;
		return ports.map(p => String(p));
	}

	function mapNodeToService(node: INodeInfo): IDockerComposeService | null {
		const fields = node.fields;

		if (node.type === "redis") {
			const password = typeof fields.password === "string" ? fields.password : undefined;
			const port = typeof fields.port === "number" ? fields.port : 6379;
			const environment = password ? { REDIS_PASSWORD: password } : undefined;
			const command = password ? ["redis-server", "--requirepass", password] : undefined;
			return { 
				image: "redis:7-alpine", 
				environment, 
				command, 
				ports: [`${port}:6379`] 
			};
		}

		if (node.type === "mongo") {
			const database = typeof fields.database === "string" ? fields.database : undefined;
			const username = typeof fields.username === "string" ? fields.username : undefined;
			const password = typeof fields.password === "string" ? fields.password : undefined;
			const port = typeof fields.port === "number" ? fields.port : 27017;
			const environment: Record<string, string> = {};
			if (database) environment.MONGO_INITDB_DATABASE = database;
			if (username) environment.MONGO_INITDB_ROOT_USERNAME = username;
			if (password) environment.MONGO_INITDB_ROOT_PASSWORD = password;
			return { 
				image: "mongo:7", 
				environment: Object.keys(environment).length ? environment : undefined, 
				ports: [`${port}:27017`] 
			};
		}

		if (node.type === "docker") {
			const image = typeof fields.image === "string" && fields.image.length ? fields.image : undefined;
			const environment = fields.environment && typeof fields.environment === 'object' ? fields.environment as Record<string, string> : undefined;
			const volumes = fields.volumes && typeof fields.volumes === 'object' ? fields.volumes as Record<string, string> : undefined;
			const ports = Array.isArray(fields.ports) ? fields.ports as string[] : undefined;
			
			const volumeArray = volumes ? Object.entries(volumes).map(([host, container]) => `${host}:${container}`) : undefined;
			
			const service: IDockerComposeService = {};
			if (image) service.image = image;
			if (environment && Object.keys(environment).length > 0) service.environment = environment;
			if (volumeArray && volumeArray.length > 0) service.volumes = volumeArray;
			if (ports && ports.length > 0) service.ports = ports;
			
			return Object.keys(service).length > 0 ? service : null;
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

	describe("Import scenarios", () => {
		it("should import a complete multi-service Docker Compose configuration", () => {
			const complexYaml = {
				version: "3.8",
				services: {
					redis: {
						image: "redis:7-alpine",
						environment: {
							REDIS_PASSWORD: "cache-secret"
						},
						ports: ["6379:6379"],
						networks: ["backend"]
					},
					database: {
						image: "mongo:7",
						environment: {
							MONGO_INITDB_DATABASE: "app",
							MONGO_INITDB_ROOT_USERNAME: "admin",
							MONGO_INITDB_ROOT_PASSWORD: "mongo-secret"
						},
						ports: ["27017:27017"],
						networks: ["backend"]
					},
					app: {
						image: "ghcr.io/example/app:latest",
						ports: ["8080:80"],
						volumes: ["./app:/usr/src/app"],
						environment: {
							NODE_ENV: "production",
							DATABASE_URL: "mongodb://admin:mongo-secret@database:27017/app"
						},
						networks: ["frontend", "backend"]
					},
					nginx: {
						image: "nginx:alpine",
						ports: ["80:80", "443:443"],
						volumes: ["./nginx.conf:/etc/nginx/nginx.conf"],
						networks: ["frontend"]
					}
				},
				networks: {
					frontend: {},
					backend: {}
				}
			};

			const nodes = parseDockerCompose(complexYaml);

			expect(nodes).toHaveLength(4);
			
			const redisNode = nodes.find(n => n.type === "redis");
			expect(redisNode).toBeDefined();
			expect(redisNode?.fields).toMatchObject({ 
				password: "cache-secret", 
				port: 6379,
				networks: ["backend"]
			});

			const mongoNode = nodes.find(n => n.type === "mongo");
			expect(mongoNode).toBeDefined();
			expect(mongoNode?.fields).toMatchObject({
				database: "app",
				username: "admin",
				password: "mongo-secret",
				port: 27017,
				networks: ["backend"]
			});

			const dockerNodes = nodes.filter(n => n.type === "docker");
			expect(dockerNodes).toHaveLength(2);

			const appNode = dockerNodes.find(n => n.fields.image === "ghcr.io/example/app:latest");
			expect(appNode?.fields).toMatchObject({
				image: "ghcr.io/example/app:latest",
				ports: ["8080:80"],
				volumes: { "./app": "/usr/src/app" },
				environment: {
					NODE_ENV: "production",
					DATABASE_URL: "mongodb://admin:mongo-secret@database:27017/app"
				}
			});
		});

		it("should handle services with array-based environment variables", () => {
			const yamlWithArrayEnv = {
				services: {
					redis: {
						image: "redis:7-alpine",
						environment: [
							"REDIS_PASSWORD=secret123",
							"REDIS_DB=0"
						]
					}
				}
			};

			const nodes = parseDockerCompose(yamlWithArrayEnv);
			const redisNode = nodes.find(n => n.type === "redis");
			
			expect(redisNode?.fields).toMatchObject({
				password: "secret123"
			});
		});

		it("should handle services with volume mappings", () => {
			const yamlWithVolumes = {
				services: {
					app: {
						image: "node:20-alpine",
						volumes: [
							"./src:/app/src",
							"./package.json:/app/package.json",
							"/var/log/app:/app/logs"
						]
					}
				}
			};

			const nodes = parseDockerCompose(yamlWithVolumes);
			const appNode = nodes.find(n => n.type === "docker");
			
			expect(appNode?.fields.volumes).toEqual({
				"./src": "/app/src",
				"./package.json": "/app/package.json",
				"/var/log/app": "/app/logs"
			});
		});

		it("should handle services without networks (default grouping)", () => {
			const yamlWithoutNetworks = {
				services: {
					service1: { image: "nginx:alpine" },
					service2: { image: "redis:7-alpine" }
				}
			};

			const nodes = parseDockerCompose(yamlWithoutNetworks);
			expect(nodes).toHaveLength(2);
			expect(nodes[0].x).toBe(nodes[1].x);
		});
	});

	describe("Export scenarios", () => {
		it("should export a complex multi-service configuration", () => {
			const nodes: INodeInfo[] = [
				{
					id: 1,
					type: "redis",
					x: 0,
					y: 0,
					fields: { 
						password: "redis-secret", 
						port: 6379, 
						network: "backend" 
					}
				},
				{
					id: 2,
					type: "mongo",
					x: 0,
					y: 100,
					fields: {
						database: "myapp",
						username: "root",
						password: "mongo-pass",
						port: 27017,
						network: "backend"
					}
				},
				{
					id: 3,
					type: "docker",
					x: 200,
					y: 0,
					fields: {
						image: "nginx:alpine",
						ports: ["80:80", "443:443"],
						volumes: { "./nginx.conf": "/etc/nginx/nginx.conf" },
						environment: { NODE_ENV: "production" },
						networks: ["frontend", "backend"]
					}
				}
			];

			const compose = generateDockerCompose(nodes);

			expect(compose.services).toHaveProperty("redis-1");
			expect(compose.services).toHaveProperty("mongo-2");
			expect(compose.services).toHaveProperty("docker-3");

			expect(compose.services["redis-1"]).toMatchObject({
				image: "redis:7-alpine",
				environment: { REDIS_PASSWORD: "redis-secret" },
				ports: ["6379:6379"],
				networks: ["backend"]
			});

			expect(compose.services["mongo-2"]).toMatchObject({
				image: "mongo:7",
				environment: {
					MONGO_INITDB_DATABASE: "myapp",
					MONGO_INITDB_ROOT_USERNAME: "root",
					MONGO_INITDB_ROOT_PASSWORD: "mongo-pass"
				},
				ports: ["27017:27017"],
				networks: ["backend"]
			});

			expect(compose.services["docker-3"]).toMatchObject({
				image: "nginx:alpine",
				ports: ["80:80", "443:443"],
				volumes: ["./nginx.conf:/etc/nginx/nginx.conf"],
				environment: { NODE_ENV: "production" },
				networks: ["frontend", "backend"]
			});

			expect(compose.networks).toMatchObject({
				backend: {},
				frontend: {}
			});
		});

		it("should handle services with multiple networks", () => {
			const nodes: INodeInfo[] = [
				{
					id: 1,
					type: "docker",
					x: 0,
					y: 0,
					fields: {
						image: "traefik:v2.10",
						ports: ["80:80", "443:443", "8080:8080"],
						networks: ["web", "internal", "monitoring"]
					}
				}
			];

			const compose = generateDockerCompose(nodes);

			expect(compose.services["docker-1"].networks).toEqual(["web", "internal", "monitoring"]);
			expect(compose.networks).toMatchObject({
				web: {},
				internal: {},
				monitoring: {}
			});
		});

		it("should handle services without networks", () => {
			const nodes: INodeInfo[] = [
				{
					id: 1,
					type: "docker",
					x: 0,
					y: 0,
					fields: {
						image: "hello-world",
						ports: ["8080:80"]
					}
				}
			];

			const compose = generateDockerCompose(nodes);

			expect(compose.services["docker-1"]).toMatchObject({
				image: "hello-world",
				ports: ["8080:80"]
			});
			expect(compose.networks).toBeUndefined();
		});
	});

	describe("Round-trip scenarios", () => {
		it("should maintain data integrity through import-export cycle", () => {
			const originalYaml = {
				services: {
					redis: {
						image: "redis:7-alpine",
						environment: { REDIS_PASSWORD: "test-pass" },
						ports: ["6379:6379"],
						networks: ["backend"]
					},
					app: {
						image: "node:20-alpine",
						ports: ["3000:3000"],
						volumes: { "./src": "/app/src" },
						environment: { NODE_ENV: "development" },
						networks: ["frontend", "backend"]
					}
				},
				networks: {
					frontend: {},
					backend: {}
				}
			};

			const nodes = parseDockerCompose(originalYaml);
			expect(nodes).toHaveLength(2);

			const exportedCompose = generateDockerCompose(nodes);

			expect(exportedCompose.services["redis-1"]).toMatchObject({
				image: "redis:7-alpine",
				environment: { REDIS_PASSWORD: "test-pass" },
				ports: ["6379:6379"],
				networks: ["backend"]
			});

			expect(exportedCompose.services["docker-2"]).toMatchObject({
				image: "node:20-alpine",
				ports: ["3000:3000"],
				volumes: ["./src:/app/src"],
				environment: { NODE_ENV: "development" },
				networks: ["frontend", "backend"]
			});

			expect(exportedCompose.networks).toMatchObject({
				frontend: {},
				backend: {}
			});
		});

		it("should handle edge cases in round-trip conversion", () => {
			const edgeCaseYaml = {
				services: {
					service1: {
						image: "nginx:alpine",
						environment: {
							EMPTY_VAR: "",
							NULL_VAR: null,
							UNDEFINED_VAR: undefined
						},
						volumes: [],
						ports: []
					}
				}
			};

			const nodes = parseDockerCompose(edgeCaseYaml);
			const exportedCompose = generateDockerCompose(nodes);

			expect(exportedCompose.services["docker-1"]).toMatchObject({
				image: "nginx:alpine"
			});
			expect(exportedCompose.services["docker-1"].volumes).toBeUndefined();
			expect(exportedCompose.services["docker-1"].ports).toBeUndefined();
		});
	});
});
