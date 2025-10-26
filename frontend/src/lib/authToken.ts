const TOKEN_STORAGE_KEY = "stackpilot.apiToken";

let inMemoryToken: string | null = null;

function isBrowser(): boolean {
	return typeof window !== "undefined";
}

export function getStoredToken(): string | null {
	if (!isBrowser()) return null;
	return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken(): string | null {
	if (inMemoryToken) return inMemoryToken;
	const stored = getStoredToken();
	inMemoryToken = stored;
	return stored;
}

export function setAuthToken(token: string | null): void {
	inMemoryToken = token;
	if (!isBrowser()) return;
	if (token) {
		window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
	} else {
		window.localStorage.removeItem(TOKEN_STORAGE_KEY);
	}
}

export function clearAuthToken(): void {
	setAuthToken(null);
}

