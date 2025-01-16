import { FrontendConfig } from '../src/lib/frontend';
import { RollupConfig } from '../src/lib/rollup';

export const rollupConfigs: RollupConfig[] = [
	{
		frontend: 'mapmaker',
		input: 'assets/lib/mapmaker/main.ts',
		output: 'assets/lib/mapmaker/mapmaker.js',
		drop: ['*.ts']
	},
]

export const frontendConfigs: FrontendConfig[] = [
	{
		name: 'frontend',
		include: ['all', 'frontend', 'mapdesigner']
	},
	{
		name: 'frontend-dev',
		include: ['all', 'frontend-dev', 'mapmaker']
	},
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
