import { describe, expect, it, vi } from 'vitest';

const { getLatestGithubReleaseVersion, getLatestNPMReleaseVersion } = await import('../utils/release_version');

// Mock fetch helper
function mockFetchResponse(data: unknown, status = 200): void {
	// @ts-expect-error mocking global
	global.fetch = vi.fn(async () =>
		Promise.resolve({
			arrayBuffer: async () => Promise.resolve(getAsBuffer()),
			headers: new Headers({ 'content-type': 'text/plain' }),
			json: async () => Promise.resolve(getAsJSON()),
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
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		mockFetchResponse({ error: 'Not Found' });

		await expect(getLatestGithubReleaseVersion(owner, repo)).rejects.toThrow(
			'wrong response, maybe set environment variable "GH_TOKEN"?'
		);

		expect(consoleLogSpy).toHaveBeenCalledWith({ data: { error: 'Not Found' } });
		consoleLogSpy.mockRestore();
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

describe('getLatestNPMReleaseVersion', () => {
	it('fetches the latest release version', async () => {
		const packageName = '@exampleOrg/exampleRepo';

		mockFetchResponse({
			versions: {
				a: { version: '1.7.3' },
				b: { version: '12.7.3' },
				c: { version: '1.7.3' },
			},
		});

		const version = await getLatestNPMReleaseVersion(packageName);

		expect(version).toBe('12.7.3');
		expect(global.fetch).toHaveBeenCalledWith(`https://registry.npmjs.org/${packageName}`, expect.anything());
	});

	it('correctly sorts versions numerically', async () => {
		const packageName = '@exampleOrg/exampleRepo';

		mockFetchResponse({
			versions: {
				a: { version: '1.2.3' },
				b: { version: '1.2.10' },
				c: { version: '1.10.0' },
				d: { version: '2.0.0' },
			},
		});

		const version = await getLatestNPMReleaseVersion(packageName);

		expect(version).toBe('2.0.0');
	});

	it('throws error when response does not have versions field', async () => {
		const packageName = '@exampleOrg/exampleRepo';
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		mockFetchResponse({ error: 'Not Found' });

		await expect(getLatestNPMReleaseVersion(packageName)).rejects.toThrow('wrong response');

		expect(consoleLogSpy).toHaveBeenCalledWith({ data: { error: 'Not Found' } });
		consoleLogSpy.mockRestore();
	});

	it('throws error when response is null', async () => {
		const packageName = '@exampleOrg/exampleRepo';
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		mockFetchResponse(null);

		await expect(getLatestNPMReleaseVersion(packageName)).rejects.toThrow('wrong response');

		expect(consoleLogSpy).toHaveBeenCalledWith({ data: null });
		consoleLogSpy.mockRestore();
	});

	it('throws error when response is not an object', async () => {
		const packageName = '@exampleOrg/exampleRepo';
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		mockFetchResponse('invalid response');

		await expect(getLatestNPMReleaseVersion(packageName)).rejects.toThrow('wrong response');

		expect(consoleLogSpy).toHaveBeenCalledWith({ data: 'invalid response' });
		consoleLogSpy.mockRestore();
	});
});
