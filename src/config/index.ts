import type { SourceConfig } from '../sources/source-config';
import { githubSource, npmSource, staticSource } from './sources';
import type { FrontendConfig } from '../frontend/frontend';
import { emptyGlyphPbf, limitFontFamiliesCodeblocks, removeItalicFaces, removeItalicFontIds } from './glyphs';

export const sourceConfigs = {
	fonts: githubSource('versatiles-org/versatiles-fonts', {
		assets: [
			{
				url: 'https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/fonts.tar.zst',
				format: 'tar.zst',
				dest: 'assets/glyphs/',
			},
		],
		source: { name: 'VersaTiles Fonts', url: 'https://github.com/versatiles-org/versatiles-fonts' },
	}),

	'fonts-noto': githubSource('versatiles-org/versatiles-fonts', {
		assets: [
			{
				url: 'https://github.com/versatiles-org/versatiles-fonts/releases/download/v${version}/noto_sans.tar.zst',
				format: 'tar.zst',
				dest: 'assets/glyphs/',
			},
		],
		source: { name: 'VersaTiles Fonts', url: 'https://github.com/versatiles-org/versatiles-fonts' },
	}),

	sprites: githubSource('versatiles-org/versatiles-style', {
		prerelease: true,
		assets: [
			{
				url: 'https://github.com/versatiles-org/versatiles-style/releases/download/v${version}/sprites.tar.gz',
				format: 'tar.gz',
				dest: 'assets/sprites/',
			},
		],
	}),

	'versatiles-style': githubSource('versatiles-org/versatiles-style', {
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

	// MapLibre GL JS 6 is ESM-only and ships no UMD build, so we bundle it into a classic
	// script exposing the `maplibregl` global. That keeps the plain `<script src>` tags in the
	// frontends working, and the UMD plugins below still find the global they expect.
	maplibre: npmSource('maplibre-gl', {
		bundle: {
			entry: 'dist/maplibre-gl.mjs',
			globalName: 'maplibregl',
			outfile: 'maplibre-gl.js',
			// The worker stays an untouched ES module shipped next to the bundle. Deriving its URL
			// from the running script keeps the bundle working under any base path.
			setup:
				'try{const s=document.currentScript&&document.currentScript.src;' +
				'if(s)maplibregl.setWorkerUrl(new URL("./maplibre-gl-worker.mjs",s).href)}catch{}',
		},
		// The worker resolves its own import of maplibre-gl-shared.mjs, so both must ship.
		include: /dist\/(maplibre-gl\.css|maplibre-gl-worker\.mjs|maplibre-gl-shared\.mjs)$/,
		flatten: true,
		dest: 'assets/lib/maplibre-gl/',
		source: { name: 'MapLibre GL JS', url: 'https://maplibre.org/maplibre-gl-js/docs/' },
	}),

	'maplibre-inspect': npmSource('@maplibre/maplibre-gl-inspect', {
		include: /dist\/.*\.(js|css|map)$/,
		flatten: true,
		dest: 'assets/lib/maplibre-gl-inspect/',
		source: { name: 'MapLibre GL Inspect', url: 'https://github.com/maplibre/maplibre-gl-inspect' },
	}),

	// Attaches itself as `maplibregl.Compare` when it finds the global, so it needs no bundling -
	// but it must be loaded after maplibre-gl. Our maplibre global is a plain object (see the
	// bundle shim in sources/npm.ts), so the plugin can write to it.
	'maplibre-gl-compare': npmSource('@maplibre/maplibre-gl-compare', {
		include: /dist\/maplibre-gl-compare\.(js|css)$/,
		flatten: true,
		dest: 'assets/lib/maplibre-gl-compare/',
		source: { name: 'MapLibre GL Compare', url: 'https://github.com/maplibre/maplibre-gl-compare' },
	}),

	'maplibre-gl-geocoder': npmSource('@maplibre/maplibre-gl-geocoder', {
		include: /dist\/maplibre-gl-geocoder\.(js|css)(\.map)?$/,
		flatten: true,
		dest: 'assets/lib/maplibre-gl-geocoder/',
		source: { name: 'MapLibre GL Geocoder', url: 'https://github.com/maplibre/maplibre-gl-geocoder' },
	}),

	'maplibre-versatiles-styler': npmSource('maplibre-versatiles-styler', {
		include: /dist\/.*\.(umd\.cjs|d\.ts)(\.map)?$/,
		flatten: true,
		rename: {
			'maplibre-versatiles-styler.umd.cjs': 'maplibre-versatiles-styler.js',
			'maplibre-versatiles-styler.umd.cjs.map': 'maplibre-versatiles-styler.js.map',
		},
		dest: 'assets/lib/maplibre-versatiles-styler/',
		source: { name: 'MapLibre VersaTiles Styler', url: 'https://github.com/versatiles-org/maplibre-versatiles-styler' },
	}),

	'versatiles-svg-renderer': npmSource('@versatiles/maplibre-svg-export', {
		include: /dist\/maplibre-svg-export\.umd\.min\.js$/,
		flatten: true,
		rename: {
			'maplibre-svg-export.umd.min.js': 'versatiles-svg-renderer.js',
		},
		dest: 'assets/lib/versatiles-svg-renderer/',
		source: { name: 'VersaTiles SVG Renderer', url: 'https://github.com/versatiles-org/versatiles-svg-renderer' },
	}),

	// A prebuilt static site, served from /editor/ with its read-only viewer at /editor/view/.
	// Its own configuration file is left out in favour of ours in frontends/map-editor-config/.
	'map-editor': npmSource('@versatiles/map-editor', {
		stripPrefix: 'dist/',
		include: /^(?!map-editor\.config\.jsonc$)/,
		dest: 'editor/',
		source: { name: 'VersaTiles Map Editor', url: 'https://github.com/versatiles-org/versatiles-map-editor' },
	}),

	all: staticSource('all'),
	'map-editor-config': staticSource('map-editor-config'),
	frontend: staticSource('frontend'),
	'frontend-dev': staticSource('frontend-dev'),
	'frontend-tiny': staticSource('frontend-tiny'),
} satisfies Record<string, SourceConfig>;

export const frontendConfigs: FrontendConfig<keyof typeof sourceConfigs>[] = [
	{
		name: 'frontend',
		description: 'Full standard frontend with all fonts, sprites, and libraries.',
		fileDBs: [
			'all',
			'frontend',
			'fonts',
			'sprites',
			'versatiles-style',
			'maplibre',
			'maplibre-inspect',
			'maplibre-gl-compare',
			'maplibre-gl-geocoder',
			'maplibre-versatiles-styler',
			'versatiles-svg-renderer',
			'map-editor-config',
			'map-editor',
		],
	},
	{
		name: 'frontend-dev',
		description: 'Full standard frontend but with development-specific UI.',
		fileDBs: [
			'all',
			'frontend-dev',
			'fonts',
			'sprites',
			'versatiles-style',
			'maplibre',
			'maplibre-inspect',
			'maplibre-gl-compare',
			'maplibre-gl-geocoder',
			'maplibre-versatiles-styler',
			'versatiles-svg-renderer',
			'map-editor-config',
			'map-editor',
		],
	},
	{
		name: 'frontend-min',
		description: 'Full standard frontend but with only Noto Sans fonts.',
		fileDBs: [
			'all',
			'frontend',
			'fonts-noto',
			'sprites',
			'versatiles-style',
			'maplibre',
			'maplibre-inspect',
			'maplibre-gl-compare',
			'maplibre-gl-geocoder',
			'maplibre-versatiles-styler',
			'versatiles-svg-renderer',
			'map-editor-config',
			'map-editor',
		],
	},
	{
		name: 'frontend-blank',
		description: 'Blank frontend with only fonts and sprites.',
		fileDBs: ['fonts', 'sprites'],
	},
	{
		name: 'frontend-tiny',
		description:
			'Minimal frontend with sprites, MapLibre, VersaTiles style and Noto Sans fonts supporting only Latin characters.',
		fileDBs: [
			'all',
			'frontend-tiny',
			'fonts-noto',
			'sprites',
			'versatiles-style',
			'maplibre',
			'maplibre-versatiles-styler',
		],
		ignore: [
			'*.js.map',
			'*@3x.json',
			'*@3x.png',
			'*@4x.json',
			'*@4x.png',
			// The styles here only ask for noto_sans_regular and noto_sans_bold, so the italic
			// faces are half the glyph payload for nothing. index.json and font_families.json are
			// rewritten below to match, so nothing advertises a face that is no longer served.
			'assets/glyphs/*_italic/',
		],
		// Keep only Latin glyphs (codepoints < 1024). Higher ranges are not deleted but
		// replaced with valid, empty glyph tiles, so clients get an HTTP 200 (no glyphs)
		// instead of a 404 when they request an out-of-range codepoint.
		// font_families.json is updated to match, so its codeblocks do not claim the removed glyphs.
		transform: (name, content) => {
			if (name === 'assets/glyphs/font_families.json') {
				return limitFontFamiliesCodeblocks(removeItalicFaces(content), 1024);
			}
			if (name === 'assets/glyphs/index.json') return removeItalicFontIds(content);
			const match = name.match(/^assets\/glyphs\/[^/]+\/(\d+)-\d+\.pbf$/);
			if (!match) return content;
			if (parseInt(match[1], 10) < 1024) return content;
			return emptyGlyphPbf();
		},
	},
];
