import { Curl } from './curl';
import { FileDB } from './filedb';
import { mapEntryName } from './entry_path';
import { getLatestGithubReleaseVersion } from './release_version';
import type { ExternalSourceConfig, AssetConfig } from './source_config';

export class ExternalFileDB extends FileDB {
	public static async build(config: ExternalSourceConfig): Promise<ExternalFileDB> {
		const db = new ExternalFileDB();

		const version = await db.resolveVersion(config);

		db.source = config.source;
		db.version = version;

		for (const asset of config.assets) {
			const url = asset.url.replaceAll('${version}', version);
			await db.fetchAsset(url, asset);
		}

		return db;
	}

	private async resolveVersion(config: ExternalSourceConfig): Promise<string> {
		const [owner, repo] = config.version.github.split('/');
		const { pin, prerelease } = config.version;
		if (!pin) return getLatestGithubReleaseVersion(owner, repo, prerelease);

		// A pin is what makes a build independent of the GitHub API, so the "newer release
		// available" notice must never be able to fail it: the unauthenticated API allows only
		// 60 requests per hour, and it can be down entirely. The pinned version is already known.
		try {
			const latest = await getLatestGithubReleaseVersion(owner, repo, prerelease);
			if (latest !== pin) console.warn(`Warning: ${repo} ${latest} available (pinned to ${pin})`);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			console.warn(`Warning: could not check for ${repo} updates (pinned to ${pin}): ${reason}`);
		}
		return pin;
	}

	private async fetchAsset(url: string, asset: AssetConfig): Promise<void> {
		const curl = new Curl(this, url);
		const mapFilename = (filename: string): string | false => mapEntryName(asset, filename);

		switch (asset.format) {
			case 'tar.gz':
				await curl.ungzipUntar(mapFilename);
				break;
			case 'tar.zst':
				await curl.unzstdUntar(mapFilename);
				break;
			case 'zip':
				await curl.unzip(mapFilename);
				break;
		}
	}

	public enterWatchMode(): void {}
}
