import axios, { AxiosHeaders } from "axios";
import { getAuthToken } from "./authToken";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
	baseURL,
	withCredentials: false,
});

api.interceptors.request.use((config) => {
	const token = getAuthToken();
	if (token) {
		if (!config.headers) {
			config.headers = new AxiosHeaders();
		}

		if (config.headers instanceof AxiosHeaders) {
			config.headers.set("x-api-token", token);
		} else {
			(config.headers as Record<string, string>)["x-api-token"] = token;
		}
	}
	return config;
});
