import { Curl } from '../utils/curl';
import { basename, join } from 'path';
import notes from '../utils/release_notes';
import { FileDB } from './filedb';
import { getLatestGithubReleaseVersion, getLatestNPMReleaseVersion } from '../utils/release_version';

// Define constants for asset directories.
const folderStyle = 'assets/styles/';
const folderLibrary = 'assets/lib/';
const folderGlyphs = 'assets/glyphs/';
const folderSprites = 'assets/sprites/';

type ExternalFileDBSources = 'fonts-all' | 'fonts-noto' | 'styles' | 'mapbox-rtl-text' | 'maplibre' | 'maplibre-inspect' | 'maplibre-versatiles-styler';

export interface ExternalFileDBConfig {
	type: 'external';
	source: ExternalFileDBSources;
}

export class ExternalFileDB extends FileDB {
	/**
	 * Constructs a FileSystem instance optionally with an existing map of files.
	 * 
	 * @param files - An optional map of files to initialize the file system.
	 */
	public static async build(config: ExternalFileDBConfig): Promise<ExternalFileDB> {
		const db = new ExternalFileDB();
		switch (config.source) {
			case 'fonts-all': await db.addFonts('fonts'); break;
			case 'fonts-noto': await db.addFonts('noto_sans'); break;
			case 'styles': await db.addStyles(); break;
			case 'maplibre': await db.addMaplibre(); break;
			case 'maplibre-inspect': await db.addMaplibreInspect(); break;
			case 'maplibre-versatiles-styler': await db.addMaplibreVersatilesStyler(); break;
			case 'mapbox-rtl-text': await db.addMapboxRTLText(); break;
			default: throw new Error(`Unknown external file source: ${config.source}`);
		}
		return db;
	}



	// Adds fonts to the project by downloading and extracting them from the specified release.
	private async addFonts(name: 'fonts' | 'noto_sans'): Promise<void> {
		const label = notes.add('[VersaTiles fonts](https://github.com/versatiles-org/versatiles-fonts)');
		const version = await getLatestGithubReleaseVersion('versatiles-org', 'versatiles-fonts');
		label.setVersion(version);

		await new Curl(this, `https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/${name}.tar.gz`)
			.ungzipUntar(filename => {
				if (filename == 'fonts.json') filename = 'index.json';
				return join(folderGlyphs, filename)
			});
	}

	// Adds styles and sprites to the project by downloading and extracting them from the specified releases.
	private async addStyles(): Promise<void> {
		const folderLib = join(folderLibrary, 'versatiles-style/');
		const label = notes.add('[VersaTiles style](https://github.com/versatiles-org/versatiles-style)');

		const version = await getLatestGithubReleaseVersion('versatiles-org', 'versatiles-style', true);
		label.setVersion(version);
		await new Curl(this, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/styles.tar.gz`)
			.ungzipUntar(f => join(folderStyle, f));
		await new Curl(this, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/versatiles-style.tar.gz`)
			.ungzipUntar(f => join(folderLib, f));
		await new Curl(this, `https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz`)
			.ungzipUntar(f => join(folderSprites, f));
	}

	// Adds MapLibre GL JS to the project by downloading and extracting the distribution files from the specified release.
	private async addMaplibre(): Promise<void> {
		const version = '5.14.0';
		const folder = join(folderLibrary, 'maplibre-gl');
		const label = notes.add('[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)');
		const new_version = await getLatestGithubReleaseVersion('maplibre', 'maplibre-gl-js');
		if (new_version !== version) {
			console.warn(`Warning: A new MapLibre GL JS version ${new_version} is available (currently using ${version})`);
		}
		label.setVersion(version);
		await new Curl(this, `https://github.com/maplibre/maplibre-gl-js/releases/download/v${version}/dist.zip`)
			.unzip(f => /dist\/.*\.(js|css|map)$/.test(f) && join(folder, basename(f)));
	}

	// Adds MapLibre GL Inspect plugin to the project by downloading and saving the necessary JavaScript and CSS files.
	private async addMaplibreInspect(): Promise<void> {
		const folder = join(folderLibrary, 'maplibre-gl-inspect');
		const label = notes.add('[MapLibre GL Inspect](https://github.com/maplibre/maplibre-gl-inspect)');
		const version = await getLatestNPMReleaseVersion('@maplibre/maplibre-gl-inspect');
		label.setVersion(version);
		await new Curl(this, `https://registry.npmjs.org/@maplibre/maplibre-gl-inspect/-/maplibre-gl-inspect-${version}.tgz`)
			.ungzipUntar(f => /package\/dist\/.*\.(js|css|map)$/.test(f) && join(folder, basename(f)));
	}

	// Adds MapLibre VersaTiles Styler to the project by downloading and saving the necessary JavaScript and CSS files.
	private async addMaplibreVersatilesStyler(): Promise<void> {
		const folder = join(folderLibrary, 'maplibre-versatiles-styler');
		const label = notes.add('[MapLibre VersaTiles Styler](https://github.com/versatiles-org/maplibre-versatiles-styler)');
		const version = await getLatestGithubReleaseVersion('versatiles-org', 'maplibre-versatiles-styler');
		label.setVersion(version);
		await new Curl(this, `https://github.com/versatiles-org/maplibre-versatiles-styler/releases/download/v${version}/maplibre-versatiles-styler.tar.gz`)
			.ungzipUntar(f => join(folder, basename(f)));
	}

	// Adds MapLibre GL Inspect plugin to the project by downloading and saving the necessary JavaScript and CSS files.
	private async addMapboxRTLText(): Promise<void> {
		const folder = join(folderLibrary, 'mapbox-gl-rtl-text');
		const label = notes.add('[Mapbox GL RTL Text](https://github.com/mapbox/mapbox-gl-rtl-text)');
		const version = await getLatestNPMReleaseVersion('@mapbox/mapbox-gl-rtl-text');
		label.setVersion(version);
		await new Curl(this, `https://registry.npmjs.org/@mapbox/mapbox-gl-rtl-text/-/mapbox-gl-rtl-text-${version}.tgz`)
			.ungzipUntar(f => /package\/dist\/.*\.(js|css|map)$/.test(f) && join(folder, basename(f)));
	}

	public enterWatchMode(): void { }
}