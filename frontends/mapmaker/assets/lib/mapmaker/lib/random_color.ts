
export interface RandomColorOptions {
	seed?: string | number;
	hue?: string | number;
	saturation?: string | number;
	luminosity?: string | number;
	opacity?: number;
}

export default class RandomColor {
	colorDictionary: ColorDictionary;
	seed: number = 0;
	constructor() {
		this.colorDictionary = loadColorBounds();
	}

	randomColor(options: RandomColorOptions) {
		options ??= {};

		this.seed = seedToInteger(options.seed);
		const H = this.pickHue(options);
		const S = this.pickSaturation(H, options);
		const B = this.pickBrightness(H, S, options);
		const hsl = HSVtoHSL([H, S, B]).map(v => v.toFixed(0));
		return `hsla(${hsl[0]},${hsl[1]}%,${hsl[2]}%,${options.opacity || 1})`
	};

	private pickHue(options: RandomColorOptions): number {
		return this.randomWithin(this.getHueRange(options.hue)) % 360;
	}

	private getHueRange(hue?: string | number): Range {
		if (typeof hue === 'string') {
			const color = this.colorDictionary.get(hue);
			if (color && color.hueRange) return color.hueRange;

			const number = parseInt(hue);
			if (number < 360 && number > 0) hue = number;
		}

		if (typeof hue === 'number') {
			if (hue < 360 && hue > 0) return [hue, hue];
		}

		return [0, 360];
	}

	private randomWithin(range: Range): number {
		//Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
		const max = range[1] || 1;
		const min = range[0] || 0;
		this.seed = (this.seed * 9301 + 49297) % 233280;
		const rnd = this.seed / 233280.0;
		return Math.floor(min + rnd * (max - min));
	}

	private pickSaturation(hue: number, options: RandomColorOptions): number {
		if (options.hue === 'monochrome') return 0;
		if (options.luminosity === 'random') return this.randomWithin([0, 100]);

		const saturationRange = this.getColorInfo(hue).saturationRange;
		let sMin = saturationRange[0], sMax = saturationRange[1];

		if (options.saturation === 'strong') return sMax;

		switch (options.luminosity) {
			case 'bright': sMin = 55; break;
			case 'dark': sMin = sMax - 10; break;
			case 'light': sMax = 55; break;
		}

		return this.randomWithin([sMin, sMax]);
	}

	private pickBrightness(H: number, S: number, options: RandomColorOptions): number {
		let bMin = this.getMinimumBrightness(H, S), bMax = 100;

		switch (options.luminosity) {
			case 'dark': bMax = Math.min(100, bMin + 20); break;
			case 'light': bMin = (bMax + bMin) / 2; break;
			case 'random': bMin = 0; bMax = 100; break;
		}

		return this.randomWithin([bMin, bMax]);
	}

	private getMinimumBrightness(H: number, S: number): number {
		let lowerBounds = this.getColorInfo(H).lowerBounds;

		for (let i = 0; i < lowerBounds.length - 1; i++) {
			let s1 = lowerBounds[i][0], v1 = lowerBounds[i][1];
			let s2 = lowerBounds[i + 1][0], v2 = lowerBounds[i + 1][1];
			if (S >= s1 && S <= s2) {
				let m = (v2 - v1) / (s2 - s1), b = v1 - m * s1;
				return m * S + b;
			}
		}

		return 0;
	}

	private getColorInfo(hue: number): ColorDictionaryEntry {
		// Maps red colors to make picking hue easier
		if (hue >= 334 && hue <= 360) hue -= 360;

		for (const color of this.colorDictionary.values()) {
			if (color.hueRange && hue >= color.hueRange[0] && hue <= color.hueRange[1]) {
				return color;
			}
		}
		throw Error('Color not found');
	}
}



function HSVtoHSL(hsv: [number, number, number]): [number, number, number] {
	let s = hsv[1] / 100, v = hsv[2] / 100, k = (2 - s) * v;
	return [hsv[0], 100 * s * v / (k < 1 ? k : 2 - k), 100 * k / 2];
}

function seedToInteger(s?: string | number): number {
	if (s == null) return Math.round(Math.random() * 0x1e9);
	if (typeof s === 'number') return Math.round(s);

	let i = 0;
	for (let p = 0; p < s.length; p++) i = (i * 0x101 + s.charCodeAt(p)) % 0x100000000;
	return i;
}

type Range = [number, number];

interface ColorDictionaryEntry {
	hueRange: Range;
	lowerBounds: Range[];
	saturationRange: Range;
	brightnessRange: Range;
};

type ColorDictionary = Map<string, ColorDictionaryEntry>;

function loadColorBounds(): ColorDictionary {
	let dict: ColorDictionary = new Map();

	defineColor('monochrome', [0, 0], [[0, 0], [100, 0]]);
	defineColor('red', [-26, 18], [[20, 100], [30, 92], [40, 89], [50, 85], [60, 78], [70, 70], [80, 60], [90, 55], [100, 50]]);
	defineColor('orange', [18, 46], [[20, 100], [30, 93], [40, 88], [50, 86], [60, 85], [70, 70], [100, 70]]);
	defineColor('yellow', [46, 62], [[25, 100], [40, 94], [50, 89], [60, 86], [70, 84], [80, 82], [90, 80], [100, 75]]);
	defineColor('green', [62, 178], [[30, 100], [40, 90], [50, 85], [60, 81], [70, 74], [80, 64], [90, 50], [100, 40]]);
	defineColor('blue', [178, 257], [[20, 100], [30, 86], [40, 80], [50, 74], [60, 60], [70, 52], [80, 44], [90, 39], [100, 35]]);
	defineColor('purple', [257, 282], [[20, 100], [30, 87], [40, 79], [50, 70], [60, 65], [70, 59], [80, 52], [90, 45], [100, 42]]);
	defineColor('pink', [282, 334], [[20, 100], [30, 90], [40, 86], [60, 84], [80, 80], [90, 75], [100, 73]]);

	return dict;

	function defineColor(name: string, hueRange: Range, lowerBounds: Range[]): void {
		let greyest = lowerBounds[0];
		let colorful = lowerBounds[lowerBounds.length - 1];

		dict.set(name, {
			hueRange,
			lowerBounds,
			saturationRange: [greyest[0], colorful[0]],
			brightnessRange: [colorful[1], greyest[1]],
		});
	}
}