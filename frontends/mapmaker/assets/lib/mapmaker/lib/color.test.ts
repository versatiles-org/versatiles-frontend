// color.test.ts

import { HSVtoHSL, parseColor, rgbToHsv, hsvToRgb } from './color';

describe('HSVtoHSL', () => {
	it('should convert HSV to HSL correctly', () => {
		expect(HSVtoHSL([0, 0, 0])).toStrictEqual([0, 0, 0]);
		expect(HSVtoHSL([40, 0, 50])).toStrictEqual([40, 0, 50]);
		expect(HSVtoHSL([80, 0, 100])).toStrictEqual([80, 0, 100]);
		expect(HSVtoHSL([120, 50, 0])).toStrictEqual([0, 0, 0]);
		expect(HSVtoHSL([160, 50, 50])).toStrictEqual([160, 33.33333333333333, 37.5]);
		expect(HSVtoHSL([200, 50, 100])).toStrictEqual([200, 100, 75]);
		expect(HSVtoHSL([240, 100, 0])).toStrictEqual([0, 0, 0]);
		expect(HSVtoHSL([280, 100, 50])).toStrictEqual([280, 100, 25]);
		expect(HSVtoHSL([320, 100, 100])).toStrictEqual([320, 100, 50]);
	});
});

describe('parseColor', () => {
	it('should parse #rrggbb format correctly', () => {
		expect(parseColor('#ff0000')).toEqual([255, 0, 0, 1]);
		expect(parseColor('#00ff00')).toEqual([0, 255, 0, 1]);
		expect(parseColor('#0000ff')).toEqual([0, 0, 255, 1]);
	});

	it('should parse #rgb format correctly', () => {
		expect(parseColor('#f00')).toEqual([255, 0, 0, 1]);
		expect(parseColor('#0f0')).toEqual([0, 255, 0, 1]);
		expect(parseColor('#00f')).toEqual([0, 0, 255, 1]);
	});

	it('should parse rgba(...) format correctly', () => {
		expect(parseColor('rgba(255,0,0,0.5)')).toEqual([255, 0, 0, 0.5]);
		expect(parseColor('rgba(0,255,0,1)')).toEqual([0, 255, 0, 1]);
		expect(parseColor('rgba(0,0,255,0.25)')).toEqual([0, 0, 255, 0.25]);
	});

	it('should throw an error for invalid formats', () => {
		expect(() => parseColor('invalid')).toThrow('parseColor: invalid color format "invalid"');
		expect(() => parseColor('#gggggg')).toThrow('parseColor: invalid color format "#gggggg"');
	});
});

describe('rgbToHsv', () => {
	it('should convert RGB to HSV correctly', () => {
		expect(rgbToHsv([255, 0, 0])).toEqual([0, 100, 100]);
		expect(rgbToHsv([0, 255, 0])).toEqual([120, 100, 100]);
		expect(rgbToHsv([0, 0, 255])).toEqual([240, 100, 100]);
		expect(rgbToHsv([255, 255, 255])).toEqual([0, 0, 100]);
		expect(rgbToHsv([0, 0, 0])).toEqual([0, 0, 0]);
	});
});

describe('hsvToRgb', () => {
	it('should convert HSV to RGB correctly', () => {
		expect(hsvToRgb([0, 100, 100])).toEqual([255, 0, 0]);
		expect(hsvToRgb([120, 100, 100])).toEqual([0, 255, 0]);
		expect(hsvToRgb([240, 100, 100])).toEqual([0, 0, 255]);
		expect(hsvToRgb([0, 0, 100])).toEqual([255, 255, 255]);
		expect(hsvToRgb([0, 0, 0])).toEqual([0, 0, 0]);
	});
});