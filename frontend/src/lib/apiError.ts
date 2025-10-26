import type { AxiosError } from "axios";

interface MoleculerErrorPayload {
	message?: string;
	type?: string;
	data?: unknown;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
	const axiosError = error as AxiosError<MoleculerErrorPayload>;
	if (axiosError?.isAxiosError) {
		const payload = axiosError.response?.data;
		if (payload?.message) return payload.message;
		if (payload?.type) return humanizeErrorType(payload.type);
	}

	if (error instanceof Error) return error.message;

	return fallback;
}

function humanizeErrorType(type?: string): string {
	if (!type) return "";
	return type
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(/^\w/, (char) => char.toUpperCase());
}

