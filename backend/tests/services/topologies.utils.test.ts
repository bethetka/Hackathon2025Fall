import { describe, expect, it } from "vitest";
import {
	sanitizeNodes,
	toTopologyResponse,
	toTopologySummary,
} from "../../src/services/topologies/utils.js";

describe("topologies utils", () => {
	it("sanitizes nodes with defaults and type trimming", () => {
		const input = [
			{ id: 1, type: " redis  ", x: 100, y: 200, fields: { network: "net" } },
			{ id: 2, type: "docker", x: 0, y: 0 },
		];
		const result = sanitizeNodes(input);
		expect(result).toEqual([
			{ id: 1, type: "redis", x: 100, y: 200, fields: { network: "net" } },
			{ id: 2, type: "docker", x: 0, y: 0, fields: {} },
		]);
	});

	it("rejects invalid node arrays", () => {
		expect(() => sanitizeNodes("nope")).toThrow("Nodes must be provided as an array.");
		expect(() => sanitizeNodes([{ id: "1", type: "redis", x: 0, y: 0 }])).toThrow(/invalid id/i);
		expect(() => sanitizeNodes([{ id: 1, type: "", x: 0, y: 0 }])).toThrow(/invalid type/i);
		expect(() => sanitizeNodes([{ id: 1, type: "redis", x: "x", y: 0 } as any])).toThrow(/numeric x and y/);
		expect(() => sanitizeNodes([{ id: 1, type: "redis", x: 0, y: 0, fields: [] } as any])).toThrow(/invalid fields/);
	});

	it("transforms topology models to summary and response", () => {
		const now = new Date();
		const topology = {
			_id: { toString: () => "abc123" },
			name: "Test",
			description: "Sample",
			nodes: [
				{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "x" } },
				{ id: 2, type: "docker", x: 10, y: 5, fields: {} },
			],
			createdAt: now,
			updatedAt: now,
		};

		const summary = toTopologySummary(topology as any);
		expect(summary).toEqual({
			_id: "abc123",
			name: "Test",
			description: "Sample",
			nodeCount: 2,
			createdAt: now,
			updatedAt: now,
		});

		const response = toTopologyResponse(topology as any);
		expect(response).toEqual({
			_id: "abc123",
			name: "Test",
			description: "Sample",
			nodes: [
				{ id: 1, type: "redis", x: 0, y: 0, fields: { password: "x" } },
				{ id: 2, type: "docker", x: 10, y: 5, fields: {} },
			],
			createdAt: now,
			updatedAt: now,
		});
	});
});

