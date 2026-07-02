import { describe, expect, it } from 'vitest';
import { safeJoinDest } from './safe-path';

describe('safeJoinDest', () => {
	it('joins a normal entry under the destination', () => {
		expect(safeJoinDest('assets/glyphs/', 'index.json')).toBe('assets/glyphs/index.json');
		expect(safeJoinDest('assets/glyphs/', 'noto_sans/0-255.pbf')).toBe('assets/glyphs/noto_sans/0-255.pbf');
	});

	it('normalizes redundant separators without escaping', () => {
		expect(safeJoinDest('assets/glyphs', 'sub/./file.txt')).toBe('assets/glyphs/sub/file.txt');
	});

	it('rejects parent-directory traversal', () => {
		expect(safeJoinDest('assets/glyphs/', '../../../etc/passwd')).toBe(false);
		expect(safeJoinDest('assets/glyphs/', 'sub/../../../secret')).toBe(false);
	});

	it('rejects absolute paths', () => {
		expect(safeJoinDest('assets/glyphs/', '/etc/passwd')).toBe(false);
	});
});
