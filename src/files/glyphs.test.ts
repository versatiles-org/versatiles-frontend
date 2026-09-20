import { describe, it, expect } from 'vitest';
import { emptyGlyphPbf, limitFontFamiliesCodeblocks, removeItalicFaces, removeItalicFontIds } from './glyphs';

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
	it('encodes a single fontstack with no fields, matching versatiles-glyphs-rs', () => {
		// glyphs.stacks[0] {} — field 1 (stacks), wire type 2, length 0.
		expect(emptyGlyphPbf()).toEqual(Buffer.from([0x0a, 0x00]));
	});

	it('produces a non-empty, deterministic buffer', () => {
		const a = emptyGlyphPbf();
		const b = emptyGlyphPbf();
		expect(a.length).toBeGreaterThan(0);
		expect(a).toEqual(b);
	});
});

describe('removeItalicFaces', () => {
	/** Shaped like the real font_families.json of versatiles-fonts. */
	const families = [
		{
			name: 'Noto Sans',
			faces: [
				{ id: 'noto_sans_bold', style: 'normal', weight: 700, width: 'normal', codeblocks: '0-7' },
				{ id: 'noto_sans_bold_italic', style: 'italic', weight: 700, width: 'normal', codeblocks: '0-7' },
				{ id: 'noto_sans_regular', style: 'normal', weight: 400, width: 'normal', codeblocks: '0-7' },
				{ id: 'noto_sans_regular_italic', style: 'italic', weight: 400, width: 'normal', codeblocks: '0-7' },
			],
		},
	];
	const encode = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
	const decode = (buffer: Buffer): { name: string; faces: { id: string }[] }[] => JSON.parse(buffer.toString('utf8'));

	it('keeps only the non-italic faces', () => {
		const result = decode(removeItalicFaces(encode(families)));

		expect(result[0].faces.map((face) => face.id)).toStrictEqual(['noto_sans_bold', 'noto_sans_regular']);
	});

	it('leaves everything else about a face untouched', () => {
		const result = decode(removeItalicFaces(encode(families)));

		expect(result[0].faces[0]).toStrictEqual(families[0].faces[0]);
		expect(result[0].name).toBe('Noto Sans');
	});

	it('drops a family whose faces are all italic rather than leaving it empty', () => {
		const onlyItalic = [{ name: 'Italic Only', faces: [{ id: 'x_italic', style: 'italic' }] }];

		expect(decode(removeItalicFaces(encode(onlyItalic)))).toStrictEqual([]);
	});

	it('keys on the style field, not on the name', () => {
		// A face named like an italic but declared normal stays; the reverse goes.
		const odd = [
			{
				name: 'Odd',
				faces: [
					{ id: 'looks_italic', style: 'normal' },
					{ id: 'looks_upright', style: 'italic' },
				],
			},
		];

		expect(decode(removeItalicFaces(encode(odd)))[0].faces.map((f) => f.id)).toStrictEqual(['looks_italic']);
	});

	it('ends with a newline, as the upstream file does', () => {
		expect(removeItalicFaces(encode(families)).toString('utf8').endsWith('\n')).toBe(true);
	});
});

describe('removeItalicFontIds', () => {
	const ids = ['noto_sans_bold', 'noto_sans_bold_italic', 'noto_sans_regular', 'noto_sans_regular_italic'];
	const encode = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2));

	it('removes every id with an italic suffix', () => {
		const result = JSON.parse(removeItalicFontIds(encode(ids)).toString('utf8')) as string[];

		expect(result).toStrictEqual(['noto_sans_bold', 'noto_sans_regular']);
	});

	it('keeps an id that merely contains "italic" without the suffix', () => {
		const result = JSON.parse(removeItalicFontIds(encode(['italic_display', 'x_italic'])).toString('utf8'));

		expect(result).toStrictEqual(['italic_display']);
	});

	it('does not add a trailing newline, as the upstream file has none', () => {
		expect(removeItalicFontIds(encode(ids)).toString('utf8').endsWith('\n')).toBe(false);
	});
});
