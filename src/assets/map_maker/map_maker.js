import MaplibreControl from './lib/maplibre_control.js';
import StyleMaker from './lib/style_maker.js';
import { loadJSON } from './lib/utils.js';

export default async function MapMaker(maplibregl, nodeId, meta_url) {
	const info = await loadJSON(meta_url);
	const tiles_url = window.location.origin + info.url;
	const container = info.container;

	const options = {
		addBoundingBox: true,
		addBackgroundMap: false,
		inspectorMode: false,
	}

	let makeStyle = await StyleMaker({
		tiles_url: tiles_url + '{z}/{x}/{y}',
		zoom_min: container.zoom_min,
		zoom_max: container.zoom_max,
		format: container.format,
		bbox: container.bbox,
		metaUrl: tiles_url + 'meta.json',
	})

	let map = new maplibregl.Map({
		container: nodeId,
		style: makeStyle(options),
		bounds: info.container.bbox,
		hash: true,
		minZoom: container.zoom_min - 0.4,
		maxZoom: container.zoom_max + 0.4,
	});

	map.addControl(new MaplibreControl(
		{ options },
		options => map.setStyle(makeStyle(options))
	));

	return map;
}
