import { vi } from 'vitest';

vi.mock('../load', async (originalImport) => {
	const originalModule = (await originalImport()) as typeof import('../load');
	vi.spyOn(originalModule, 'loadFrontendConfigs');
	return originalModule;
});
