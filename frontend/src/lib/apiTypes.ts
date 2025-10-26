export interface ApiUser {
	_id: string;
	username: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface ApiSession {
	_id: string;
	user: string;
	userAgent: string;
	lastUse: string;
	createdAt?: string;
	updatedAt?: string;
	current?: boolean;
}

export interface AuthResponse {
	user: ApiUser;
	session: ApiSession;
	jwt: string;
}

export interface ApiTopologyNode {
	id: number;
	type: string;
	x: number;
	y: number;
	fields: Record<string, unknown>;
}

export interface ApiTopologySummary {
	_id: string;
	name: string;
	description?: string | null;
	nodeCount: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface ApiTopology extends ApiTopologySummary {
	nodes: ApiTopologyNode[];
}
