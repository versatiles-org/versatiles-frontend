
async function getStyle(styleUrl, tilesPathTemplate) {
	let baseUrl = window.location.href
	let style = await (await fetch(styleUrl)).json();

	style.sprite = absoluteUrl(styleUrl, style.sprite);
	style.glyphs = absoluteUrl(styleUrl, style.glyphs);
	style.sources.versatiles.tiles = [absoluteUrl(tilesPathTemplate)];

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
