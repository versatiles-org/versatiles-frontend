import type { FrontendConfig } from '../src/frontend/frontend';

export const frontendConfigs: FrontendConfig[] = [
	{
		name: 'frontend',
		include: ['all', 'frontend', 'rollup:style-selector']
	},
	/*
	{
		name: 'frontend-dev',
		include: ['all', 'frontend-dev', 'rollup:style-selector']
	},
	*/
	{
		name: 'frontend-min',
		include: ['all', 'frontend-min'],
		ignore: [
			'assets/glyphs/*',
			'!assets/glyphs/noto_sans_regular/',
			'*.d.ts',
			'*.map',
			'*@3x.json',
			'*@3x.png',
			'*@4x.json',
			'*@4x.png',
			'assets/lib/maplibre-gl-inspect/',
			'assets/lib/maplibre-gl/maplibre-gl-csp*',
			'assets/lib/maplibre-gl/maplibre-gl-dev*',
			'assets/styles/'
		]
	}
]
