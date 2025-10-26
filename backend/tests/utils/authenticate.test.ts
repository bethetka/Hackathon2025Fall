import { describe, expect, it } from "vitest";
import { authenticate } from "../../src/utils/authenticate.js";

describe("authenticate utility", () => {
	it("resolves when user and session meta exist", async () => {
		const ctx = {
			meta: {
				user: { _id: "user1" },
				session: { _id: "session1" },
			},
		} as any;

		await expect(authenticate(ctx)).resolves.toBe(true);
	});

	it("rejects when meta is missing session or user", async () => {
		const ctx = { meta: {} } as any;
		await expect(authenticate(ctx)).rejects.toMatchObject({
			type: "UNAUTHORIZED",
			code: 401,
		});
	});
});

