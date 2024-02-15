import RandomColor from './random_color.js';
import { loadJSON } from './utils.js';

export default async function StyleMaker(mainOptions = {}) {
	const source_name = 'data_source';
	const randomColor = new RandomColor();
	const background_style = await loadJSON('/assets/background-style.json');
	const shortbread_style = await loadJSON('/assets/styles/colorful.json');
	const meta = await loadJSON(mainOptions.metaUrl);

	if (!background_style) throw Error('default background style not found');
	if (!shortbread_style) throw Error('default shortbread style not found');

	return makeStyle;

	function makeStyle(options = {}) {

		const style = {
			id: 'auto_generated',
			name: 'auto_generated',
			version: 8,
			sources: {},
			layers: []
		};

		if (options.addBackgroundMap) addVectorMap('versatiles-background', background_style);

		switch (mainOptions.format) {
			case 'pbf':
				addVectorMap(source_name, { sources: { [source_name]: meta } });
				break;
			case 'jpg': case 'jpeg': case 'png':
				options.disableInspectorMode = true;
				options.inspectorMode = false;
				addRasterMap(source_name, style);
				break;
			default:
				throw Error('Unknown format ' + mainOptions.format);
		}

		if (options.addBoundingBox) addBoundingBox(style);

		return style;


		function addBoundingBox(style) {
			let [x0, y0, x1, y1] = mainOptions.bbox;
			let coordinates = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
			style.sources._bounding_box = {
				type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates } }
			};
			style.layers.push({
				id: '_bounding_box', source: '_bounding_box', type: 'line',
				paint: { 'line-color': '#c00', 'line-opacity': 0.5, 'line-dasharray': [3, 3], 'line-width': 1 }
			});
		}

		function addVectorMap(source_name, new_style) {
			Object.entries(new_style.sources).forEach(([key, value]) => {
				style.sources[key] = value;
				value.scheme ??= 'xyz';
				value.tilejson ??= '3.0.0';
				value.tiles ??= [mainOptions.tiles_url];
				value.minzoom ??= mainOptions.zoom_min;
				value.maxzoom ??= mainOptions.zoom_max;
				value.type ??= 'vector';
				value.vector_layers ??= meta.vector_layers;
			})

			if (new_style.layers) {
				new_style.layers.forEach(new_layer => {
					new_layer = Object.assign({}, new_layer);
					new_layer.id = source_name + '_' + new_layer.id;
					style.layers.push(new_layer);
				})
				return;
			}

			options.disableInspectorMode ??= !is_shortbread();

			// we have to guess the layers
			if (is_shortbread() && !options.inspectorMode) {
				addShortbreadStyle()
			} else {
				options.inspectorMode ??= true;
				addInspectorStyle()
			}

			function addShortbreadStyle() {
				if (shortbread_style.glyphs) style.glyphs = shortbread_style.glyphs;
				if (shortbread_style.sprite) style.sprite = shortbread_style.sprite;
				shortbread_style.layers.forEach(layer => layer.source = source_name)
				style.layers = style.layers.concat(shortbread_style.layers);
			}

			function addInspectorStyle() {
				let new_layers = {
					//background: [{ 'id': 'background', 'type': 'background', 'paint': { 'background-color': '#fff' } }],
					circle: [], line: [], fill: []
				}

				meta.vector_layers.forEach(vector_layer => {
					let luminosity = 'bright', saturation, hue;

					if (/water|ocean|lake|sea|river/.test(vector_layer.id)) hue = 'blue';
					if (/state|country|place/.test(vector_layer.id)) hue = 'pink';
					if (/road|highway|transport|streets/.test(vector_layer.id)) hue = 'orange';
					if (/contour|building/.test(vector_layer.id)) hue = 'monochrome';
					if (/building/.test(vector_layer.id)) luminosity = 'dark';
					if (/contour|landuse/.test(vector_layer.id)) hue = 'yellow';
					if (/wood|forest|park|landcover|land/.test(vector_layer.id)) hue = 'green';

					if (/point/.test(vector_layer.id)) {
						saturation = 'strong';
						luminosity = 'light'
					}

					const color = randomColor({
						hue,
						luminosity,
						saturation,
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
					//new_layers.background,
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

		function addRasterMap(source_name, style) {
			style.sources[source_name] = {
				scheme: 'xyz',
				tiles: [mainOptions.tiles_url],
				minzoom: mainOptions.zoom_min,
				maxzoom: mainOptions.zoom_max,
				type: 'raster',
			};

			style.layers.push({
				id: source_name + '_raster',
				source: source_name,
				type: 'raster',
			});
		}
	}
}