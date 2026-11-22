/**
 * MapLibre GL Inspect, set up for the styles of VersaTiles:
 *
 * - It inspects every source of the style the map shows when inspect is turned on, with all their
 *   layers (see `inspectSources`), so it follows the styler from one style to the next: land cover
 *   or none, satellite with the OSM overlay or without. Pass `sources` to inspect a fixed list
 *   instead, as with MaplibreInspect.
 * - It follows the map's colour scheme (see docs/color-scheme.md):
 *   - The button opts in with the class `maplibregl-ctrl-scheme-aware`, and its icons are drawn in
 *     the control's text colour (versatiles-inspect.css).
 *   - The popup gets the class `versatiles-inspect-popup`, by which it follows the scheme too.
 *   - The inspect map is black on a dark style, in inspect's own colours with their lightness
 *     mirrored, and white as before on a light style.
 *
 * Load it after maplibre-gl-inspect.js, and use it in place of `new MaplibreInspect(options)`:
 *
 *   map.addControl(createVersaTilesInspect());
 */

function createVersaTilesInspect(options = {}) {
	let map;
	const isDark = () => map?.getContainer().dataset.colorScheme === 'dark';
	const fixedSources = Object.keys(options.sources ?? {}).length > 0;

	const inspect = new MaplibreInspect({
		...options,
		// The default popup of inspect, with a class to style it by.
		popup: new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'versatiles-inspect-popup' }),
		// Runs each time inspect is turned on or off, before it builds its map: while it is turned on,
		// the map still shows its own style.
		toggleCallback(showInspectMap) {
			if (showInspectMap && !fixedSources) inspect.sources = inspectSources(map.getStyle());
			inspect.options.backgroundColor = isDark() ? '#000' : '#fff';
			options.toggleCallback?.(showInspectMap);
		},
	});

	// Inspect's colours are seeded by the layer name. On a dark map they keep their hue and
	// saturation, and their lightness is mirrored: a layer that stands out from white by being dark,
	// like the buildings, stands out from black by being light.
	const layerColor = inspect.assignLayerColor;
	inspect.assignLayerColor = (layerId, alpha) => {
		const color = layerColor(layerId, alpha);
		return isDark() ? mirrorLightness(color) : color;
	};

	const onAdd = inspect.onAdd.bind(inspect);
	inspect.onAdd = (newMap) => {
		map = newMap;
		const container = onAdd(newMap);
		// Without `sources`, inspect looks for them itself whenever a source loads. It finds only the
		// sources with the URL of a TileJSON, and the styler writes the TileJSON into the style. It
		// also applies the style again whenever what it found changes. The toggle above takes its place.
		if (!fixedSources) newMap.off('sourcedata', inspect._onSourceChange);
		container.classList.add('maplibregl-ctrl-scheme-aware');
		return container;
	};

	return inspect;
}

/**
 * The sources of a style for inspect, by their id, with the ids of their layers. A vector source has
 * the layers its TileJSON lists, if the style carries `vector_layers`, and those the style draws. A
 * GeoJSON source has none, so inspect draws it whole. A vector source without layers is left out: a
 * layer of a vector source needs a `source-layer`. Only sources of the style are listed, since
 * MapLibre rejects a style that has a layer of a source it lacks.
 */
function inspectSources(style) {
	const sources = new Map();
	for (const [id, source] of Object.entries(style.sources)) {
		if (source.type === 'vector') sources.set(id, new Set((source.vector_layers ?? []).map((layer) => layer.id)));
		else if (source.type === 'geojson') sources.set(id, new Set());
	}
	for (const layer of style.layers) {
		if (layer['source-layer']) sources.get(layer.source)?.add(layer['source-layer']);
	}
	const result = {};
	for (const [id, layers] of sources) {
		if (layers.size > 0 || style.sources[id].type === 'geojson') result[id] = [...layers];
	}
	return result;
}

/**
 * An `rgb()` or `rgba()` colour with the lightness of HSL mirrored (`l` becomes `1 - l`), with the
 * same hue and saturation. In RGB, that shifts every channel by `1 - max - min`. Any other notation
 * is returned as it is.
 */
function mirrorLightness(color) {
	const match = /^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(color);
	if (!match) return color;
	const channels = match.slice(1, 4).map((value) => Number(value) / 255);
	const shift = 1 - Math.max(...channels) - Math.min(...channels);
	const [r, g, b] = channels.map((value) => Math.round((value + shift) * 255));
	return `rgba(${r}, ${g}, ${b}, ${match[4] ?? 1})`;
}
