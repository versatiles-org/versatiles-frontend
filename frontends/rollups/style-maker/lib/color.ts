export type Color3 = [number, number, number];
export type Color4 = [number, number, number, number];

export function HSVtoHSL([h, s, v]: Color3): Color3 {
	if (v === 0) return [0, 0, 0];
	if (s === 0) return [h, s, v];

	s = s / 100;
	v = v / 100;
	const k = (2 - s) * v;

	const S = s * v / ((k < 1) ? k : 2 - k);

	return [
		h,
		100 * S,
		100 * k / 2
	];
}


/**
 * Parses a color string (#abc, #rrggbb, rgba, etc.) into an [r,g,b,a] array.
 */
export function parseColor(colorStr: string): Color4 {
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
export function rgbToHsv(rgb: Color3 | Color4): Color3 {
	const [r, g, b] = rgb;
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
export function hsvToRgb(hsv: Color3): Color3 {
	const h = (hsv[0] / 360) * 6;
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;

	const hh = Math.floor(h);
	const f = h - hh;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	// If needed, you can also expand the logic for each 0..5 range
	switch (hh % 6) {
		case 0: return [v * 255, t * 255, p * 255];
		case 1: return [q * 255, v * 255, p * 255];
		case 2: return [p * 255, v * 255, t * 255];
		case 3: return [p * 255, q * 255, v * 255];
		case 4: return [t * 255, p * 255, v * 255];
		default: return [v * 255, p * 255, q * 255];			// case 5:
	}
}