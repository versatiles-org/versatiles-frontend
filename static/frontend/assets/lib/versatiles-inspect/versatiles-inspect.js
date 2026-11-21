/**
 * MapLibre GL Inspect, set up to follow the map's colour scheme (see docs/color-scheme.md):
 *
 * - The button opts in with the class `maplibregl-ctrl-scheme-aware`, and its icons are drawn in
 *   the control's text colour (versatiles-inspect.css).
 * - The popup gets the class `versatiles-inspect-popup`, by which it follows the scheme too.
 * - The inspect map is black on a dark style, in inspect's own colours with their lightness
 *   mirrored, and white as before on a light style.
 *
 * Load it after maplibre-gl-inspect.js, and use it in place of `new MaplibreInspect(options)`:
 *
 *   map.addControl(createVersaTilesInspect({ sources: { ... } }));
 */

function createVersaTilesInspect(options = {}) {
	let map;
	const isDark = () => map?.getContainer().dataset.colorScheme === 'dark';

	const inspect = new MaplibreInspect({
		...options,
		// The default popup of inspect, with a class to style it by.
		popup: new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'versatiles-inspect-popup' }),
		// Runs each time inspect is turned on or off, before it builds its map.
		toggleCallback(showInspectMap) {
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
		container.classList.add('maplibregl-ctrl-scheme-aware');
		return container;
	};

	return inspect;
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
