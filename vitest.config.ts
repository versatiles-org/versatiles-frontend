import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load .env into process.env before tests run
dotenv.config();

export default defineConfig({
	test: {
		environment: 'node',
		exclude: ['e2e/**', 'node_modules/**'],
		coverage: {
			exclude: ['src/dev.ts'],
			include: ['src/**'],
		},
	},
});
