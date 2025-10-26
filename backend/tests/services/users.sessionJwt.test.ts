import { describe, expect, it } from "vitest";
import { encodeSessionJwt, tryDecodeSessionJwt } from "../../src/services/users/utils/sessionJwt.js";

describe("session JWT utils", () => {
	it("encodes session id and decodes payload", () => {
		const session = { _id: { toString: () => "session-123" } } as any;
		const token = encodeSessionJwt(session);
		const payload = tryDecodeSessionJwt(token);
		expect(payload).toMatchObject({
			magic: process.env.JWT_MAGIC,
			type: "session",
			sessionId: "session-123",
		});
	});

	it("returns null when verification fails", () => {
		const payload = tryDecodeSessionJwt("invalid.token.value");
		expect(payload).toBeNull();
	});
});
