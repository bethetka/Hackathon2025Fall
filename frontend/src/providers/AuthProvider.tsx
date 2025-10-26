import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiUser, AuthResponse } from "@/lib/apiTypes";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authToken";
import type { AxiosError } from "axios";

interface AuthContextValue {
	user: ApiUser | null;
	token: string | null;
	isLoading: boolean;
	login: (credentials: AuthCredentials) => Promise<AuthResponse>;
	register: (credentials: AuthCredentials) => Promise<AuthResponse>;
	logout: () => void;
	refreshMe: () => Promise<ApiUser | null>;
}

interface AuthCredentials {
	username: string;
	password: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const queryClient = useQueryClient();
	const [token, setTokenState] = useState<string | null>(() => getAuthToken());

	const clearSession = useCallback(() => {
		setTokenState(null);
		clearAuthToken();
		queryClient.removeQueries({ queryKey: ["auth"] });
	}, [queryClient]);

	const meQuery = useQuery<ApiUser>({
		queryKey: ["auth", "me"] as const,
		queryFn: async () => {
			const response = await api.get<ApiUser>("/users/me");
			return response.data;
		},
		enabled: Boolean(token),
		retry: false,
		staleTime: 5 * 60 * 1000,
	});

	useEffect(() => {
		if (meQuery.error) {
			const axiosError = meQuery.error as AxiosError;
			if (axiosError.response?.status === 401) {
				clearSession();
			}
		}
	}, [clearSession, meQuery.error]);

	const { data: user, isFetching, refetch } = meQuery;

	const setToken = useCallback(
		(nextToken: string | null) => {
			setTokenState(nextToken);
			setAuthToken(nextToken);
		},
		[],
	);

	const handleAuthResponse = useCallback(
		(data: AuthResponse) => {
			setToken(data.jwt);
			queryClient.setQueryData<ApiUser>(["auth", "me"], data.user);
			return data;
		},
		[queryClient, setToken],
	);

	const login = useCallback(
		async (credentials: AuthCredentials) => {
			try {
				const response = await api.post<AuthResponse>("/users/login", credentials);
				return handleAuthResponse(response.data);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response?.status === 401) {
					clearSession();
				}
				throw error;
			}
		},
		[clearSession, handleAuthResponse],
	);

	const register = useCallback(
		async (credentials: AuthCredentials) => {
			try {
				const response = await api.post<AuthResponse>("/users/register", credentials);
				return handleAuthResponse(response.data);
			} catch (error) {
				const axiosError = error as AxiosError;
				if (axiosError.response?.status === 401) {
					clearSession();
				}
				throw error;
			}
		},
		[clearSession, handleAuthResponse],
	);

	const logout = useCallback(() => {
		clearSession();
	}, [clearSession]);

	const refreshMe = useCallback(async () => {
		if (!token) return null;
		const result = await refetch();
		return result.data ?? null;
	}, [refetch, token]);

	const value = useMemo<AuthContextValue>(
		() => ({
			user: user ?? null,
			token,
			isLoading: Boolean(token) && isFetching,
			login,
			register,
			logout,
			refreshMe,
		}),
		[isFetching, login, logout, refreshMe, register, token, user],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return ctx;
}
