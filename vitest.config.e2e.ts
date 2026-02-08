import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
	test: {
		environment: 'node',
		include: ['e2e/**/*.test.ts'],
	},
});
