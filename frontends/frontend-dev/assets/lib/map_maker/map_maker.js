import MaplibreControl from './lib/maplibre_control.js';
import StyleMaker from './lib/style_maker.js';
import { loadJSON } from './lib/utils.js';

export default async function MapMaker(maplibregl, nodeId, url) {
	const meta = await loadJSON(url + '/tiles.json');
	const tiles_url = window.location.origin + info.url;
	const container = info.container;

	const options = {
		addBoundingBox: true,
		addBackgroundMap: false,
		disableDesignMaker: true,
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
		minZoom: 0,
		maxZoom: container.zoom_max + 0.4,
	});

	map.addControl(new MaplibreControl(
		{ options },
		options => map.setStyle(makeStyle(options))
	));

	addZoomLevelWarning(map, container.zoom_min, container.zoom_max);

	return map;
}

function addZoomLevelWarning(map, zoom_min, zoom_max) {
	let visible = false;

	const warning = document.createElement('div');
	map.getContainer().appendChild(warning);
	Object.assign(warning.style, {
		'position': 'absolute',
		'display': 'flex',
		'justify-content': 'center',
		'align-items': 'center',
		'color': '#fff',
		'background-color': '#800',
		'padding': '0.5rem',
		'font-size': '1.2em',
		'line-height': 1.2,
		'opacity': 0,
		'pointer-events': 'none',
		'transition': 'opacity 0.2s ease',
		'z-index': 99999,
	})

	update()
	map.on('zoom', update);

	function update() {
		let zoom = map.getZoom();
		let shouldBeVisible = (zoom < zoom_min) || (zoom > zoom_max + 0.5);

		if (shouldBeVisible) {
			let text = 'the data source is only defined for zoom level';
			if (zoom_min !== zoom_max) text += `s between ${zoom_min} and`
			text += ` ${zoom_max}. You are at zoom level ${zoom.toFixed(1)}.`
			warning.innerText = text;
		}

		if (visible === shouldBeVisible) return;
		visible = shouldBeVisible;
		warning.style.opacity = visible ? 100 : 0;
	}
}