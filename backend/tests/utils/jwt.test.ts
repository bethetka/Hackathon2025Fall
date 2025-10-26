import { describe, expect, it } from "vitest";
import { jwtEncode, jwtVerify } from "../../src/utils/jwt.js";

describe("jwt utilities", () => {
	it("encodes and verifies payload symmetrically", () => {
		const payload = { userId: "abc123", role: "admin" };
		const token = jwtEncode(payload);
		expect(typeof token).toBe("string");

		const decoded = jwtVerify(token);
		expect(decoded).toMatchObject(payload);
	});

	it("returns null for invalid tokens", () => {
		expect(jwtVerify("not-a-valid-token")).toBeNull();
	});
});

