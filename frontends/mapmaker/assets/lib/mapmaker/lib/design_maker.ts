// DesignMaker.ts

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
	private readonly loadedStyles: Record<string, any> = {};

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
	): Promise<any> {
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
	private async loadStyle(styleName: string): Promise<any> {
		if (!styleName) {
			throw new Error('loadStyle requires a style name');
		}

		if (this.loadedStyles[styleName]) {
			// Already loaded; return a deep clone
			return this.deepClone(this.loadedStyles[styleName]);
		}

		// Otherwise, fetch it fresh
		const response = await fetch(`/assets/styles/${styleName}.json`);
		if (!response.ok) {
			throw new Error(`Failed to load style '${styleName}': ${response.statusText}`);
		}
		const styleJson = await response.json();

		// Cache + deep clone
		this.loadedStyles[styleName] = styleJson;
		return this.deepClone(styleJson);
	}

	/**
	 * Given a style JSON, updates tile sources and patches layers based on options.
	 */
	private makeStyle(style: any, tileSource: string, options: DesignMakerOptions): any {
		if (typeof style !== 'object') {
			throw new Error('style must be an object');
		}
		if (typeof tileSource !== 'string') {
			throw new Error('tileSource must be a string');
		}

		// Convert relative sprite/glyph paths to absolute
		if (style.sprites) {
			style.sprites = this.absoluteUrl(style.sprites);
		}
		if (style.glyphs) {
			style.glyphs = this.absoluteUrl(style.glyphs);
		}

		// Replace each source URL with tileSource
		if (style.sources) {
			Object.values(style.sources).forEach((src: any) => {
				src.tiles = [this.absoluteUrl(tileSource)];
			});
		}

		// Patch layers (apply color adjustments, hide layers, etc.)
		this.patchLayers(style, options);
		return style;
	}

	/**
	 * Deeply clones an object or array, preserving nested structures.
	 */
	private deepClone<T>(obj: T): T {
		if (typeof obj !== 'object' || obj === null) {
			return obj; // primitive
		}
		if (Array.isArray(obj)) {
			return obj.map((item) => this.deepClone(item)) as unknown as T;
		}
		const clone: Record<string, any> = {};
		for (const [key, val] of Object.entries(obj)) {
			clone[key] = this.deepClone(val);
		}
		return clone as T;
	}

	/**
	 * Ensures a URL string is resolved as an absolute URL.
	 * Accepts multiple arguments to apply sequentially:
	 *   absoluteUrl("http://example.com", "foo/bar.json")
	 */
	private absoluteUrl(...urls: string[]): string {
		let url = encodeURI(window.location.href);
		while (urls.length > 0) {
			const next = encodeURI(urls.shift()!);
			url = new URL(next, url).href;
		}
		return decodeURI(url);
	}

	/**
	 * Applies color corrections and other transformations to style.layers
	 */
	private patchLayers(style: any, options: DesignMakerOptions): void {
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
		const fadeColorArr = this.parseColor(options.fadeColor);
		const tintColorArr = this.parseColor(options.tintColor);

		const paintColorKeys = [
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
			'sky-atmosphere-color',
			'sky-atmosphere-halo-color',
			'sky-gradient',
			'text-color',
			'text-halo-color'
		];

		style.layers = style.layers.filter((layer: any) => {
			// Remove text or icon for labels/symbols if requested
			if (layer.layout) {
				if (options.hideLabels) {
					delete layer.layout['text-field'];
				}
				if (options.hideSymbols) {
					delete layer.layout['icon-image'];
				}
			}

			// Filter out layers whose IDs match hideLayerIds
			if (options.hideLayerIds instanceof RegExp && options.hideLayerIds.test(layer.id)) {
				return false;
			}

			// Adjust paint color fields
			if (layer.paint) {
				paintColorKeys.forEach((key) => {
					if (layer.paint[key]) {
						layer.paint[key] = this.fixColorValue(layer.paint[key], options, fadeColorArr, tintColorArr);
					}
				});
			}
			return true;
		});
	}

	/**
	 * Confirms the given value is a color string, then repairs it via `repairColor`.
	 * If the style includes other color expressions (e.g. arrays), you may need a more advanced parser.
	 */
	private fixColorValue(
		value: string,
		options: DesignMakerOptions,
		fadeColorArr: number[],
		tintColorArr: number[]
	): string {
		if (typeof value !== 'string') {
			throw new Error(`fixColorValue - unknown color type: ${value}`);
		}
		return this.repairColor(value, options, fadeColorArr, tintColorArr);
	}

	/**
	 * Takes a color string (#rgb, #rrggbb, rgba, etc.) and applies
	 * grey, invert, fade, tint, hue-rotate, gamma adjustments.
	 */
	private repairColor(
		colorStr: string,
		options: DesignMakerOptions,
		fadeColorArr: number[],
		tintColorArr: number[]
	): string {
		let [r, g, b, a] = this.parseColor(colorStr);

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
			const baseHsv = this.rgbToHsv(r, g, b);
			const tintHsv = this.rgbToHsv(tintColorArr[0], tintColorArr[1], tintColorArr[2]);
			// Mix saturations but keep base value
			const newRgb = this.hsvToRgb(
				tintHsv[0], // new hue
				(tintHsv[1] * baseHsv[1]) / 100, // partially mix saturation
				baseHsv[2] // keep base brightness
			);

			r = r * (1 - options.tint) + newRgb[0] * options.tint;
			g = g * (1 - options.tint) + newRgb[1] * options.tint;
			b = b * (1 - options.tint) + newRgb[2] * options.tint;
		}

		// 6. Hue-rotate
		if (options.hueRotate !== 0) {
			const baseHsv = this.rgbToHsv(r, g, b);
			// hueRotate is fraction of 360
			baseHsv[0] += 360 * options.hueRotate;
			while (baseHsv[0] >= 360) {
				baseHsv[0] -= 360;
			}
			const newRgb = this.hsvToRgb(baseHsv[0], baseHsv[1], baseHsv[2]);
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

	/**
	 * Parses a color string (#abc, #rrggbb, rgba, etc.) into an [r,g,b,a] array.
	 */
	private parseColor(colorStr: string): number[] {
		let text = colorStr.replace(/\s+/g, '').toLowerCase();

		// #rrggbb
		let match = text.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
		if (match) {
			return [
				parseInt(match[1], 16),
				parseInt(match[2], 16),
				parseInt(match[3], 16),
				1
			];
		}

		// #rgb
		match = text.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
		if (match) {
			return [
				parseInt(match[1], 16) * 17,
				parseInt(match[2], 16) * 17,
				parseInt(match[3], 16) * 17,
				1
			];
		}

		// rgba(...)
		match = text.match(/^rgba\(([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)\)$/);
		if (match) {
			return [
				parseFloat(match[1]),
				parseFloat(match[2]),
				parseFloat(match[3]),
				parseFloat(match[4])
			];
		}

		throw new Error(`parseColor: invalid color format "${colorStr}"`);
	}

	/**
	 * Converts [r, g, b] in [0..255] to HSV [h, s, v].
	 * - h in [0..360), s in [0..100], v in [0..100]
	 */
	private rgbToHsv(r: number, g: number, b: number): [number, number, number] {
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const delta = max - min;

		let h = 0;
		if (delta !== 0) {
			if (max === r) {
				h = (g - b) / delta;
			} else if (max === g) {
				h = 2 + (b - r) / delta;
			} else {
				h = 4 + (r - g) / delta;
			}
		}
		h = 60 * (h < 0 ? h + 6 : h);

		const s = max ? (delta / max) * 100 : 0;
		const v = (max / 255) * 100;

		return [h, s, v];
	}

	/**
	 * Converts HSV [h, s, v] to [r, g, b].
	 * - h in [0..360), s in [0..100], v in [0..100]
	 * - returns each channel in [0..255]
	 */
	private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
		h = (h / 360) * 6;
		s = s / 100;
		v = v / 100;

		const hh = Math.floor(h);
		const f = h - hh;
		const p = v * (1 - s);
		const q = v * (1 - f * s);
		const t = v * (1 - (1 - f) * s);

		// If needed, you can also expand the logic for each 0..5 range
		switch (hh % 6) {
			case 0:
				return [v * 255, t * 255, p * 255];
			case 1:
				return [q * 255, v * 255, p * 255];
			case 2:
				return [p * 255, v * 255, t * 255];
			case 3:
				return [p * 255, q * 255, v * 255];
			case 4:
				return [t * 255, p * 255, v * 255];
			default:
				// case 5:
				return [v * 255, p * 255, q * 255];
		}
	}
}