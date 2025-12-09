import { vi } from 'vitest';

vi.mock('fs/promises', async () => {
	return {
		mkdir: vi.fn()
	};
});