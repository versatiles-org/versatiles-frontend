// MapMaker.ts
import { MaplibreControl } from './lib/maplibre_control';
import StyleMaker from './lib/style_maker';
import { loadJSON } from './lib/utils';
import type MaplibreGl from 'maplibre-gl';

/**
 * Creates a MapLibre map with certain controls and style. 
 * Adjust the parameter types (nodeId, url) as needed for your environment.
 *
 * @param maplibregl   The Maplibre-GL library
 * @param nodeId       The HTML container element ID for the map
 * @param url          Base URL to fetch tile metadata, e.g. '/somePath'
 * @returns            A Promise that resolves to the created MapLibre map instance
 */
export default async function MapMaker(
	maplibregl: typeof MaplibreGl,
	nodeId: string,
	url: string
): Promise<MaplibreGl.Map> {
	// 1. Load metadata
	const meta = await loadJSON(`${url}/tiles.json`);
	// Build a tile URL that replaces %7Bxyz%7D with {x} or {y} or {z}
	const tiles_url = new URL(meta.tiles, window.location.origin).href
		.replace(/%7B([xyz])%7D/gi, (match, group) => `{${group}}`);

	console.log({ tiles_url });
	console.log(meta);

	// 2. Define style options
	const options = {
		addBoundingBox: true,
		addBackgroundMap: false,
		disableDesignMaker: true,
	};

	// 3. Initialize the style maker
	const styleMaker = new StyleMaker({
		tiles_url: tiles_url + '{z}/{x}/{y}',
		zoom_min: meta.minzoom,
		zoom_max: meta.maxzoom,
		format: meta.format,
		bbox: meta.bounds,
	});

	// 4. Create the map
	const map = new maplibregl.Map({
		container: nodeId,
		style: await styleMaker.makeStyle(options),   // initial style
		bounds: meta.bounds,         // use meta.bounds for initial bounding
		hash: true,
		minZoom: 0,
		maxZoom: meta.maxzoom + 0.4, // or meta.zoom_max + 0.4
	});

	// 5. Add a custom control that updates the style
	map.addControl(
		new MaplibreControl(
			{ options },
			async updatedOptions => map.setStyle(await styleMaker.makeStyle(updatedOptions))
		)
	);

	// 6. Add zoom-level warning logic
	addZoomLevelWarning(map, meta.minzoom, meta.maxzoom);

	return map;
}

/**
 * Adds a small on-map warning UI whenever the map’s zoom is
 * outside the min or max data range.
 *
 * @param map       The MapLibre map
 * @param zoom_min  Minimum zoom for valid data
 * @param zoom_max  Maximum zoom for valid data
 */
function addZoomLevelWarning(
	map: MaplibreGl.Map,
	zoom_min: number,
	zoom_max: number
): void {
	let visible = false;

	// Create a small warning element
	const warning = document.createElement('div');
	map.getContainer().appendChild(warning);

	Object.assign(warning.style, {
		position: 'absolute',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		color: '#fff',
		backgroundColor: '#800',
		padding: '0.5rem',
		fontSize: '1.2em',
		lineHeight: 1.2,
		opacity: 0,
		pointerEvents: 'none',
		transition: 'opacity 0.2s ease',
		zIndex: 99999,
	});

	// Update on load + whenever the zoom changes
	update();
	map.on('zoom', update);

	function update(): void {
		const zoom = map.getZoom();
		const shouldBeVisible = (zoom < zoom_min) || (zoom > zoom_max + 0.5);

		if (shouldBeVisible) {
			let text = 'The data source is only defined for zoom level';
			if (zoom_min !== zoom_max) {
				text += `s between ${zoom_min} and`;
			}
			text += ` ${zoom_max}. You are at zoom level ${zoom.toFixed(1)}.`;
			warning.innerText = text;
		}

		if (visible === shouldBeVisible) return;
		visible = shouldBeVisible;
		warning.style.opacity = visible ? '1' : '0';
	}
}