import { Curl } from '../utils/curl';
import { basename, join } from 'node:path';
import notes from '../utils/release_notes';
import { FileDB } from './filedb';
import { getLatestGithubReleaseVersion, getLatestNPMReleaseVersion } from '../utils/release_version';

// Define constants for asset directories.
const folderStyle = 'assets/styles/';
const folderLibrary = 'assets/lib/';
const folderGlyphs = 'assets/glyphs/';
const folderSprites = 'assets/sprites/';

type AssetFileDBSources = 'fonts' | 'styles' | 'maplibre' | 'maplibre-inspect';

export interface AssetFileDBConfig {
	type: 'asset';
	source: AssetFileDBSources;
}

export class AssetFileDB extends FileDB {
	/**
	 * Constructs a FileSystem instance optionally with an existing map of files.
	 * 
	 * @param files - An optional map of files to initialize the file system.
	 */
	public static async build(config: AssetFileDBConfig): Promise<AssetFileDB> {
		const db = new AssetFileDB();
		switch (config.source) {
			case 'fonts': await db.addFonts(); break;
			case 'styles': await db.addStyles(); break;
			case 'maplibre': await db.addMaplibre(); break;
			case 'maplibre-inspect': await db.addMaplibreInspect(); break;
		}
		return db;
	}



	/**
	 * Adds fonts to the project by downloading and extracting them from the specified release.
	 *
	 */
	private async addFonts(): Promise<void> {
		const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
		const version = await getLatestGithubReleaseVersion('versatiles-org', 'versatiles-fonts');
		label.setVersion(version);
		await new Curl(this, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/fonts.tar.gz`)
			.ungzipUntar(f => [folderGlyphs, f]);
	}

	/**
	 * Adds styles and sprites to the project by downloading and extracting them from the specified releases.
	 * 
	 */
	private async addStyles(): Promise<void> {
		const folderLib = join(folderLibrary, 'versatiles-style/');
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-style)');

		const version = await getLatestGithubReleaseVersion('versatiles-org', 'versatiles-style', true);
		label.setVersion(version);
		await new Curl(this, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/styles.tar.gz`)
			.ungzipUntar(f => [folderStyle, f]);
		await new Curl(this, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/versatiles-style.tar.gz`)
			.ungzipUntar(f => [folderLib, f]);
		await new Curl(this, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz`)
			.ungzipUntar(f => [folderSprites, f]);
	}

	/**
	 * Adds MapLibre GL JS to the project by downloading and extracting the distribution files from the specified release.
	 * 
	 */
	private async addMaplibre(): Promise<void> {
		const folder = join(folderLibrary, 'maplibre-gl');
		const label = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
		const version = await getLatestGithubReleaseVersion('maplibre', 'maplibre-gl-js');
		label.setVersion(version);
		await new Curl(this, `https://github.com/maplibre/maplibre-gl-js/releases/download/v${version}/dist.zip`)
			.unzip(f => /dist\/.*\.(js|css|map)$/.test(f) && [folder, basename(f)]);
	}

	/**
	 * Adds MapLibre GL Inspect plugin to the project by downloading and saving the necessary JavaScript and CSS files.
	 * 
	 */
	private async addMaplibreInspect(): Promise<void> {
		const folder = join(folderLibrary, 'maplibre-gl-inspect');
		const label = notes.add('[MapLibre GL Inspect](https://github.com/maplibre/maplibre-gl-inspect)');
		const version = await getLatestNPMReleaseVersion('@maplibre/maplibre-gl-inspect');
		label.setVersion(version);
		await new Curl(this, `https://registry.npmjs.org/@maplibre/maplibre-gl-inspect/-/maplibre-gl-inspect-${version}.tgz`)
			.ungzipUntar(f => /package\/dist\/.*\.(js|css|map)$/.test(f) && [folder, basename(f)]);
	}

	public enterWatchMode(): void { }
}