import { vi } from 'vitest';

export function mockFetchResponse(data: unknown): void {
	// @ts-expect-error too lazy
	global.fetch = vi.fn(async () => Promise.resolve({
		arrayBuffer: async () => Promise.resolve(getAsBuffer()),
		 
		headers: new Headers({ 'content-type': 'text/plain' }),
		json: async () => Promise.resolve(getAsJSON()),
		status: 200,
	}));

	function getAsBuffer(): Buffer {
		if (Buffer.isBuffer(data)) return data;
		if (typeof data === 'string') return Buffer.from(data);
		throw Error();
	}

	function getAsJSON(): unknown {
		return data;
	}
}
