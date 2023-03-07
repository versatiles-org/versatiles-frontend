
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
