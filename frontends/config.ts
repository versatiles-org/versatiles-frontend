import type { FileDBConfig } from '../src/files/filedbs';
import type { FrontendConfig } from '../src/frontend/frontend';

export const fileDBConfigs = {
	'asset-fonts': { type: 'asset', source: 'fonts' },
	'asset-styles': { type: 'asset', source: 'styles' },
	'asset-maplibre': { type: 'asset', source: 'maplibre' },
	'asset-maplibre-inspect': { type: 'asset', source: 'maplibre-inspect' },

	'style-selector': { type: 'rollup', path: 'style-selector', url: 'assets/lib/style-selector/style-selector.js', globalVariable: 'StyleSelector' },

	'all': { type: 'static', path: 'all' },
	'frontend': { type: 'static', path: 'frontend' },
	'frontend-dev': { type: 'static', path: 'frontend-dev' },
	'frontend-min': { type: 'static', path: 'frontend-min' },
} as const satisfies Record<string, FileDBConfig>;

export const frontendConfigs: FrontendConfig<keyof typeof fileDBConfigs>[] = [
	{
		name: 'frontend',
		fileDBs: [
			'all',
			'frontend',
			'asset-fonts',
			'asset-styles',
			'asset-maplibre',
			'asset-maplibre-inspect',
			'style-selector'
		]
	},
	{
		name: 'frontend-dev',
		fileDBs: [
			'all',
			'frontend-dev',
			'asset-fonts',
			'asset-styles',
			'asset-maplibre',
			'asset-maplibre-inspect',
			'style-selector'
		]
	},
	{
		name: 'frontend-min',
		fileDBs: [
			'all',
			'frontend-min',
			'asset-fonts',
			'asset-styles',
			'asset-maplibre'
		],
		ignore: [
			'assets/glyphs/*',
			'!assets/glyphs/noto_sans_regular/',
			'*.d.ts',
			'*.map',
			'*@3x.json',
			'*@3x.png',
			'*@4x.json',
			'*@4x.png',
			'assets/lib/maplibre-gl/maplibre-gl-csp*',
			'assets/lib/maplibre-gl/maplibre-gl-dev*',
			'assets/styles/'
		]
	}
]
