/**
 * Builds a valid but empty glyphs PBF: a single fontstack with no glyph bitmaps. A client
 * (e.g. MapLibre) parses this as "this range has no glyphs" and serves it with HTTP 200,
 * avoiding the 404 that a missing glyph tile would produce.
 *
 * Follows the SDF glyphs protobuf schema:
 *   message glyphs   { repeated fontstack stacks = 1; }
 *   message fontstack { required string name = 1; required string range = 2; repeated glyph glyphs = 3; }
 *
 * `name` and `range` are not written, so the result is just two bytes. Neither MapLibre GL JS
 * (`parse_glyph_pbf.ts`) nor MapLibre Native (`glyph_pbf.cpp`) reads them — both only look at
 * tag 3 inside a fontstack. versatiles-glyphs-rs omits them too since v0.10.0, so the ranges
 * generated here are byte-identical to the empty ranges shipped in versatiles-fonts.
 */
export function emptyGlyphPbf(): Buffer {
	// stacks = 1 (wire type 2), length 0: one fontstack with no fields.
	return Buffer.from([0x0a, 0x00]);
}

/**
 * Rewrites a `font_families.json` so that the `codeblocks` of every face only list blocks below
 * `maxCodepoint`. Use it when glyph ranges above that codepoint are removed or emptied, so clients
 * do not pick a face for a script whose glyphs are no longer there.
 *
 * `codeblocks` is a comma-separated list of 16-codepoint blocks in uppercase hexadecimal, where a
 * block number is the codepoint shifted right by four bits and consecutive blocks are merged into
 * ranges, e.g. `"0,2-7,A-52"`. Faces without `codeblocks` are left unchanged.
 *
 * @param json         - The content of `font_families.json`.
 * @param maxCodepoint - The first codepoint that is no longer available, e.g. 1024.
 */
export function limitFontFamiliesCodeblocks(json: Buffer, maxCodepoint: number): Buffer {
	// A block that starts below the limit still contains available codepoints.
	const blockLimit = Math.ceil(maxCodepoint / 16);
	const families = JSON.parse(json.toString('utf8')) as { faces?: { codeblocks?: unknown }[] }[];

	for (const family of families) {
		for (const face of family.faces ?? []) {
			if (typeof face.codeblocks !== 'string') continue;
			face.codeblocks = face.codeblocks
				.split(',')
				.filter((part) => part !== '')
				.flatMap((part) => {
					const [start, end = start] = part.split('-').map((hex) => parseInt(hex, 16));
					if (start >= blockLimit) return [];
					const clippedEnd = Math.min(end, blockLimit - 1);
					const hex = (block: number): string => block.toString(16).toUpperCase();
					return [start === clippedEnd ? hex(start) : `${hex(start)}-${hex(clippedEnd)}`];
				})
				.join(',');
		}
	}

	return Buffer.from(JSON.stringify(families, null, 2) + '\n');
}
