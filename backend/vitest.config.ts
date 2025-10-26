import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		coverage: {
			reportsDirectory: "./coverage",
			reporter: ["text", "html"],
			provider: "v8",
			include: ["src/**/*.ts"],
		},
	},
});

