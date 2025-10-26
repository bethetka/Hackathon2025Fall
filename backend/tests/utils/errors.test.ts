import { describe, expect, it } from "vitest";
import { ErrorBuilder, Errors, MakeError, MoleculerError } from "../../src/utils/Errors.js";

describe("Errors utility", () => {
	it("builds MoleculerError with custom message and data", () => {
		const builder = new ErrorBuilder(Errors.INVALID_CREDENTIALS)
			.message("Invalid login")
			.data({ attempts: 1 });
		const error = (builder as any).finalize as MoleculerError;
		expect(error).toBeInstanceOf(MoleculerError);
		expect(error.type).toBe("INVALID_CREDENTIALS");
		expect(error.code).toBe(401);
		expect(error.data).toEqual({ attempts: 1 });
		expect(error.message).toBe("Invalid login");
	});

	it("rejects with MoleculerError via MakeError helper", async () => {
		await expect(MakeError(Errors.TOPOLOGY_NOT_FOUND, { message: "missing" })).rejects.toMatchObject({
			type: "TOPOLOGY_NOT_FOUND",
			code: 404,
			message: "missing",
		});
	});
});
