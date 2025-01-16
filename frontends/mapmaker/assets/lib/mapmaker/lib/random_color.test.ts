import { describe, beforeEach, it, expect } from '@jest/globals';
import RandomColor, { RandomColorOptions } from './random_color';

describe('RandomColor', () => {
	let randomColor: RandomColor;

	beforeEach(() => {
		randomColor = new RandomColor();
	});

	it('should generate a valid HSLA string with default options', () => {
		const color = randomColor.randomColor({});
		expect(color).toMatch(/^hsla\(\d{1,3},\d{1,3}%,\d{1,3}%,(0|1|0\.\d+)\)$/);
	});

	it('should generate the same color for the same seed', () => {
		const options: RandomColorOptions = { seed: 'test-seed' };
		const color1 = randomColor.randomColor(options);
		const color2 = randomColor.randomColor(options);
		expect(color1).toBe(color2);
	});

	it('should generate different colors for different seeds', () => {
		const color1 = randomColor.randomColor({ seed: 'seed1' });
		const color2 = randomColor.randomColor({ seed: 'seed2' });
		expect(color1).not.toBe(color2);
	});

	it('should respect the hue range', () => {
		const options: RandomColorOptions = { hue: 180 };
		const color = randomColor.randomColor(options);
		expect(color).toMatch(/^hsla\(180,.*\)$/);
	});

	it('should respect the luminosity option', () => {
		const brightColor = randomColor.randomColor({ luminosity: 'bright' });
		const darkColor = randomColor.randomColor({ luminosity: 'dark' });

		// Extract lightness percentage from the generated color
		const brightLightness = parseInt(brightColor.match(/\d{1,3}%,(\d{1,3})%/)![1]);
		const darkLightness = parseInt(darkColor.match(/\d{1,3}%,(\d{1,3})%/)![1]);

		expect(brightLightness).toBeGreaterThan(darkLightness);
	});

	it('should respect the opacity option', () => {
		const options: RandomColorOptions = { opacity: 0.5 };
		const color = randomColor.randomColor(options);
		expect(color).toMatch(/hsla\(.*?,0\.5\)$/);
	});

	it('should default to full opacity if opacity is not specified', () => {
		const color = randomColor.randomColor({});
		expect(color).toMatch(/hsla\(.*?,1\)$/);
	});

	it('should handle monochrome hue correctly', () => {
		const options: RandomColorOptions = { hue: 'monochrome' };
		const color = randomColor.randomColor(options);
		expect(color).toMatch(/^hsla\(0,0%,.*\)$/); // Monochrome has 0 saturation
	});

	it('should handle invalid hue gracefully', () => {
		const options: RandomColorOptions = { hue: 'invalid-hue' };
		const color = randomColor.randomColor(options);
		expect(color).toMatch(/^hsla\(\d{1,3},.*\)$/); // Should fall back to valid hue range
	});
});
