import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load .env into process.env before tests run
dotenv.config();

export default defineConfig({
	test: {
		environment: 'node',
		exclude: ['e2e/**', 'node_modules/**'],
		coverage: {
			// Thin CLI entry points: argument parsing and console output around tested modules.
			exclude: ['src/dev.ts', 'src/clean-cache.ts'],
			// Only TypeScript sources: anything else under src/ is not something the v8 provider
			// can map, and a file it tries to parse and cannot is reported as an error.
			include: ['src/**/*.ts'],
		},
	},
});
