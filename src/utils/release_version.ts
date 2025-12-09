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
	const url = `https://api.github.com/repos/${owner}/${repo}/releases`;

	const headers = new Headers();
	// Optionally use a GitHub token for authorization.
	if (process.env.GH_TOKEN != null) headers.append('Authorization', 'Bearer ' + process.env.GH_TOKEN);

	const response = await fetch(url, { headers, redirect: 'follow' });
	const data = await response.json();
	// Validate the response data.
	if (!Array.isArray(data)) {
		console.log({ data });
		throw Error('wrong response, maybe set environment variable "GH_TOKEN"?');
	}

	// Extract and return the latest version, ignoring the 'v' prefix.
	for (const entry of data) {
		if (!allowPrerelease && entry.prerelease) continue;

		const name = String(entry.tag_name);
		if (name.startsWith('v')) return name.slice(1);
	}
	// If no valid version is found, throw an error.
	throw Error(`Could not fetch the version of the latest release: https://github.com/${owner}/${repo}/releases`);
}

/**
 * Fetches the latest release version of a GitHub repository.
 *
 * @param packageName - The name of the package, e.g. "@maplibre/maplibre-gl-inspect".
 * @returns A promise that resolves to the latest release version string.
 */
export async function getLatestNPMReleaseVersion(packageName: string): Promise<string> {
	const url = `https://registry.npmjs.org/${packageName}`;

	const headers = new Headers();
	const response = await fetch(url, { headers, redirect: 'follow' });
	const data = await response.json();
	// Validate the response data.
	if (typeof data !== 'object' || data == null || !('versions' in data)) {
		console.log({ data });
		throw Error('wrong response');
	}

	const entries = data.versions as Record<string, { version: string }>;
	// Extract and return the latest version, ignoring the 'v' prefix.
	const versions = Object.values(entries).map((entry) => {
		const { version } = entry;
		const value = version.split('.').reduceRight((acc, cur) => acc / 1000 + Number(cur), 0);
		return { version, value };
	});
	versions.sort((a, b) => b.value - a.value);

	return versions[0].version;
}
