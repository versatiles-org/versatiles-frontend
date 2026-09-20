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
			include: ['src/**'],
		},
	},
});
