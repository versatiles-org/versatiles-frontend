import { mockFetchResponse } from './__mocks__/global_fetch';


const { getLatestReleaseVersion } = await import('../utils/release_version');

describe('getLatestReleaseVersion', () => {
	it('fetches the latest release version', async () => {
		const owner = 'exampleOrg';
		const repo = 'exampleRepo';

		 
		mockFetchResponse([{ tag_name: 'v12.7.3' }]);

		const version = await getLatestReleaseVersion(owner, repo);

		expect(version).toBe('12.7.3');
		expect(global.fetch).toHaveBeenCalledWith(`https://api.github.com/repos/${owner}/${repo}/releases`, expect.anything());
	});
});
