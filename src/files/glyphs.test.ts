import { describe, it, expect } from 'vitest';
import { emptyGlyphPbf, limitFontFamiliesCodeblocks } from './glyphs';

describe('limitFontFamiliesCodeblocks', () => {
	function limit(faces: object[], maxCodepoint: number): unknown {
		const json = Buffer.from(JSON.stringify([{ name: 'Noto Sans', faces }]));
		return JSON.parse(limitFontFamiliesCodeblocks(json, maxCodepoint).toString());
	}

	it('drops blocks from the limit on and clips a range crossing it', () => {
		const face = { id: 'noto_sans_regular', style: 'normal', weight: 400, width: 'normal' };
		// Real Noto Sans codeblocks: block 40 is U+0400, the first codepoint frontend-tiny empties.
		const codeblocks = '0,2-7,A-52,90-97,10F,1AB-1AC,1DF0-1DF1';
		expect(limit([{ ...face, codeblocks }], 1024)).toStrictEqual([
			{ name: 'Noto Sans', faces: [{ ...face, codeblocks: '0,2-7,A-3F' }] },
		]);
	});

	it('keeps single blocks and ranges that end right below the limit', () => {
		expect(
			limit(
				[
					{ id: 'a', codeblocks: '3F' },
					{ id: 'b', codeblocks: '30-3F' },
					{ id: 'c', codeblocks: '3E-40' },
				],
				1024
			)
		).toStrictEqual([
			{
				name: 'Noto Sans',
				faces: [
					{ id: 'a', codeblocks: '3F' },
					{ id: 'b', codeblocks: '30-3F' },
					{ id: 'c', codeblocks: '3E-3F' },
				],
			},
		]);
	});

	it('writes an empty string when no block remains, and leaves faces without codeblocks alone', () => {
		expect(limit([{ id: 'a', codeblocks: '40-FF' }, { id: 'b', codeblocks: '' }, { id: 'c' }], 1024)).toStrictEqual([
			{ name: 'Noto Sans', faces: [{ id: 'a', codeblocks: '' }, { id: 'b', codeblocks: '' }, { id: 'c' }] },
		]);
	});

	it('keeps a block that the limit only partly covers', () => {
		// U+0405 is still available, so block 40 (U+0400–U+040F) must stay listed.
		expect(limit([{ id: 'a', codeblocks: '3F-41' }], 0x406)).toStrictEqual([
			{ name: 'Noto Sans', faces: [{ id: 'a', codeblocks: '3F-40' }] },
		]);
	});
});

describe('emptyGlyphPbf', () => {
	it('encodes a single fontstack with name and range and no glyphs', () => {
		const buffer = emptyGlyphPbf('noto_sans_regular', '1024-1279');

		// glyphs.stacks[0] { name = "noto_sans_regular", range = "1024-1279" }
		const expected = Buffer.concat([
			Buffer.from([0x0a, 0x1e]), // field 1 (stacks), length 30
			Buffer.from([0x0a, 0x11]), // field 1 (name), length 17
			Buffer.from('noto_sans_regular', 'utf8'),
			Buffer.from([0x12, 0x09]), // field 2 (range), length 9
			Buffer.from('1024-1279', 'utf8'),
		]);

		expect(buffer).toEqual(expected);
	});

	it('emits a varint length for payloads longer than 127 bytes', () => {
		const longName = 'a'.repeat(130);
		const buffer = emptyGlyphPbf(longName, '0-255');

		// The name field's length must be encoded as a 2-byte varint (130 = 0x82 0x01).
		expect(buffer.includes(Buffer.from([0x0a, 0x82, 0x01]))).toBe(true);
	});

	it('produces a non-empty, deterministic buffer', () => {
		const a = emptyGlyphPbf('font', '0-255');
		const b = emptyGlyphPbf('font', '0-255');
		expect(a.length).toBeGreaterThan(0);
		expect(a).toEqual(b);
	});
});
