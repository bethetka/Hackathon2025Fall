import { api } from "./api";
import type { ApiTopology, ApiTopologyNode, ApiTopologySummary } from "./apiTypes";

export interface CreateTopologyInput {
	name: string;
	description?: string;
	nodes: ApiTopologyNode[];
}

export interface UpdateTopologyInput {
	name?: string;
	description?: string;
	nodes?: ApiTopologyNode[];
}

export async function listTopologies(): Promise<ApiTopologySummary[]> {
	const { data } = await api.get<ApiTopologySummary[]>("/topologies");
	return data;
}

export async function getTopology(id: string): Promise<ApiTopology> {
	const { data } = await api.get<ApiTopology>(`/topologies/${id}`);
	return data;
}

export async function createTopology(payload: CreateTopologyInput): Promise<ApiTopology> {
	const { data } = await api.post<ApiTopology>("/topologies", payload);
	return data;
}

export async function updateTopology(id: string, payload: UpdateTopologyInput): Promise<ApiTopology> {
	const { data } = await api.put<ApiTopology>(`/topologies/${id}`, payload);
	return data;
}

export async function deleteTopology(id: string): Promise<void> {
	await api.delete(`/topologies/${id}`);
}
