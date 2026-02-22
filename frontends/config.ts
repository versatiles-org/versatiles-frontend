import { githubSource, npmSource, staticSource, type SourceConfig } from '../src/files/source_config';
import type { FrontendConfig } from '../src/frontend/frontend';

export const sourceConfigs = {
	'external-fonts': githubSource('versatiles-org/versatiles-fonts', {
		assets: [
			{
				url: 'https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/fonts.tar.gz',
				format: 'tar.gz',
				dest: 'assets/glyphs/',
			},
		],
		source: { name: 'VersaTiles Fonts', url: 'https://github.com/versatiles-org/versatiles-fonts' },
	}),

	'external-fonts-noto': githubSource('versatiles-org/versatiles-fonts', {
		assets: [
			{
				url: 'https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/noto_sans.tar.gz',
				format: 'tar.gz',
				dest: 'assets/glyphs/',
			},
		],
		source: { name: 'VersaTiles Fonts', url: 'https://github.com/versatiles-org/versatiles-fonts' },
	}),

	'external-sprites': githubSource('versatiles-org/versatiles-style', {
		prerelease: true,
		assets: [
			{
				url: 'https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz',
				format: 'tar.gz',
				dest: 'assets/sprites/',
			},
		],
	}),

	'external-versatiles-style': githubSource('versatiles-org/versatiles-style', {
		prerelease: true,
		assets: [
			{
				url: 'https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/versatiles-style.tar.gz',
				format: 'tar.gz',
				dest: 'assets/lib/versatiles-style/',
			},
		],
		source: { name: 'VersaTiles Style', url: 'https://github.com/versatiles-org/versatiles-style' },
	}),

	'external-maplibre': npmSource('maplibre-gl', {
		include: /dist\/.*\.(js|css|map)$/,
		flatten: true,
		dest: 'assets/lib/maplibre-gl/',
		source: { name: 'MapLibre GL JS', url: 'https://maplibre.org/maplibre-gl-js/docs/' },
	}),

	'external-maplibre-inspect': npmSource('@maplibre/maplibre-gl-inspect', {
		include: /dist\/.*\.(js|css|map)$/,
		flatten: true,
		dest: 'assets/lib/maplibre-gl-inspect/',
		source: { name: 'MapLibre GL Inspect', url: 'https://github.com/maplibre/maplibre-gl-inspect' },
	}),

	'external-maplibre-versatiles-styler': npmSource('maplibre-versatiles-styler', {
		include: /dist\/.*\.(umd\.cjs|d\.ts)(\.map)?$/,
		flatten: true,
		rename: {
			'maplibre-versatiles-styler.umd.cjs': 'maplibre-versatiles-styler.js',
			'maplibre-versatiles-styler.umd.cjs.map': 'maplibre-versatiles-styler.js.map',
		},
		dest: 'assets/lib/maplibre-versatiles-styler/',
		source: { name: 'MapLibre VersaTiles Styler', url: 'https://github.com/versatiles-org/maplibre-versatiles-styler' },
	}),

	'external-versatiles-svg-renderer': npmSource('@versatiles/svg-renderer', {
		include: /dist\/maplibre\.umd\.js(\.map)?$/,
		flatten: true,
		rename: {
			'maplibre.umd.js': 'versatiles-svg-renderer.js',
			'maplibre.umd.js.map': 'versatiles-svg-renderer.js.map',
		},
		dest: 'assets/lib/versatiles-svg-renderer/',
		source: { name: 'VersaTiles SVG Renderer', url: 'https://github.com/versatiles-org/versatiles-svg-renderer' },
	}),

	'external-mapbox-rtl-text': npmSource('@mapbox/mapbox-gl-rtl-text', {
		include: /dist\/.*\.(js|css|map)$/,
		flatten: true,
		dest: 'assets/lib/mapbox-gl-rtl-text/',
		source: { name: 'Mapbox GL RTL Text', url: 'https://github.com/mapbox/mapbox-gl-rtl-text' },
	}),

	all: staticSource('all'),
	frontend: staticSource('frontend'),
	'frontend-dev': staticSource('frontend-dev'),
} satisfies Record<string, SourceConfig>;

export const frontendConfigs: FrontendConfig<keyof typeof sourceConfigs>[] = [
	{
		name: 'frontend',
		fileDBs: [
			'all',
			'frontend',
			'external-fonts',
			'external-sprites',
			'external-versatiles-style',
			'external-maplibre',
			'external-maplibre-inspect',
			'external-maplibre-versatiles-styler',
			'external-versatiles-svg-renderer',
			'external-mapbox-rtl-text',
		],
	},
	{
		name: 'frontend-dev',
		fileDBs: [
			'all',
			'frontend-dev',
			'external-fonts',
			'external-sprites',
			'external-versatiles-style',
			'external-maplibre',
			'external-maplibre-inspect',
			'external-maplibre-versatiles-styler',
			'external-versatiles-svg-renderer',
			'external-mapbox-rtl-text',
		],
	},
	{
		name: 'frontend-min',
		fileDBs: [
			'all',
			'frontend',
			'external-fonts-noto',
			'external-sprites',
			'external-versatiles-style',
			'external-maplibre',
			'external-maplibre-inspect',
			'external-maplibre-versatiles-styler',
			'external-versatiles-svg-renderer',
			'external-mapbox-rtl-text',
		],
	},
	{
		name: 'frontend-tiny',
		fileDBs: [
			'all',
			'frontend',
			'external-fonts-noto',
			'external-sprites',
			'external-versatiles-style',
			'external-maplibre',
		],
		ignore: ['*.js.map', '*@3x.json', '*@3x.png', '*@4x.json', '*@4x.png', 'maplibre-gl-csp*', 'maplibre-gl-dev*'],
		filter: (filename: string): boolean => {
			const match = filename.match(/^assets\/glyphs\/[^/]+\/(\d+)-\d+\.pbf/);
			if (!match) return true;
			return parseInt(match[1], 10) < 1024;
		},
	},
];
