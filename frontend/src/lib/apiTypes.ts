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

