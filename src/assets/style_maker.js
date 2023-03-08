
/*
	options default values
		.grey: 0
		.invert: false
		.fade: 0
		.fadeColor: '#fff'
		.tint: 0
		.tintColor: '#f00'
		.hideLabels: false
		.hideSymbols: false
*/

async function loadStyle(styleName, tileSource, options) {
	if (!styleName) throw Error('loadStyle needs a style name');

	let style = await (await fetch('/assets/styles/' + styleName + '/style.min.json')).json();
	return makeStyle(style, tileSource, options)
}

function makeStyle(style, tileSource, options) {
	if (typeof style !== 'object') throw Error('style must be an object');
	if (typeof tileSource !== 'string') throw Error('tile source must be a string');

	if (style.sprites) style.sprites = absoluteUrl(style.sprites);
	if (style.glyphs) style.glyphs = absoluteUrl(style.glyphs);
	Object.values(style.sources).forEach(source => source.tiles = [absoluteUrl(tileSource)]);

	if (options) patchLayers(style.layers, options);

	function absoluteUrl(...urls) {
		// use encodeURI/decodeURI to handle curly brackets in path templates
		let url = encodeURI(window.location.href);
		while (urls.length > 0) {
			url = (new URL(encodeURI(urls.shift()), url)).href;
		}
		return decodeURI(url);
	}

	return style;

	function patchLayers(layers, options) {
		if (options.grey) options.grey = Math.min(1, Math.max(0, options.grey));
		if (options.fade) options.fade = Math.min(1, Math.max(0, options.fade));
		if (options.tint) options.tint = Math.min(1, Math.max(0, options.tint));

		options.fadeColor = parseColor(options.fadeColor || '#fff');
		options.tintColor = parseColor(options.tintColor || '#f00');

		const paintColorKeys = [
			'background-color',
			'circle-color',
			'circle-stroke-color',
			'fill-color',
			'fill-extrusion-color',
			'fill-outline-color',
			'heatmap-color',
			'hillshade-accent-color',
			'hillshade-highlight-color',
			'hillshade-shadow-color',
			'icon-color',
			'icon-halo-color',
			'line-color',
			'line-gradient',
			'sky-atmosphere-color',
			'sky-atmosphere-halo-color',
			'sky-gradient',
			'text-color',
			'text-halo-color',
		]

		layers.forEach(layer => {
			paintColorKeys.forEach(key => {
				if (layer.paint[key]) layer.paint[key] = fixColorValue(layer.paint[key]);
			})
			if (layer.layout) {
				if (options.hideLabels) delete layer.layout['text-field'];
				if (options.hideSymbols) delete layer.layout['icon-image'];
			}
		})

		function fixColorValue(value) {
			if (typeof value === 'string') return repairColor(value);

			throw new Error('fixColorValue - unknown color type: ' + value);
		}

		function parseColor(text) {
			text = text.replace(/\s+/g, '').toLowerCase();
			let match;

			if (match = text.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)) {
				return [
					parseInt(match[1], 16),
					parseInt(match[2], 16),
					parseInt(match[3], 16),
					1
				]
			}

			if (match = text.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)) {
				return [
					parseInt(match[1], 16) * 17,
					parseInt(match[2], 16) * 17,
					parseInt(match[3], 16) * 17,
					1
				]
			}

			if (match = text.match(/^rgba\(([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)\)$/)) {
				return [
					parseFloat(match[1]),
					parseFloat(match[2]),
					parseFloat(match[3]),
					parseFloat(match[4])
				]
			}

			throw new Error(text);
		}

		function repairColor(color) {
			let [r, g, b, a] = parseColor(color);

			if (options.grey) {
				let m = options.grey * (r * 0.299 + g * 0.587 + b * 0.114);
				let f = 1 - options.grey;
				r = r * f + m;
				g = g * f + m;
				b = b * f + m;
			}

			if (options.invert) {
				let m = 255 - Math.max(r, g, b) - Math.min(r, g, b);
				r += m;
				g += m;
				b += m;
			}

			if (options.fade) {
				r = r * (1 - options.fade) + options.fade * options.fadeColor[0];
				g = g * (1 - options.fade) + options.fade * options.fadeColor[1];
				b = b * (1 - options.fade) + options.fade * options.fadeColor[2];
			}

			if (options.tint) {
				let c = rgbToHsv(r, g, b);
				let t = rgbToHsv(options.tintColor);
				c[0] = t[0];
				c[1] *= t[1] / 100;
				c = hsvToRgb(c);
				r = c[0];
				g = c[1];
				b = c[2];
			}

			color = [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))));

			if (a === 1) {
				return '#' + color.map(v => ('00' + Math.round(v).toString(16)).slice(-2)).join('');
			} else {
				return 'rgba(' + color.join(',') + ',' + a.toFixed(3) + ')';
			}
		}

		function rgbToHsv(r, g, b) {
			const max = Math.max(r, g, b);
			const delta = max - Math.min(r, g, b);

			const hh = delta
				? max === r
					? (g - b) / delta
					: max === g
						? 2 + (b - r) / delta
						: 4 + (r - g) / delta
				: 0;

			return [
				60 * (hh < 0 ? hh + 6 : hh),
				max ? (delta / max) * 100 : 0,
				(max / 255) * 100
			]
		}

		function hsvToRgb(h, s, v) {
			h = (h / 360) * 6;
			s = s / 100;
			v = v / 100;

			const hh = Math.floor(h),
				b = v * (1 - s),
				c = v * (1 - (h - hh) * s),
				d = v * (1 - (1 - h + hh) * s),
				module = hh % 6;

			return [
				[v, c, b, b, d, v][module] * 255,
				[d, v, v, c, b, b][module] * 255,
				[b, b, d, v, v, c][module] * 255
			]
		}
	}
}






async function styleMaker(styleUrl, tilesPathTemplate, options) {
	let baseUrl = window.location.href
	let style = await (await fetch(styleUrl)).json();

	style.sprite = absoluteUrl(styleUrl, style.sprite);
	style.glyphs = absoluteUrl(styleUrl, style.glyphs);
	style.sources.versatiles.tiles = [absoluteUrl(tilesPathTemplate)];

	if (options) {
		patchLayers(style.layers);
	}

	function absoluteUrl(...urls) {
		// use encodeURI/decodeURI to handle curly brackets in path templates
		let url = encodeURI(baseUrl);
		while (urls.length > 0) {
			url = (new URL(encodeURI(urls.shift()), url)).href;
		}
		return decodeURI(url);
	}

	return style;
}


function patchLayers(layers, options = { grey: 0, pale: 0, invert: false }) {
	let paintColorKeys = [
		'background-color',
		'circle-color',
		'circle-stroke-color',
		'fill-color',
		'fill-extrusion-color',
		'fill-outline-color',
		'heatmap-color',
		'hillshade-accent-color',
		'hillshade-highlight-color',
		'hillshade-shadow-color',
		'icon-color',
		'icon-halo-color',
		'line-color',
		'line-gradient',
		'sky-atmosphere-color',
		'sky-atmosphere-halo-color',
		'sky-gradient',
		'text-color',
		'text-halo-color',
	]

	layers.forEach(layer => {
		paintColorKeys.forEach(key => {
			if (layer.paint[key]) layer.paint[key] = fixColorValue(layer.paint[key]);
		})
	})

	function fixColorValue(value) {
		if (typeof value === 'string') return repairColor(value);
		console.log('fixColorValue', value);
		throw new Error(value);
	}

	function repairColor(color) {
		let r, g, b;

		if (/^#[0-9a-f]{6}$/i.test(color)) {
			r = parseInt(color.slice(1, 3), 16);
			g = parseInt(color.slice(3, 5), 16);
			b = parseInt(color.slice(5, 7), 16);
		} else {
			throw new Error(color);
		}

		if (options.grey) {
			let m = opt.grey * (r * 0.299 + g * 0.587 + b * 0.114);
			let f = 1 - opt.grey;
			r = r * f + m;
			g = g * f + m;
			b = b * f + m;
		}

		if (options.pale) {
			r = 255 - (255 - r) * (1 - options.pale);
			g = 255 - (255 - g) * (1 - options.pale);
			b = 255 - (255 - b) * (1 - options.pale);
		}

		if (options.invert) {
			let m = 255 - Math.max(r, g, b) - Math.min(r, g, b);
			r += m;
			g += m;
			b += m;
		}

		let result = '#' + [r, g, b].map(v => ('00' + Math.round(v).toString(16)).slice(-2)).join('');
		//console.log(color, r, g, b, result);
		return result;
	}
}
