import { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { Color3, Color4, hsvToRgb, parseColor, rgbToHsv } from './color';
import { absoluteUrl, deepClone } from './utils';

/**
 * Options for customizing the map style
 */
export interface DesignMakerOptions {
	grey: number;         // Range: [0..1]
	invert: boolean;
	hueRotate: number;    // Range: [0..1], fraction of 360 degrees
	fade: number;         // Range: [0..1]
	fadeColor: string;
	tint: number;         // Range: [0..1]
	tintColor: string;
	gamma: number;        // e.g. -1..+1 or some fraction
	hideLabels: boolean;
	hideSymbols: boolean;
	hideLayerIds?: string | RegExp | false; // If provided, can hide certain layer IDs
}

/**
 * Default options for style transformations
 */
const defaultDesignMakerOptions: DesignMakerOptions = {
	grey: 0,
	invert: false,
	hueRotate: 0,
	fade: 0,
	fadeColor: '#fff',
	tint: 0,
	tintColor: '#f00',
	gamma: 0,
	hideLabels: false,
	hideSymbols: false,
	hideLayerIds: false
};

/**
 * DesignMaker class transforms existing MapLibre/Mapbox style JSON
 * by applying color or layer modifications.
 */
export class DesignMaker {
	private readonly loadedStyles: Record<string, StyleSpecification> = {};

	/**
	 * Merges userOptions with defaults and transforms the style.
	 * @param styleName  The base style name (i.e. "colorful", "eclipse", etc.)
	 * @param tileSource The tile URL template (e.g. "/tiles/{z}/{x}/{y}")
	 * @param userOptions  Partial overrides for default styling
	 * @returns A Promise resolving to a style object that can be used by MapLibre
	 */
	public async getStyle(
		styleName: string,
		tileSource: string,
		userOptions: Partial<DesignMakerOptions> = {}
	): Promise<StyleSpecification> {
		const options: DesignMakerOptions = {
			...defaultDesignMakerOptions,
			...userOptions
		};

		const style = await this.loadStyle(styleName);
		return this.makeStyle(style, tileSource, options);
	}

	// --------------------------- Private methods ---------------------------

	/**
	 * Fetches and caches a style JSON from "/assets/styles/{styleName}.json".
	 * @param styleName  Name of the style file (without ".json")
	 */
	private async loadStyle(styleName: string): Promise<StyleSpecification> {
		if (!styleName) {
			throw new Error('loadStyle requires a style name');
		}

		if (this.loadedStyles[styleName]) {
			// Already loaded; return a deep clone
			return deepClone(this.loadedStyles[styleName]);
		}

		// Otherwise, fetch it fresh
		const response = await fetch(`/assets/styles/${styleName}.json`);
		if (!response.ok) {
			throw new Error(`Failed to load style '${styleName}': ${response.statusText}`);
		}
		const styleJson = await response.json();

		// Cache + deep clone
		this.loadedStyles[styleName] = styleJson;
		return deepClone(styleJson);
	}

	/**
	 * Given a style JSON, updates tile sources and patches layers based on options.
	 */
	private makeStyle(style: StyleSpecification, tileSource: string, options: DesignMakerOptions): StyleSpecification {
		if (typeof style !== 'object') {
			throw new Error('style must be an object');
		}
		if (typeof tileSource !== 'string') {
			throw new Error('tileSource must be a string');
		}

		// Convert relative sprite/glyph paths to absolute
		if (style.sprite) {
			if (typeof style.sprite === 'string') {
				style.sprite = absoluteUrl(style.sprite);
			} else if (Array.isArray(style.sprite)) {
				style.sprite.forEach(s => s.url = absoluteUrl(s.url));
			}
		}
		if (style.glyphs) {
			style.glyphs = absoluteUrl(style.glyphs);
		}

		// Replace each source URL with tileSource
		if (style.sources) {
			Object.values(style.sources).forEach(src => {
				if (src.type === 'vector' || src.type === 'raster') {
					src.tiles = [absoluteUrl(tileSource)];
				}
			});
		}

		// Patch layers (apply color adjustments, hide layers, etc.)
		this.patchLayers(style, options);
		return style;
	}

	/**
	 * Applies color corrections and other transformations to style.layers
	 */
	private patchLayers(style: StyleSpecification, options: DesignMakerOptions): void {
		// Clamp certain numeric fields to [0..1] or otherwise as needed
		options.grey = Math.min(1, Math.max(0, options.grey));
		options.fade = Math.min(1, Math.max(0, options.fade));
		options.tint = Math.min(1, Math.max(0, options.tint));

		// If hideLayerIds is provided, try to create a RegExp
		if (options.hideLayerIds && typeof options.hideLayerIds === 'string') {
			try {
				options.hideLayerIds = new RegExp(options.hideLayerIds);
			} catch {
				options.hideLayerIds = false;
			}
		}

		// Convert fadeColor and tintColor into RGBA arrays
		const fadeColorArr = parseColor(options.fadeColor);
		const tintColorArr = parseColor(options.tintColor);

		const paintColorKeys = new Set<string>([
			'background-color',
			'circle-color',
			'circle-stroke-color',
			'fill-color',
			'fill-extrusion-color',
			'fill-outline-color',
			'heatmap-color',
			'hillshade-accent-color',
			'hillshade-highlight-color',
			'hillshade-shadow-color',
			'icon-color',
			'icon-halo-color',
			'line-color',
			'line-gradient',
			'text-color',
			'text-halo-color'
		]);

		style.layers = style.layers.filter((layer: LayerSpecification) => {
			// Remove text or icon for labels/symbols if requested
			if (layer.layout) {
				if (options.hideLabels && 'text-field' in layer.layout) {
					delete layer.layout['text-field'];
				}
				if (options.hideSymbols && 'icon-image' in layer.layout) {
					delete layer.layout['icon-image'];
				}

				// Filter out layers whose IDs match hideLayerIds
				if (options.hideLayerIds instanceof RegExp && options.hideLayerIds.test(layer.id)) {
					return false;
				}

				// Adjust paint color fields
				if (layer.paint != null) {
					const paint = (layer.paint as Record<string, any>);
					for (const key in paint) {
						if (!paintColorKeys.has(key)) continue;
						paint[key] = fixColorValue(paint[key], options, fadeColorArr, tintColorArr);
					}
				}
				return true;
			};
		});
	}
}


/**
 * Confirms the given value is a color string, then repairs it via `repairColor`.
 * If the style includes other color expressions (e.g. arrays), you may need a more advanced parser.
 */
export function fixColorValue(
	value: string,
	options: DesignMakerOptions,
	fadeColorArr: Color3 | Color4,
	tintColorArr: Color3 | Color4
): string {
	if (typeof value !== 'string') {
		throw new Error(`fixColorValue - unknown color type: ${value}`);
	}
	return repairColor(value, options, fadeColorArr, tintColorArr);
}



/**
 * Takes a color string (#rgb, #rrggbb, rgba, etc.) and applies
 * grey, invert, fade, tint, hue-rotate, gamma adjustments.
 */
export function repairColor(
	colorStr: string,
	options: DesignMakerOptions,
	fadeColorArr: Color3 | Color4,
	tintColorArr: Color3 | Color4
): string {
	let [r, g, b, a] = parseColor(colorStr);

	// 1. Grey
	if (options.grey > 0) {
		const greyVal = r * 0.299 + g * 0.587 + b * 0.114;
		const m = options.grey * greyVal;
		const f = 1 - options.grey;
		r = r * f + m;
		g = g * f + m;
		b = b * f + m;
	}

	// 2. Invert
	if (options.invert) {
		r = 255 - r;
		g = 255 - g;
		b = 255 - b;
	}

	// 3. Gamma
	if (options.gamma !== 0) {
		// Interpret gamma as 2^(options.gamma)
		const gammaPow = Math.pow(2, options.gamma);
		r = 255 * Math.pow(r / 255, gammaPow);
		g = 255 * Math.pow(g / 255, gammaPow);
		b = 255 * Math.pow(b / 255, gammaPow);
	}

	// 4. Fade
	if (options.fade > 0) {
		r = r * (1 - options.fade) + fadeColorArr[0] * options.fade;
		g = g * (1 - options.fade) + fadeColorArr[1] * options.fade;
		b = b * (1 - options.fade) + fadeColorArr[2] * options.fade;
	}

	// 5. Tint
	if (options.tint > 0) {
		// Convert both to HSV, combine, then back to RGB
		const baseHsv = rgbToHsv([r, g, b]);
		const tintHsv = rgbToHsv(tintColorArr);
		// Mix saturations but keep base value
		const newRgb = hsvToRgb([
			tintHsv[0], // new hue
			(tintHsv[1] * baseHsv[1]) / 100, // partially mix saturation
			baseHsv[2] // keep base brightness
		]);

		r = r * (1 - options.tint) + newRgb[0] * options.tint;
		g = g * (1 - options.tint) + newRgb[1] * options.tint;
		b = b * (1 - options.tint) + newRgb[2] * options.tint;
	}

	// 6. Hue-rotate
	if (options.hueRotate !== 0) {
		const baseHsv = rgbToHsv([r, g, b]);
		// hueRotate is fraction of 360
		baseHsv[0] += 360 * options.hueRotate;
		while (baseHsv[0] >= 360) {
			baseHsv[0] -= 360;
		}
		const newRgb = hsvToRgb(baseHsv);
		[r, g, b] = newRgb;
	}

	// Clamp final values
	[r, g, b] = [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))));

	// Return as #rrggbb or rgba(...)
	if (a === 1) {
		return `#${[r, g, b]
			.map((val) => ('00' + val.toString(16)).slice(-2))
			.join('')}`;
	} else {
		return `rgba(${r},${g},${b},${a.toFixed(3)})`;
	}
}
