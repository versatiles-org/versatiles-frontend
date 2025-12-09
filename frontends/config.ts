import type { FileDBConfig } from '../src/files/filedbs';
import type { FrontendConfig } from '../src/frontend/frontend';

export const fileDBConfigs = {
	'external-fonts': { type: 'external', source: 'fonts-all' },
	'external-fonts-noto': { type: 'external', source: 'fonts-noto' },
	'external-maplibre': { type: 'external', source: 'maplibre' },
	'external-maplibre-inspect': { type: 'external', source: 'maplibre-inspect' },
	'external-maplibre-versatiles': { type: 'external', source: 'maplibre-versatiles-styler' },
	'external-mapbox-rtl-text': { type: 'external', source: 'mapbox-rtl-text' },
	'external-styles': { type: 'external', source: 'styles' },

	all: { type: 'static', path: 'all' },
	frontend: { type: 'static', path: 'frontend' },
	'frontend-dev': { type: 'static', path: 'frontend-dev' },
	'frontend-min': { type: 'static', path: 'frontend-min' },
} as const satisfies Record<string, FileDBConfig>;

export const frontendConfigs: FrontendConfig<keyof typeof fileDBConfigs>[] = [
	{
		name: 'frontend',
		fileDBs: [
			'all',
			'frontend',
			'external-fonts',
			'external-styles',
			'external-maplibre',
			'external-maplibre-inspect',
			'external-mapbox-rtl-text',
		],
	},
	{
		name: 'frontend-dev',
		fileDBs: [
			'all',
			'frontend-dev',
			'external-fonts',
			'external-styles',
			'external-maplibre',
			'external-maplibre-inspect',
			'external-mapbox-rtl-text',
		],
	},
	{
		name: 'frontend-min',
		fileDBs: [
			'all',
			'frontend-min',
			'external-fonts-noto',
			'external-styles',
			'external-maplibre',
			'external-mapbox-rtl-text',
		],
		ignore: [
			'*.d.ts',
			'*.map',
			'*@3x.json',
			'*@3x.png',
			'*@4x.json',
			'*@4x.png',
			'assets/lib/maplibre-gl/maplibre-gl-csp*',
			'assets/lib/maplibre-gl/maplibre-gl-dev*',
			'assets/styles/',
		],
	},
];
