let randomColor = (function () {
	// Seed to get repeatable colors
	let seed = null;

	// Shared color dictionary
	const colorDictionary = {};

	// Populate the color dictionary
	loadColorBounds();

	// check if a range is taken
	const colorRanges = [];

	return randomColor;

	function randomColor(options) {
		options ??= {};

		seed = stringToInteger(options.seed);
		let H = pickHue(options);
		let S = pickSaturation(H, options);
		let B = pickBrightness(H, S, options);
		let hslColor = HSVtoHSL([H, S, B]);
		return `hsla(${hslColor[0]},${hslColor[1]}%,${hslColor[2]}%,${options.opacity || 1})`
	};

	function pickHue(options) {
		if (colorRanges.length > 0) {
			var hueRange = getRealHueRange(options.hue);

			var hue = randomWithin(hueRange);

			//Each of colorRanges.length ranges has a length equal approximatelly one step
			var step = (hueRange[1] - hueRange[0]) / colorRanges.length;

			var j = parseInt((hue - hueRange[0]) / step);

			//Check if the range j is taken
			if (colorRanges[j] === true) {
				j = (j + 2) % colorRanges.length;
			} else {
				colorRanges[j] = true;
			}

			var min = (hueRange[0] + j * step) % 359,
				max = (hueRange[0] + (j + 1) * step) % 359;

			hueRange = [min, max];

			hue = randomWithin(hueRange);

			if (hue < 0) {
				hue = 360 + hue;
			}
			return hue;
		} else {
			var hueRange = getHueRange(options.hue);

			hue = randomWithin(hueRange);
			// Instead of storing red as two seperate ranges,
			// we group them, using negative numbers
			if (hue < 0) {
				hue = 360 + hue;
			}

			return hue;
		}
	}

	function pickSaturation(hue, options) {
		if (options.hue === "monochrome") {
			return 0;
		}

		if (options.luminosity === "random") {
			return randomWithin([0, 100]);
		}

		var saturationRange = getSaturationRange(hue);

		var sMin = saturationRange[0],
			sMax = saturationRange[1];

		switch (options.luminosity) {
			case "bright":
				sMin = 55;
				break;

			case "dark":
				sMin = sMax - 10;
				break;

			case "light":
				sMax = 55;
				break;
		}

		return randomWithin([sMin, sMax]);
	}

	function pickBrightness(H, S, options) {
		var bMin = getMinimumBrightness(H, S),
			bMax = 100;

		switch (options.luminosity) {
			case "dark":
				bMax = bMin + 20;
				break;

			case "light":
				bMin = (bMax + bMin) / 2;
				break;

			case "random":
				bMin = 0;
				bMax = 100;
				break;
		}

		return randomWithin([bMin, bMax]);
	}

	function getMinimumBrightness(H, S) {
		var lowerBounds = getColorInfo(H).lowerBounds;

		for (var i = 0; i < lowerBounds.length - 1; i++) {
			var s1 = lowerBounds[i][0],
				v1 = lowerBounds[i][1];

			var s2 = lowerBounds[i + 1][0],
				v2 = lowerBounds[i + 1][1];

			if (S >= s1 && S <= s2) {
				var m = (v2 - v1) / (s2 - s1),
					b = v1 - m * s1;

				return m * S + b;
			}
		}

		return 0;
	}

	function getHueRange(colorInput) {
		if (typeof parseInt(colorInput) === "number") {
			var number = parseInt(colorInput);

			if (number < 360 && number > 0) {
				return [number, number];
			}
		}

		if (typeof colorInput === "string") {
			if (colorDictionary[colorInput]) {
				var color = colorDictionary[colorInput];
				if (color.hueRange) {
					return color.hueRange;
				}
			} else if (colorInput.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
				var hue = HexToHSB(colorInput)[0];
				return [hue, hue];
			}
		}

		return [0, 360];
	}

	function getSaturationRange(hue) {
		return getColorInfo(hue).saturationRange;
	}

	function getColorInfo(hue) {
		// Maps red colors to make picking hue easier
		if (hue >= 334 && hue <= 360) {
			hue -= 360;
		}

		for (var colorName in colorDictionary) {
			var color = colorDictionary[colorName];
			if (
				color.hueRange &&
				hue >= color.hueRange[0] &&
				hue <= color.hueRange[1]
			) {
				return colorDictionary[colorName];
			}
		}
		return "Color not found";
	}

	function randomWithin(range) {
		//Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
		let max = range[1] || 1;
		let min = range[0] || 0;
		seed = (seed * 9301 + 49297) % 233280;
		let rnd = seed / 233280.0;
		return Math.floor(min + rnd * (max - min));
	}

	function defineColor(name, hueRange, lowerBounds) {
		var sMin = lowerBounds[0][0],
			sMax = lowerBounds[lowerBounds.length - 1][0],
			bMin = lowerBounds[lowerBounds.length - 1][1],
			bMax = lowerBounds[0][1];

		colorDictionary[name] = {
			hueRange: hueRange,
			lowerBounds: lowerBounds,
			saturationRange: [sMin, sMax],
			brightnessRange: [bMin, bMax],
		};
	}

	function loadColorBounds() {
		defineColor("monochrome", null, [
			[0, 0],
			[100, 0],
		]);

		defineColor(
			"red",
			[-26, 18],
			[
				[20, 100],
				[30, 92],
				[40, 89],
				[50, 85],
				[60, 78],
				[70, 70],
				[80, 60],
				[90, 55],
				[100, 50],
			]
		);

		defineColor(
			"orange",
			[18, 46],
			[
				[20, 100],
				[30, 93],
				[40, 88],
				[50, 86],
				[60, 85],
				[70, 70],
				[100, 70],
			]
		);

		defineColor(
			"yellow",
			[46, 62],
			[
				[25, 100],
				[40, 94],
				[50, 89],
				[60, 86],
				[70, 84],
				[80, 82],
				[90, 80],
				[100, 75],
			]
		);

		defineColor(
			"green",
			[62, 178],
			[
				[30, 100],
				[40, 90],
				[50, 85],
				[60, 81],
				[70, 74],
				[80, 64],
				[90, 50],
				[100, 40],
			]
		);

		defineColor(
			"blue",
			[178, 257],
			[
				[20, 100],
				[30, 86],
				[40, 80],
				[50, 74],
				[60, 60],
				[70, 52],
				[80, 44],
				[90, 39],
				[100, 35],
			]
		);

		defineColor(
			"purple",
			[257, 282],
			[
				[20, 100],
				[30, 87],
				[40, 79],
				[50, 70],
				[60, 65],
				[70, 59],
				[80, 52],
				[90, 45],
				[100, 42],
			]
		);

		defineColor(
			"pink",
			[282, 334],
			[
				[20, 100],
				[30, 90],
				[40, 86],
				[60, 84],
				[80, 80],
				[90, 75],
				[100, 73],
			]
		);
	}

	function HexToHSB(hex) {
		hex = hex.replace(/^#/, "");
		hex = hex.length === 3 ? hex.replace(/(.)/g, "$1$1") : hex;

		var red = parseInt(hex.substr(0, 2), 16) / 255,
			green = parseInt(hex.substr(2, 2), 16) / 255,
			blue = parseInt(hex.substr(4, 2), 16) / 255;

		var cMax = Math.max(red, green, blue),
			delta = cMax - Math.min(red, green, blue),
			saturation = cMax ? delta / cMax : 0;

		switch (cMax) {
			case red:
				return [60 * (((green - blue) / delta) % 6) || 0, saturation, cMax];
			case green:
				return [60 * ((blue - red) / delta + 2) || 0, saturation, cMax];
			case blue:
				return [60 * ((red - green) / delta + 4) || 0, saturation, cMax];
		}
	}

	function HSVtoHSL(hsv) {
		let h = hsv[0],
			s = hsv[1] / 100,
			v = hsv[2] / 100,
			k = (2 - s) * v;

		return [
			h,
			Math.round(((s * v) / (k < 1 ? k : 2 - k)) * 10000) / 100,
			(k / 2) * 100,
		];
	}

	function stringToInteger(string) {
		let total = 0;
		for (let i = 0; i < string.length; i++) {
			total = (total * 257 + string.charCodeAt(i)) % 4294967296;
		}
		return total;
	}

	// get The range of given hue when options.count!=0
	function getRealHueRange(colorHue) {
		if (!isNaN(colorHue)) {
			var number = parseInt(colorHue);

			if (number < 360 && number > 0) {
				return getColorInfo(colorHue).hueRange;
			}
		} else if (typeof colorHue === "string") {
			if (colorDictionary[colorHue]) {
				var color = colorDictionary[colorHue];

				if (color.hueRange) {
					return color.hueRange;
				}
			} else if (colorHue.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
				var hue = HexToHSB(colorHue)[0];
				return getColorInfo(hue).hueRange;
			}
		}

		return [0, 360];
	}
})();