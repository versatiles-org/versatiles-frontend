import { describe, expect, it, vi } from 'vitest';
import { mapEntryName, safeJoinDest } from './entry-path';

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

describe('mapEntryName', () => {
	it('puts the entry under dest', () => {
		expect(mapEntryName({ dest: 'assets/lib/' }, 'dist/a.js')).toBe('assets/lib/dist/a.js');
	});

	it('drops stripPrefix, and skips entries outside of it', () => {
		const mapping = { dest: 'editor/', stripPrefix: 'dist/' };
		expect(mapEntryName(mapping, 'dist/view/index.html')).toBe('editor/view/index.html');
		expect(mapEntryName(mapping, 'package.json')).toBe(false);
	});

	it('tests include against the name without the prefix', () => {
		const mapping = { dest: 'editor/', stripPrefix: 'dist/', include: /^(?!config\.json$)/ };
		expect(mapEntryName(mapping, 'dist/config.json')).toBe(false);
		expect(mapEntryName(mapping, 'dist/view/config.json')).toBe('editor/view/config.json');
	});

	it('renames by the name after flatten', () => {
		const mapping = { dest: 'assets/lib/x/', flatten: true, rename: { 'x.umd.cjs': 'x.js' } };
		expect(mapEntryName(mapping, 'dist/x.umd.cjs')).toBe('assets/lib/x/x.js');
		expect(mapEntryName(mapping, 'dist/x.css')).toBe('assets/lib/x/x.css');
	});

	it('skips an entry that escapes dest, with a warning', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(mapEntryName({ dest: 'assets/' }, '../../etc/passwd')).toBe(false);
		expect(warn).toHaveBeenCalledWith('Skipping unsafe entry "../../etc/passwd" (escapes "assets/")');
		warn.mockRestore();
	});
});
