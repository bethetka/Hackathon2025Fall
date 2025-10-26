import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "moleculer";
import type { AuthContextMeta } from "../../src/utils/authenticate.js";

const authenticateMock = vi.fn<[], Promise<boolean>>();
vi.mock("../../src/utils/authenticate.js", () => ({
	authenticate: authenticateMock,
}));

const sanitizeNodesMock = vi.fn((nodes: unknown[]) => nodes);
const toTopologySummaryMock = vi.fn((topology: any) => ({ id: topology._id }));
const toTopologyResponseMock = vi.fn((topology: any) => ({
	id: topology._id,
	nodes: topology.nodes,
}));

vi.mock("../../src/services/topologies/utils.js", () => ({
	sanitizeNodes: sanitizeNodesMock,
	toTopologySummary: toTopologySummaryMock,
	toTopologyResponse: toTopologyResponseMock,
}));

const TopologiesMock = {
	find: vi.fn(),
	findOne: vi.fn(),
	create: vi.fn(),
	findOneAndUpdate: vi.fn(),
	findOneAndDelete: vi.fn(),
};

vi.mock("../../src/models/Topology.js", () => ({
	Topologies: TopologiesMock,
}));

const { default: listAction } = await import("../../src/services/topologies/actions/list.js");
const { default: getAction } = await import("../../src/services/topologies/actions/get.js");
const { default: createAction } = await import("../../src/services/topologies/actions/create.js");
const { default: updateAction } = await import("../../src/services/topologies/actions/update.js");
const { default: removeAction } = await import("../../src/services/topologies/actions/remove.js");

function createQueryChain<T>(result: T, rejectWith?: unknown) {
	const chain: any = {
		sort: vi.fn(() => chain),
		lean: vi.fn(() => chain),
		exec: rejectWith
			? vi.fn().mockRejectedValue(rejectWith)
			: vi.fn().mockResolvedValue(result),
	};
	return chain;
}

function createContext<T = any>(params: T, ownerId = "user-id") {
	const ctx = {
		params,
		meta: {
			user: { _id: ownerId },
			session: { _id: "session-id" },
		},
	} as unknown as Context<T, AuthContextMeta>;
	return ctx;
}

describe("topologies actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authenticateMock.mockResolvedValue(true);
		sanitizeNodesMock.mockImplementation(nodes => nodes);
	});

	it("lists topologies for owner", async () => {
		const ctx = createContext(undefined);
		const data = [{ _id: "topo-1" }, { _id: "topo-2" }];
		const chain = createQueryChain(data);
		TopologiesMock.find.mockReturnValue(chain);

		const result = await listAction.handler(ctx as Context<void, AuthContextMeta>);

		expect(authenticateMock).toHaveBeenCalledWith(ctx);
		expect(TopologiesMock.find).toHaveBeenCalledWith({ owner: ctx.meta.user!._id });
		expect(chain.sort).toHaveBeenCalledWith({ updatedAt: -1 });
		expect(toTopologySummaryMock).toHaveBeenCalledTimes(data.length);
		expect(result).toEqual([{ id: "topo-1" }, { id: "topo-2" }]);
	});

	it("gets topology by id", async () => {
		const topology = { _id: "topo", nodes: [] };
		TopologiesMock.findOne.mockReturnValue(createQueryChain(topology));
		const ctx = createContext({ id: "topo" });

		const result = await getAction.handler(ctx as Context<any, AuthContextMeta>);

		expect(TopologiesMock.findOne).toHaveBeenCalledWith({ _id: "topo", owner: ctx.meta.user!._id });
		expect(result).toEqual({ id: "topo", nodes: [] });
	});

	it("throws when topology not found", async () => {
		TopologiesMock.findOne.mockReturnValue(createQueryChain(null));
		const ctx = createContext({ id: "missing" });

		await expect(getAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
			type: "TOPOLOGY_NOT_FOUND",
			code: 404,
		});
	});

	it("translates cast errors into not found", async () => {
		const castError = { name: "CastError" };
		TopologiesMock.findOne.mockReturnValue(createQueryChain(null, castError));
		const ctx = createContext({ id: "bad-id" });

		await expect(getAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
			type: "TOPOLOGY_NOT_FOUND",
			code: 404,
		});
	});

	it("creates topology with sanitized nodes", async () => {
		const sanitizedNodes = [{ id: 1, type: "redis", x: 0, y: 0, fields: {} }];
		sanitizeNodesMock.mockReturnValue(sanitizedNodes);
		const created = { toObject: () => ({ _id: "created", nodes: sanitizedNodes }) };
		TopologiesMock.create.mockResolvedValue(created);
		const ctx = createContext({ name: "Test", nodes: [{ id: 1 }] });

		const result = await createAction.handler(ctx as Context<any, AuthContextMeta>);

		expect(sanitizeNodesMock).toHaveBeenCalledWith([{ id: 1 }]);
		expect(TopologiesMock.create).toHaveBeenCalledWith({
			owner: ctx.meta.user!._id,
			name: "Test",
			description: undefined,
			nodes: sanitizedNodes,
		});
		expect(result).toEqual({ id: "created", nodes: sanitizedNodes });
	});

	it("rejects invalid topology payload during creation", async () => {
		sanitizeNodesMock.mockImplementation(() => {
			throw new Error("bad payload");
		});
		const ctx = createContext({ name: "Bad", nodes: [] });

	await expect(createAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
		type: "INVALID_TOPOLOGY_PAYLOAD",
		code: 400,
		message: "bad payload",
	});
	});

	it("updates topology with set and unset operations", async () => {
		const sanitizedNodes = [{ id: 2 }];
		sanitizeNodesMock.mockReturnValue(sanitizedNodes);
		const updated = { _id: "topo", nodes: sanitizedNodes };
		const chain = createQueryChain(updated);
		TopologiesMock.findOneAndUpdate.mockReturnValue(chain);
		const ctx = createContext({
			id: "topo",
			name: "Renamed",
			description: "  ",
			nodes: [{ id: 2 }],
		});

		const result = await updateAction.handler(ctx as Context<any, AuthContextMeta>);

		expect(sanitizeNodesMock).toHaveBeenCalledWith([{ id: 2 }]);
		expect(TopologiesMock.findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: "topo", owner: ctx.meta.user!._id },
			{
				$set: { name: "Renamed", nodes: sanitizedNodes },
				$unset: { description: 1 },
			},
			{ new: true },
		);
		expect(result).toEqual({ id: "topo", nodes: sanitizedNodes });
	});

	it("returns existing topology when no update payload provided", async () => {
		const existing = { _id: "topo", nodes: [] };
		TopologiesMock.findOne.mockReturnValue(createQueryChain(existing));
		const ctx = createContext({ id: "topo" });

		const result = await updateAction.handler(ctx as Context<any, AuthContextMeta>);

		expect(TopologiesMock.findOne).toHaveBeenCalledWith({ _id: "topo", owner: ctx.meta.user!._id });
		expect(result).toEqual({ id: "topo", nodes: [] });
	});

	it("rejects invalid topology payload during update", async () => {
		sanitizeNodesMock.mockImplementation(() => {
			throw new Error("invalid nodes");
		});
		const ctx = createContext({ id: "topo", nodes: [] });

	await expect(updateAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
		type: "INVALID_TOPOLOGY_PAYLOAD",
		code: 400,
		message: "invalid nodes",
	});
	});

	it("returns error when updated topology not found", async () => {
		TopologiesMock.findOneAndUpdate.mockReturnValue(createQueryChain(null));
		const ctx = createContext({ id: "missing", name: "Name" });

		await expect(updateAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
			type: "TOPOLOGY_NOT_FOUND",
			code: 404,
		});
	});

	it("translates cast error during update to not found", async () => {
		const castError = { name: "CastError" };
		TopologiesMock.findOneAndUpdate.mockReturnValue(createQueryChain(null, castError));
		const ctx = createContext({ id: "bad", name: "Name" });

		await expect(updateAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
			type: "TOPOLOGY_NOT_FOUND",
			code: 404,
		});
	});

	it("removes topology", async () => {
		const chain = createQueryChain({ _id: "topo" });
		TopologiesMock.findOneAndDelete.mockReturnValue(chain);
		const ctx = createContext({ id: "topo" });

		const result = await removeAction.handler(ctx as Context<any, AuthContextMeta>);

		expect(TopologiesMock.findOneAndDelete).toHaveBeenCalledWith({ _id: "topo", owner: ctx.meta.user!._id });
		expect(result).toEqual({ success: true });
	});

	it("returns error when removing missing topology", async () => {
		TopologiesMock.findOneAndDelete.mockReturnValue(createQueryChain(null));
		const ctx = createContext({ id: "missing" });

		await expect(removeAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
			type: "TOPOLOGY_NOT_FOUND",
			code: 404,
		});
	});

	it("translates cast error during removal to not found", async () => {
		const castError = { name: "CastError" };
		TopologiesMock.findOneAndDelete.mockReturnValue(createQueryChain(null, castError));
		const ctx = createContext({ id: "bad" });

		await expect(removeAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
			type: "TOPOLOGY_NOT_FOUND",
			code: 404,
		});
	});
});
