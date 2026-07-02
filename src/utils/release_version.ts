import { fetchRetry } from './fetch';

/**
 * Fetches the latest release version of a GitHub repository.
 *
 * @param owner - The GitHub username or organization name of the repository owner.
 * @param repo - The name of the repository.
 * @returns A promise that resolves to the latest release version string.
 */
export async function getLatestGithubReleaseVersion(
	owner: string,
	repo: string,
	allowPrerelease = false
): Promise<string> {
	// Request up to 100 releases (the API returns 30 by default) so a burst of recent
	// prereleases can't hide the latest stable release when allowPrerelease is false.
	const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;

	const headers = new Headers();
	// Optionally use a GitHub token for authorization.
	if (process.env.GH_TOKEN != null) headers.append('Authorization', 'Bearer ' + process.env.GH_TOKEN);

	const response = await fetchRetry(url, { headers, redirect: 'follow' });
	if (!response.ok) {
		// Detect the (very common) unauthenticated rate-limit case and give an actionable message.
		if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
			const reset = response.headers.get('X-RateLimit-Reset');
			const resetInfo = reset ? `, resets at ${new Date(Number(reset) * 1000).toISOString()}` : '';
			throw Error(
				`GitHub API rate limit exceeded for ${url}${resetInfo}. Set environment variable "GH_TOKEN" to raise the limit.`
			);
		}
		throw Error(`GitHub API returned ${response.status} for ${url}, maybe set environment variable "GH_TOKEN"?`);
	}
	const data = await response.json();
	// Validate the response data.
	if (!Array.isArray(data)) {
		throw Error(`Unexpected GitHub API response for ${url}, maybe set environment variable "GH_TOKEN"?`);
	}

	// Return the first matching release (the API lists them newest-first), stripping an
	// optional leading 'v' so repositories that tag without the prefix also work.
	for (const entry of data) {
		if (!allowPrerelease && entry.prerelease) continue;

		const name = String(entry.tag_name);
		return name.startsWith('v') ? name.slice(1) : name;
	}
	// If no valid version is found, throw an error.
	throw Error(`Could not fetch the version of the latest release: https://github.com/${owner}/${repo}/releases`);
}
