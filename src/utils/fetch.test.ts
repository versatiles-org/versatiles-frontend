import { describe, expect, it, vi, afterEach } from 'vitest';

const { fetchRetry } = await import('./fetch');

describe('fetchRetry', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns the response on first success', async () => {
		const res = { status: 200 };
		// @ts-expect-error mocking global
		global.fetch = vi.fn(async () => res);

		await expect(fetchRetry('https://example.com', {}, { retries: 2, retryDelayMs: 0 })).resolves.toBe(res);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('passes an abort signal alongside the provided init', async () => {
		// @ts-expect-error mocking global
		global.fetch = vi.fn(async () => ({ status: 200 }));

		await fetchRetry('https://example.com', { redirect: 'follow' }, { retryDelayMs: 0 });
		expect(global.fetch).toHaveBeenCalledWith(
			'https://example.com',
			expect.objectContaining({ redirect: 'follow', signal: expect.any(AbortSignal) })
		);
	});

	it('does not retry 4xx responses', async () => {
		const res = { status: 404 };
		// @ts-expect-error mocking global
		global.fetch = vi.fn(async () => res);

		await expect(fetchRetry('https://example.com', {}, { retries: 3, retryDelayMs: 0 })).resolves.toBe(res);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('retries transient 5xx responses then succeeds', async () => {
		const fn = vi.fn().mockResolvedValueOnce({ status: 503 }).mockResolvedValueOnce({ status: 200 });
		global.fetch = fn;

		const res = await fetchRetry('https://example.com', {}, { retries: 3, retryDelayMs: 0 });
		expect(res).toEqual({ status: 200 });
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('retries network errors and throws after exhausting attempts', async () => {
		const fn = vi.fn(async () => {
			throw new Error('network down');
		});
		global.fetch = fn;

		await expect(fetchRetry('https://example.com', {}, { retries: 2, retryDelayMs: 0 })).rejects.toThrow(
			'network down'
		);
		expect(fn).toHaveBeenCalledTimes(3);
	});
});
