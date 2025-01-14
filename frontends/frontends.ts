import { FrontendConfig } from '../src/lib/frontend';

export default [
	{
		name: 'frontend',
		include: [
			'all',
			'frontend',
			'mapdesigner'
		],
		dev: {
			proxy: [{
				from: '/tiles/',
				to: 'https://tiles.versatiles.org/tiles/'
			}]
		}
	},
	{
		name: 'frontend-dev',
		include: [
			'all',
			'frontend-dev',
			'mapdesigner'
		],
		dev: {
			proxy: [{
				from: '/tiles/',
				to: 'https://tiles.versatiles.org/tiles/'
			}]
		}
	},
	{
		name: 'frontend-min',
		include: [
			'all',
			'frontend-min'
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
			'assets/lib/maplibre-gl-inspect/',
			'assets/lib/maplibre-gl/maplibre-gl-csp*',
			'assets/lib/maplibre-gl/maplibre-gl-dev*',
			'assets/styles/'
		],
		dev: {
			proxy: [{
				from: '/tiles/',
				to: 'https://tiles.versatiles.org/tiles/'
			}]
		}
	}
]
