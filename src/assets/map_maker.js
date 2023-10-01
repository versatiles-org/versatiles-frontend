async function make_map(meta_url) {
	const info = await loadJSON(meta_url);


	const tiles_url = window.location.origin + info.url;
	const container = info.container;

	const style = {
		id: 'auto_generated',
		name: 'auto_generated',
		version: 8,
		sources: {},
		layers: []
	};

	switch (container.format) {
		case 'pbf': await initVectorMap(); break;
		default:
			throw Error('Unknown format ' + container.format);
	}

	addBoundingBox();

	let map = new maplibregl.Map({
		container: 'map',
		style,
		bounds: info.container.bbox,
		hash: true,
		maxZoom: 18,
		minZoom: 0,
	});

	return map;

	function addBoundingBox() {
		let [x0, y0, x1, y1] = container.bbox;
		let coordinates = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
		style.sources._bounding_box = {
			type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates } }
		};
		style.layers.push({
			id: '_bounding_box', source: '_bounding_box', type: 'line',
			paint: { 'line-color': '#000', 'line-opacity': 0.5, 'line-dasharray': [3, 3], 'line-width': 1 }
		});
	}

	async function initVectorMap() {
		const source_name = 'data_source';
		const meta = await loadJSON(tiles_url + 'meta.json');
		style.sources[source_name] = {
			tilejson: '3.0.0',
			scheme: 'xyz',
			type: 'vector',
			tiles: [tiles_url + '{z}/{x}/{y}'],
			vector_layers: meta.vector_layers,
		};
		
		if (is_shortbread()) {
			await addShortbreadStyle()
		} else {
			await addInspectorStyle()
		}

		async function addShortbreadStyle() {
			let my_style = await loadJSON('/assets/styles/colorful.json');
			if (my_style.glyphs) style.glyphs = my_style.glyphs;
			if (my_style.sprite) style.sprite = my_style.sprite;
			my_style.layers.forEach(layer => layer.source = source_name)
			style.layers = style.layers.concat(my_style.layers);
		}

		async function addInspectorStyle() {
			let new_layers = {
				background: [{ 'id': 'background', 'type': 'background', 'paint': { 'background-color': '#fff' } }],
				circle: [], line: [], fill: []
			}

			meta.vector_layers.forEach(vector_layer => {
				let luminosity = 'bright';
				let hue = null;

				if (/water|ocean|lake|sea|river/.test(vector_layer.id)) hue = 'blue';
				if (/state|country|place/.test(vector_layer.id)) hue = 'pink';
				if (/road|highway|transport|streets/.test(vector_layer.id)) hue = 'orange';
				if (/contour|building|point/.test(vector_layer.id)) hue = 'monochrome';
				if (/building|point/.test(vector_layer.id)) luminosity = 'dark';
				if (/contour|landuse/.test(vector_layer.id)) hue = 'yellow';
				if (/wood|forest|park|landcover|land/.test(vector_layer.id)) hue = 'green';

				const color = randomColor({
					luminosity,
					hue,
					seed: vector_layer.id,
					format: 'hsla',
					opacity: 0.6
				});

				addLayer('Point', 'circle', { paint: { 'circle-color': color, 'circle-radius': 2 } });
				addLayer('LineString', 'line', { layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color } });
				addLayer('Polygon', 'fill', { paint: { 'fill-color': color, 'fill-opacity': 0.3, 'fill-antialias': true, 'fill-outline-color': color } });

				function addLayer(geoType, layerType, style) {
					new_layers[layerType].push(Object.assign(style, {
						id: `${source_name}-${vector_layer.id}-${layerType}`,
						'source-layer': vector_layer.id,
						source: source_name,
						type: layerType,
						filter: ['==', '$type', geoType]
					}))
				}
			})
			style.layers = style.layers.concat(
				new_layers.background,
				new_layers.fill,
				new_layers.line,
				new_layers.circle,
			);
		}

		function is_shortbread() {
			if (!Array.isArray(meta.vector_layers)) throw Error();

			let known_ids = ['place_labels', 'boundaries', 'boundary_labels', 'addresses', 'water_lines', 'water_lines_labels', 'dam_lines', 'dam_polygons', 'pier_lines', 'pier_polygons', 'bridges', 'street_polygons', 'streets_polygons_labels', 'ferries', 'streets', 'street_labels', 'street_labels_points', 'aerialways', 'public_transport', 'buildings', 'water_polygons', 'ocean', 'water_polygons_labels', 'land', 'sites', 'pois'];
			let id_set = new Set(known_ids);
			let count = meta.vector_layers.filter(l => id_set.has(l.id)).length;
			return (count > known_ids.length / 2)
		}
	}

	async function loadJSON(url) {
		return await (await fetch(url)).json();
	}
}
