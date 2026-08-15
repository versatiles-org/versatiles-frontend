import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
	test: {
		environment: 'node',
		include: ['e2e/**/*.test.ts'],
		// These tests gunzip and walk whole release bundles - tens of thousands of entries,
		// over a hundred megabytes each. That is seconds of real work, so the 5s default left
		// no room and failed intermittently on a loaded machine.
		testTimeout: 30_000,
	},
});
