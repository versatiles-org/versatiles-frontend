import { Curl } from '../utils/curl';
import { basename, join } from 'path';
import notes from '../utils/release_notes';
import { FileDB } from './filedb';
import { getLatestGithubReleaseVersion } from '../utils/release_version';
import type { ExternalSourceConfig, AssetConfig } from './source_config';

export class ExternalFileDB extends FileDB {
	public static async build(config: ExternalSourceConfig): Promise<ExternalFileDB> {
		const db = new ExternalFileDB();

		const version = await db.resolveVersion(config);

		const label = notes.add(config.notes);
		label.setVersion(version);

		for (const asset of config.assets) {
			const url = asset.url.replaceAll('${version}', version);
			await db.fetchAsset(url, asset);
		}

		return db;
	}

	private async resolveVersion(config: ExternalSourceConfig): Promise<string> {
		const [owner, repo] = config.version.github.split('/');
		if (config.version.pin) {
			const latest = await getLatestGithubReleaseVersion(owner, repo, config.version.prerelease);
			if (latest !== config.version.pin) {
				console.warn(`Warning: ${repo} ${latest} available (pinned to ${config.version.pin})`);
			}
			return config.version.pin;
		}
		return getLatestGithubReleaseVersion(owner, repo, config.version.prerelease);
	}

	private async fetchAsset(url: string, asset: AssetConfig): Promise<void> {
		const curl = new Curl(this, url);
		const mapFilename = (filename: string): string | false => {
			if (asset.include && !asset.include.test(filename)) return false;
			let name = asset.flatten ? basename(filename) : filename;
			if (asset.rename?.[name]) name = asset.rename[name];
			return join(asset.dest, name);
		};

		switch (asset.format) {
			case 'tar.gz':
				await curl.ungzipUntar(mapFilename);
				break;
			case 'zip':
				await curl.unzip(mapFilename);
				break;
		}
	}

	public enterWatchMode(): void {}
}
