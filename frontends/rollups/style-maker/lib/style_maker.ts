// StyleMaker.ts
import RandomColor from './random_color';
import { loadJSON } from './utils';

/** 
 * Define an interface for the main options you expect in 'mainOptions'.
 * Adjust fields and types based on your actual data.
 */
export interface MainOptions {
	metaUrl?: string;
	format?: 'pbf' | 'jpg' | 'jpeg' | 'png' | string;
	bbox?: [number, number, number, number];
	tiles_url?: string;
	zoom_min?: number;
	zoom_max?: number;
	// ...other fields as needed
}

/** Options you might pass into makeStyle(...) */
export interface StyleOptions {
	addBackgroundMap?: boolean;
	addBoundingBox?: boolean;
	disableInspectorMode?: boolean;
	inspectorMode?: boolean;
	// ...other style flags as needed
}

/**
 * Example usage:
 *   const styleMaker = new StyleMaker({ metaUrl: '/meta.json', format: 'pbf', ... });
 *   await styleMaker.init();
 *   const style = styleMaker.makeStyle({ addBoundingBox: true, addBackgroundMap: false, ... });
 */
export default class StyleMaker {
	private readonly randomColor: RandomColor;
	private shortbreadStyle: any;   // from '/assets/styles/colorful/style.json'
	private meta: any;              // from mainOptions.metaUrl

	/**
	 * You can store or type `mainOptions` however you like (here: partial).
	 */
	constructor(private mainOptions: Partial<MainOptions> = {}) {
		this.randomColor = new RandomColor();
	}

	/**
	 * Loads the shortbread style and the meta JSON. 
	 * Call this once before using `makeStyle()`.
	 */
	private async init(): Promise<void> {
		// Load default shortbread style. Adjust path if needed.
		this.shortbreadStyle = await loadJSON('/assets/styles/colorful/style.json');
		// Load meta from user-specified URL
		if (!this.mainOptions.metaUrl) {
			throw new Error('mainOptions.metaUrl is required but not provided.');
		}
		this.meta = await loadJSON(this.mainOptions.metaUrl);

		// If you also had a background_style somewhere, you would load it here.
		// e.g. const backgroundStyle = await loadJSON('/path/to/background.json');
		// if (!backgroundStyle) throw Error('default background style not found');

		if (!this.shortbreadStyle) {
			throw new Error('default shortbread style not found');
		}
	}

	/**
	 * Creates and returns the style object based on format, bounding box, etc.
	 * @param options - Additional style options such as addBoundingBox, addBackgroundMap, etc.
	 */
	public makeStyle(options: StyleOptions = {}): any {
		const sourceName = 'data_source';

		// Base style skeleton
		const style: any = {
			id: 'auto_generated',
			name: 'auto_generated',
			version: 8,
			sources: {},
			layers: []
		};

		// If user requests background map, e.g. a separate vector source
		if (options.addBackgroundMap) {
			this.addVectorMap('versatiles-background', {}, style, options);
		}

		// Decide how to add the main data source
		const fmt = this.mainOptions.format;
		if (!fmt) {
			throw new Error('mainOptions.format not specified.');
		}
		switch (fmt) {
			case 'pbf':
				// Pretend "meta" acts like a partial style with sources
				this.addVectorMap(sourceName, { sources: { [sourceName]: this.meta } }, style, options);
				break;
			case 'jpg':
			case 'jpeg':
			case 'png':
				// Raster implies inspector is disabled
				options.disableInspectorMode = true;
				options.inspectorMode = false;
				this.addRasterMap(sourceName, style);
				break;
			default:
				throw new Error('Unknown format ' + fmt);
		}

		if (options.addBoundingBox) {
			this.addBoundingBox(style);
		}

		return style;
	}

	// --------------------------------------
	//       Private helper methods
	// --------------------------------------

	/**
	 * Draws bounding box lines onto the style.
	 */
	private addBoundingBox(style: any): void {
		if (!Array.isArray(this.mainOptions.bbox) || this.mainOptions.bbox.length < 4) {
			throw new Error('mainOptions.bbox must be a [x0, y0, x1, y1] array.');
		}
		const [x0, y0, x1, y1] = this.mainOptions.bbox;
		const coordinates = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
		style.sources._bounding_box = {
			type: 'geojson',
			data: {
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates
				}
			}
		};
		style.layers.push({
			id: '_bounding_box',
			source: '_bounding_box',
			type: 'line',
			paint: {
				'line-color': '#c00',
				'line-opacity': 0.5,
				'line-dasharray': [3, 3],
				'line-width': 1
			}
		});
	}

	/**
	 * Adds a vector source and associated layers to the style.
	 * If new_style has its own layers, copies them directly.
	 * Otherwise, attempts a "shortbread" or "inspector" style generation.
	 */
	private addVectorMap(
		sourceName: string,
		newStyle: any,
		style: any,
		options: StyleOptions
	): void {
		// Merge the newStyle sources into style.sources
		if (newStyle.sources) {
			for (let [key, value] of Object.entries(newStyle.sources)) {
				if (typeof value !== 'object' || value === null) value = {};
				const sourceValue = value as { [key: string]: any };

				style.sources[key] = sourceValue;
				sourceValue.scheme ??= 'xyz';
				sourceValue.tilejson ??= '3.0.0';
				sourceValue.tiles ??= [this.mainOptions.tiles_url];
				sourceValue.minzoom ??= this.mainOptions.zoom_min;
				sourceValue.maxzoom ??= this.mainOptions.zoom_max;
				sourceValue.type ??= 'vector';
				sourceValue.vector_layers ??= this.meta.vector_layers;
			}
		}

		// If new_style includes its own layers, simply clone & add them
		if (newStyle.layers) {
			for (const lyr of newStyle.layers) {
				// Shallow copy
				const newLayer = Object.assign({}, lyr);
				// Prefix layer ID to avoid conflicts
				newLayer.id = sourceName + '_' + newLayer.id;
				style.layers.push(newLayer);
			}
			return;
		}

		// If no layers in newStyle, guess them
		// Possibly disable inspector if we detect "shortbread" format
		options.disableInspectorMode ??= !this.isShortbread();
		if (this.isShortbread() && !options.inspectorMode) {
			this.addShortbreadStyle(sourceName, style);
		} else {
			options.inspectorMode ??= true;
			this.addInspectorStyle(sourceName, style);
		}
	}

	/**
	 * Adds a raster source + single raster layer for images (jpg/png).
	 */
	private addRasterMap(sourceName: string, style: any): void {
		style.sources[sourceName] = {
			scheme: 'xyz',
			tiles: [this.mainOptions.tiles_url],
			minzoom: this.mainOptions.zoom_min,
			maxzoom: this.mainOptions.zoom_max,
			type: 'raster'
		};

		style.layers.push({
			id: sourceName + '_raster',
			source: sourceName,
			type: 'raster'
		});
	}

	/**
	 * If the style is "shortbread," copy glyphs, sprite, and layers from shortbreadStyle.
	 */
	private addShortbreadStyle(sourceName: string, style: any): void {
		if (this.shortbreadStyle.glyphs) {
			style.glyphs = this.shortbreadStyle.glyphs;
		}
		if (this.shortbreadStyle.sprite) {
			style.sprite = this.shortbreadStyle.sprite;
		}
		// Rewire shortbread layers to use the new source name
		this.shortbreadStyle.layers.forEach((layer: any) => {
			layer.source = sourceName;
		});
		style.layers = style.layers.concat(this.shortbreadStyle.layers);
	}

	/**
	 * Builds a simple "inspector" style that draws circles, lines, and fills
	 * for each vector layer in `this.meta.vector_layers`.
	 */
	private addInspectorStyle(sourceName: string, style: any): void {
		// You could also add a background layer here if you want
		const newLayers = {
			circle: [] as any[],
			line: [] as any[],
			fill: [] as any[]
		};

		for (const vectorLayer of this.meta.vector_layers) {
			let luminosity: string = 'bright';
			let saturation: string | undefined;
			let hue: string | undefined;

			// Some heuristic coloring based on layer IDs
			if (/water|ocean|lake|sea|river/.test(vectorLayer.id)) hue = 'blue';
			if (/state|country|place/.test(vectorLayer.id)) hue = 'pink';
			if (/road|highway|transport|streets/.test(vectorLayer.id)) hue = 'orange';
			if (/contour|building/.test(vectorLayer.id)) hue = 'monochrome';
			if (/building/.test(vectorLayer.id)) luminosity = 'dark';
			if (/contour|landuse/.test(vectorLayer.id)) hue = 'yellow';
			if (/wood|forest|park|landcover|land/.test(vectorLayer.id)) hue = 'green';
			if (/point/.test(vectorLayer.id)) {
				saturation = 'strong';
				luminosity = 'light';
			}

			// Randomly generate an HSLA color for this layer
			const color = this.randomColor.randomColor({
				hue,
				luminosity,
				saturation,
				seed: vectorLayer.id,
				opacity: 0.6
			});

			// Add "Point" layer
			this.addInspectorSubLayer(
				'Point',
				'circle',
				{
					paint: { 'circle-color': color, 'circle-radius': 2 }
				},
				sourceName,
				vectorLayer.id,
				newLayers.circle
			);
			// Add "LineString" layer
			this.addInspectorSubLayer(
				'LineString',
				'line',
				{
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: { 'line-color': color }
				},
				sourceName,
				vectorLayer.id,
				newLayers.line
			);
			// Add "Polygon" layer
			this.addInspectorSubLayer(
				'Polygon',
				'fill',
				{
					paint: {
						'fill-color': color,
						'fill-opacity': 0.3,
						'fill-antialias': true,
						'fill-outline-color': color
					}
				},
				sourceName,
				vectorLayer.id,
				newLayers.fill
			);
		}

		style.layers = style.layers.concat(
			newLayers.fill,
			newLayers.line,
			newLayers.circle
		);
	}

	/**
	 * Helper for addInspectorStyle
	 */
	private addInspectorSubLayer(
		geoType: string,
		layerType: string,
		baseStyle: any,
		sourceName: string,
		layerId: string,
		bucket: any[]
	): void {
		bucket.push(
			Object.assign(baseStyle, {
				id: `${sourceName}-${layerId}-${layerType}`,
				'source-layer': layerId,
				source: sourceName,
				type: layerType,
				filter: ['==', '$type', geoType]
			})
		);
	}

	/**
	 * Heuristic check: if the current `meta.vector_layers` mostly matches
	 * known shortbread layer IDs, we consider it "shortbread."
	 */
	private isShortbread(): boolean {
		if (!Array.isArray(this.meta.vector_layers)) {
			throw new Error('Expected meta.vector_layers to be an array');
		}
		const knownIds = [
			'place_labels', 'boundaries', 'boundary_labels', 'addresses', 'water_lines',
			'water_lines_labels', 'dam_lines', 'dam_polygons', 'pier_lines', 'pier_polygons',
			'bridges', 'street_polygons', 'streets_polygons_labels', 'ferries', 'streets',
			'street_labels', 'street_labels_points', 'aerialways', 'public_transport',
			'buildings', 'water_polygons', 'ocean', 'water_polygons_labels', 'land',
			'sites', 'pois'
		];
		const idSet = new Set(knownIds);
		const count = this.meta.vector_layers.filter((l: any) => idSet.has(l.id)).length;
		return count > knownIds.length / 2; // e.g., if more than half match
	}
}