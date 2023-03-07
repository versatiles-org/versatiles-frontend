
function getStyle(tileSource, opt) {
	if (!opt) opt = {};
	
	let style = $STYLE;

	style.sprite = absoluteUrl(styleUrl, style.sprite);
	style.glyphs = absoluteUrl(styleUrl, style.glyphs);
	style.sources.versatiles.tiles = [absoluteUrl(tileSource)];

	function absoluteUrl(...urls) {
		// use encodeURI/decodeURI to handle curly brackets in path templates
		let url = encodeURI(window.location.href);
		while (urls.length > 0) {
			url = (new URL(encodeURI(urls.shift()), url)).href;
		}
		return decodeURI(url);
	}

	return style;
}
