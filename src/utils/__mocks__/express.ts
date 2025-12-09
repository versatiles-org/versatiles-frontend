import { Mocked, vi } from 'vitest';

const instance = {
	get: vi.fn(),
	listen: vi.fn((port, callback: () => void) => {
		callback();
	}),
};

export const mockExpress = {
	default: vi.fn(() => instance),
} as unknown as Mocked<typeof import('express')>;
