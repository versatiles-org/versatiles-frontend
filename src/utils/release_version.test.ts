import { versions } from 'process';
import { mockFetchResponse } from './__mocks__/global_fetch';


const { getLatestGithubReleaseVersion, getLatestNPMReleaseVersion } = await import('../utils/release_version');

describe('getLatestGithubReleaseVersion', () => {
	it('fetches the latest release version', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		mockFetchResponse([{ tag_name: 'v12.7.3' }]);

		const version = await getLatestGithubReleaseVersion(owner, repo);

		expect(version).toBe('12.7.3');
		expect(global.fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${owner}/${repo}/releases`, expect.anything());
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
			}
		});

		const version = await getLatestNPMReleaseVersion(packageName);

		expect(version).toBe('12.7.3');
		expect(global.fetch).toHaveBeenCalledWith(`https://registry.npmjs.org/${packageName}`, expect.anything());
	});
});
