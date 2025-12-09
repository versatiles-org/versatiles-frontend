import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load .env into process.env before tests run
dotenv.config();

export default defineConfig({
	test: {
		environment: 'node',
		// other test options if you need them
	},
});
