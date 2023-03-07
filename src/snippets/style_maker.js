
function make_style(tileSource, options) {
	/*
		options default values
			.grey: 0
			.invert: false
			.tint: 0
			.tintColor: '#fff'
			.labels : true
			.symbols: true
	*/

	let style = $STYLE;

	style.sprite = absoluteUrl(styleUrl, style.sprite);
	style.glyphs = absoluteUrl(styleUrl, style.glyphs);
	Object.values(style.sources).forEach(source => source.tiles = [absoluteUrl(tileSource)]);

	if (options) patchLayers(style.layers);

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
		if (options.grey) options.grey = Math.min(1, Math.max(0, grey));
		if (options.tint) options.tint = Math.min(1, Math.max(0, tint));
		if (options.tintColor) options.tintColor = parseColor(options.tintColor);

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
			if (layer.layout) {
				if (!labels) delete layer.layout['text-field'];
				if (!symbols) delete layer.layout['icon-image'];
			}
		})

		function fixColorValue(value) {
			if (typeof value === 'string') return repairColor(value);

			throw new Error('fixColorValue - unknown color type: ' + value);
		}

		function parseColor(text) {
			if (/^#[0-9a-f]{6}$/i.test(text)) {
				return [
					parseInt(text.slice(1, 3), 16),
					parseInt(text.slice(3, 5), 16),
					parseInt(text.slice(5, 7), 16)
				];
			}

			if (/^#[0-9a-f]{3}$/i.test(text)) {
				return [
					parseInt(text.slice(1, 2), 16) * 17,
					parseInt(text.slice(2, 3), 16) * 17,
					parseInt(text.slice(3, 4), 16) * 17
				]
			}

			throw new Error(text);
		}

		function repairColor(color) {
			let [r, g, b] = parseColor(color);

			if (options.grey) {
				let m = opt.grey * (r * 0.299 + g * 0.587 + b * 0.114);
				let f = 1 - opt.grey;
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

			if (options.tint) {
				r = r * (1 - options.tint) + options.tint * options.tintColor[0];
				g = g * (1 - options.tint) + options.tint * options.tintColor[1];
				b = b * (1 - options.tint) + options.tint * options.tintColor[2];
			}

			let result = '#' + [r, g, b].map(v => ('00' + Math.round(Math.min(255, Math.max(0, v))).toString(16)).slice(-2)).join('');
			
			return result;
		}
	}
}

