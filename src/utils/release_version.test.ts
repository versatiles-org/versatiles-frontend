import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pass straight through to the fetch, so these tests exercise the request and parsing
// without a shared on-disk cache leaking one test's answer into the next.
const { cacheMock } = vi.hoisted(() => ({
	cacheMock: vi.fn(async (_action: string, _key: string, cbBuffer: () => Promise<Buffer>) => cbBuffer()),
}));
vi.mock('./cache', () => ({ cache: cacheMock }));

const { getLatestGithubReleaseVersion } = await import('../utils/release_version');

// Mock fetch helper
function mockFetchResponse(data: unknown, status = 200): void {
	// @ts-expect-error mocking global
	global.fetch = vi.fn(async () =>
		Promise.resolve({
			arrayBuffer: async () => Promise.resolve(getAsBuffer()),
			headers: new Headers({ 'content-type': 'text/plain' }),
			json: async () => Promise.resolve(getAsJSON()),
			ok: status >= 200 && status < 300,
			status,
		})
	);

	function getAsBuffer(): Buffer {
		if (Buffer.isBuffer(data)) return data;
		if (typeof data === 'string') return Buffer.from(data);
		throw Error();
	}

	function getAsJSON(): unknown {
		return data;
	}
}

describe('getLatestGithubReleaseVersion', () => {
	beforeEach(() => {
		cacheMock.mockClear();
	});

	it('caches the version, keyed by repository and prerelease flag', async () => {
		mockFetchResponse([{ tag_name: 'v1.2.3' }]);

		await getLatestGithubReleaseVersion('someOrg', 'someRepo', true);

		expect(cacheMock).toHaveBeenCalledWith(
			'github-release-version',
			'someOrg/someRepo/prerelease',
			expect.any(Function),
			60 * 60 * 1000
		);
	});

	it('keys stable and prerelease lookups separately', async () => {
		mockFetchResponse([{ tag_name: 'v1.2.3' }]);

		await getLatestGithubReleaseVersion('someOrg', 'someRepo');

		expect(cacheMock.mock.calls[0][1]).toBe('someOrg/someRepo/stable');
	});

	it('fetches the latest release version', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([{ tag_name: 'v12.7.3' }]);

		const version = await getLatestGithubReleaseVersion(owner, repo);

		expect(version).toBe('12.7.3');
		expect(global.fetch).toHaveBeenCalledWith(
			`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`,
			expect.anything()
		);
	});

	it('fetches the latest release version with v prefix', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([{ tag_name: 'v2.0.0' }, { tag_name: 'v1.0.0' }]);

		const version = await getLatestGithubReleaseVersion(owner, repo);

		expect(version).toBe('2.0.0');
	});

	it('accepts tags without a v prefix', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([{ tag_name: '2.5.1' }, { tag_name: '2.5.0' }]);

		const version = await getLatestGithubReleaseVersion(owner, repo);

		expect(version).toBe('2.5.1');
	});

	it('skips prerelease versions by default', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([
			{ tag_name: 'v3.0.0-beta', prerelease: true },
			{ tag_name: 'v2.0.0', prerelease: false },
		]);

		const version = await getLatestGithubReleaseVersion(owner, repo);

		expect(version).toBe('2.0.0');
	});

	it('includes prerelease versions when allowPrerelease is true', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([
			{ tag_name: 'v3.0.0-beta', prerelease: true },
			{ tag_name: 'v2.0.0', prerelease: false },
		]);

		const version = await getLatestGithubReleaseVersion(owner, repo, true);

		expect(version).toBe('3.0.0-beta');
	});

	it('skips draft releases', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([
			{ tag_name: 'v3.0.0', draft: true },
			{ tag_name: 'v2.0.0', draft: false },
		]);

		const version = await getLatestGithubReleaseVersion(owner, repo);

		expect(version).toBe('2.0.0');
	});

	it('skips draft releases even when allowPrerelease is true', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([
			{ tag_name: 'v3.0.0-beta', draft: true, prerelease: true },
			{ tag_name: 'v2.0.0-beta', draft: false, prerelease: true },
		]);

		const version = await getLatestGithubReleaseVersion(owner, repo, true);

		expect(version).toBe('2.0.0-beta');
	});

	it('throws error when response is not an array', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse({ error: 'Not Found' });

		await expect(getLatestGithubReleaseVersion(owner, repo)).rejects.toThrow('Unexpected GitHub API response');
	});

	it('throws error when response status is not ok', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse({ error: 'Forbidden' }, 403);

		await expect(getLatestGithubReleaseVersion(owner, repo)).rejects.toThrow('GitHub API returned 403');
	});

	it('throws error when no valid version is found', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([]);

		await expect(getLatestGithubReleaseVersion(owner, repo)).rejects.toThrow(
			`Could not fetch the version of the latest release: https://github.com/${owner}/${repo}/releases`
		);
	});
});
