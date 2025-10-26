import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "moleculer";
import type { AuthContextMeta } from "../../src/utils/authenticate.js";

const authenticateMock = vi.fn<[], Promise<boolean>>();
vi.mock("../../src/utils/authenticate.js", () => ({
	authenticate: authenticateMock,
}));

const hashMock = vi.fn(async (password: string) => `hashed:${password}`);
const verifyMock = vi.fn(async (hash: string, password: string) => hash === `hashed:${password}`);

vi.mock("argon2", () => ({
	default: {
		hash: hashMock,
		verify: verifyMock,
	},
}));

const encodeSessionJwtMock = vi.fn((session: any) => `jwt:${session._id}`);
const tryDecodeSessionJwtMock = vi.fn((token: string) => null as any);

vi.mock("../../src/services/users/utils/sessionJwt.js", () => ({
	encodeSessionJwt: encodeSessionJwtMock,
	tryDecodeSessionJwt: tryDecodeSessionJwtMock,
}));

function makeDoc<T extends Record<string, any>>(data: T) {
	return {
		...data,
		toObject: () => ({ ...data }),
	};
}

const UsersMock = {
	findOne: vi.fn(),
	create: vi.fn(),
};

vi.mock("../../src/models/User.js", () => ({
	Users: UsersMock,
}));

const UserSessionsMock = {
	create: vi.fn(),
	find: vi.fn(),
	findOne: vi.fn(),
	updateOne: vi.fn(),
	deleteOne: vi.fn(),
};

vi.mock("../../src/models/UserSession.js", () => ({
	UserSessions: UserSessionsMock,
}));

const { default: registerAction } = await import("../../src/services/users/actions/register.js");
const { default: loginAction } = await import("../../src/services/users/actions/login.js");
const { default: createSessionAction } = await import("../../src/services/users/actions/createSession.js");
const { default: getSessionsAction } = await import("../../src/services/users/actions/getSessions.js");
const { default: getSessionsPublicAction } = await import("../../src/services/users/actions/getSessionsPublic.js");
const { default: getSessionByJwtAction } = await import("../../src/services/users/actions/getSessionByJwt.js");
const { default: updateSessionLastUseAction } = await import("../../src/services/users/actions/updateSessionLastUse.js");
const { default: deleteSessionPublicAction } = await import("../../src/services/users/actions/deleteSessionPublic.js");
const { default: meAction } = await import("../../src/services/users/actions/me.js");

function createContext<T = Record<string, unknown>>(params: T, overrides: Partial<Context<T, AuthContextMeta>> = {}) {
	const ctx = {
		params,
		meta: {
			user: { _id: "user-id", username: "demo" },
			session: { _id: "session-id" },
		},
		call: vi.fn(),
		...overrides,
	} as unknown as Context<T, AuthContextMeta>;
	return ctx;
}

describe("users actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authenticateMock.mockResolvedValue(true);
		tryDecodeSessionJwtMock.mockImplementation(() => null);
	});

	describe("register", () => {
		it("rejects when username already exists", async () => {
			UsersMock.findOne.mockResolvedValue(makeDoc({ _id: "existing" }));
			const ctx = createContext({ username: "alice", password: "pw" });

			await expect(registerAction.handler(ctx as Context<any>)).rejects.toMatchObject({
				type: "USER_WITH_THIS_USERNAME_ALREADY_EXISTS",
				code: 400,
			});
			expect(UsersMock.create).not.toHaveBeenCalled();
		});

		it("creates user and session", async () => {
			UsersMock.findOne.mockResolvedValue(null);
			const createdUser = { _id: "new-user", id: "new-user", username: "alice", password: "hashed" };
			UsersMock.create.mockResolvedValue(createdUser);
			const session = { _id: "session" };
			const jwt = "jwt-token";
			const ctx = createContext({ username: "alice", password: "secret" });
			(ctx.call as any).mockResolvedValue({ session, jwt });

			const result = await registerAction.handler(ctx as Context<any>);

			expect(hashMock).toHaveBeenCalledWith("secret");
			expect(UsersMock.create).toHaveBeenCalledWith({
				username: "alice",
				password: "hashed:secret",
			});
			expect(ctx.call).toHaveBeenCalledWith("users.createSession", {
				userId: "new-user",
				userAgent: "Not/Implemented",
			});
			expect(result).toEqual({ user: createdUser, session, jwt });
		});
	});

	describe("login", () => {
		it("rejects when credentials invalid", async () => {
			UsersMock.findOne.mockResolvedValue(null);
			const ctx = createContext({ username: "alice", password: "secret" });
			await expect(loginAction.handler(ctx as Context<any>)).rejects.toMatchObject({
				type: "INVALID_CREDENTIALS",
				code: 401,
			});
		});

		it("rejects when password verification fails", async () => {
			const userDoc = makeDoc({ _id: "user", username: "alice", password: "hashed:password" });
			UsersMock.findOne.mockResolvedValue(userDoc);
			verifyMock.mockResolvedValueOnce(false);
			const ctx = createContext({ username: "alice", password: "wrong" });

			await expect(loginAction.handler(ctx as Context<any>)).rejects.toMatchObject({
				type: "INVALID_CREDENTIALS",
				code: 401,
			});
		});

		it("returns user and session on success", async () => {
			const userDoc = makeDoc({ _id: "user", username: "alice", password: "hashed:secret" });
			UsersMock.findOne.mockResolvedValue(userDoc);
			const ctx = createContext({ username: "alice", password: "secret" });
			const session = { _id: "session" };
			const jwt = "jwt";
			(ctx.call as any).mockResolvedValue({ session, jwt });

			const result = await loginAction.handler(ctx as Context<any>);

			expect(result).toEqual({
				user: userDoc.toObject(),
				session,
				jwt,
			});
		});
	});

	it("creates session and encodes jwt", async () => {
		const sessionDoc = { _id: "session-id", user: "user-id", toObject: () => ({ _id: "session-id" }) };
		UserSessionsMock.create.mockResolvedValue(sessionDoc);
		const ctx = createContext({ userId: "user-id", userAgent: "Agent" });

		const result = await createSessionAction.handler(ctx as Context<any>);

		expect(UserSessionsMock.create).toHaveBeenCalledWith({
			user: "user-id",
			userAgent: "Agent",
			lastUse: expect.any(Date),
		});
		expect(encodeSessionJwtMock).toHaveBeenCalledWith(sessionDoc);
		expect(result).toEqual({ session: sessionDoc, jwt: "jwt:session-id" });
	});

	it("gets sessions and maps to plain objects", async () => {
		const sessions = [makeDoc({ _id: "s1" }), makeDoc({ _id: "s2" })];
		UserSessionsMock.find.mockResolvedValue(sessions);
		const ctx = createContext({ userId: "user-id" });

		const result = await getSessionsAction.handler(ctx as Context<any>);

		expect(UserSessionsMock.find).toHaveBeenCalledWith({ user: "user-id" });
		expect(result).toEqual([{ _id: "s1" }, { _id: "s2" }]);
	});

	describe("getSessionsPublic", () => {
		it("returns sessions with current flag", async () => {
			const ctx = createContext(undefined as any);
			const sessions = [
				{ _id: "session-id", user: "user-id", lastUse: "now" },
				{ _id: "other", user: "user-id", lastUse: "past" },
			];
			(ctx.call as any).mockResolvedValue(sessions);

			const result = await getSessionsPublicAction.handler(ctx as Context<void, AuthContextMeta>);

			expect(authenticateMock).toHaveBeenCalledWith(ctx);
			expect(ctx.call).toHaveBeenCalledWith("users.getSessions", { userId: "user-id" });
			expect(result).toEqual([
				{ _id: "session-id", user: "user-id", lastUse: "now", current: true },
				{ _id: "other", user: "user-id", lastUse: "past", current: false },
			]);
		});
	});

	describe("getSessionByJwt", () => {
		it("returns nulls when token invalid", async () => {
			tryDecodeSessionJwtMock.mockReturnValue(null);
			const ctx = createContext({ jwt: "bad" });
			const result = await getSessionByJwtAction.handler(ctx as Context<any>);
			expect(result).toEqual({ user: null, session: null });
		});

		it("returns null when session missing", async () => {
			tryDecodeSessionJwtMock.mockReturnValue({ sessionId: "missing" });
			UserSessionsMock.findOne.mockResolvedValue(null);
			const ctx = createContext({ jwt: "valid" });
			const result = await getSessionByJwtAction.handler(ctx as Context<any>);
			expect(result).toBeNull();
		});

		it("returns user and session when found", async () => {
			tryDecodeSessionJwtMock.mockReturnValue({ sessionId: "session" });
			const sessionDoc = makeDoc({ _id: "session", user: "user-id" });
			const userDoc = makeDoc({ _id: "user-id", username: "alice" });
			UserSessionsMock.findOne.mockResolvedValue(sessionDoc);
			UsersMock.findOne.mockResolvedValue(userDoc);
			const ctx = createContext({ jwt: "valid" });

			const result = await getSessionByJwtAction.handler(ctx as Context<any>);

			expect(result).toEqual({
				session: sessionDoc.toObject(),
				user: userDoc.toObject(),
			});
		});
	});

	it("updates session last use timestamp", async () => {
		const ctx = createContext({ sessionId: "session" });
		UserSessionsMock.updateOne.mockResolvedValue({ matchedCount: 1 });

		const result = await updateSessionLastUseAction.handler(ctx as Context<any>);

		expect(UserSessionsMock.updateOne).toHaveBeenCalledWith(
			{ _id: "session" },
			{ $set: { lastUse: expect.any(Date) } },
		);
		expect(result).toEqual({ success: true });
	});

	describe("deleteSessionPublic", () => {
		it("rejects when deleting current session", async () => {
			const ctx = createContext({ sessionId: "session-id" });
			await expect(deleteSessionPublicAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
				type: "YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE",
				code: 400,
			});
		});

		it("rejects when session not found", async () => {
			const ctx = createContext({ sessionId: "other" });
			ctx.meta.session!._id = "session-id";
			UserSessionsMock.findOne.mockResolvedValue(null);

			await expect(deleteSessionPublicAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
				type: "SESSION_NOT_FOUND",
				code: 400,
			});
		});

		it("rejects when session belongs to another user", async () => {
			const ctx = createContext({ sessionId: "other" });
			ctx.meta.session!._id = "session-id";
			UserSessionsMock.findOne.mockResolvedValue(makeDoc({ _id: "other", user: "different-user" }));

			await expect(deleteSessionPublicAction.handler(ctx as Context<any, AuthContextMeta>)).rejects.toMatchObject({
				type: "SESSION_NOT_FOUND",
				code: 400,
			});
		});

		it("deletes session when allowed", async () => {
			const ctx = createContext({ sessionId: "to-delete" });
			ctx.meta.session!._id = "session-id";
			UserSessionsMock.findOne.mockResolvedValue(makeDoc({ _id: "to-delete", user: "user-id" }));

			const result = await deleteSessionPublicAction.handler(ctx as Context<any, AuthContextMeta>);

			expect(UserSessionsMock.deleteOne).toHaveBeenCalledWith({ _id: "to-delete" });
			expect(result).toEqual({ success: true });
		});
	});

	it("returns current user via me action", async () => {
		const ctx = createContext(undefined as any);
		const result = await meAction.handler(ctx as Context<void, AuthContextMeta>);
		expect(result).toEqual(ctx.meta.user);
	});
});
