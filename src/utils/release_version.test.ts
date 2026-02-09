import { describe, expect, it, vi } from 'vitest';

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
	it('fetches the latest release version', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([{ tag_name: 'v12.7.3' }]);

		const version = await getLatestGithubReleaseVersion(owner, repo);

		expect(version).toBe('12.7.3');
		expect(global.fetch).toHaveBeenCalledWith(
			`https://api.github.com/repos/${owner}/${repo}/releases`,
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
