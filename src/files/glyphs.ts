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
 * Removes every italic face from a `font_families.json`.
 *
 * Pair it with an ignore rule dropping the italic glyph directories: this file is the catalogue
 * of faces a client may ask for, so an italic face left in it after its glyph ranges are gone
 * points the client at tiles that are no longer served.
 *
 * Keyed on the face's own `style` field rather than its name, which is what the format actually
 * declares. A family left with no faces at all is dropped rather than kept empty.
 *
 * @param json - The content of `font_families.json`.
 */
export function removeItalicFaces(json: Buffer): Buffer {
	const families = JSON.parse(json.toString('utf8')) as { faces?: { style?: unknown }[] }[];

	const kept = families
		.map((family) => ({ ...family, faces: (family.faces ?? []).filter((face) => face.style !== 'italic') }))
		.filter((family) => family.faces.length > 0);

	return Buffer.from(JSON.stringify(kept, null, 2) + '\n');
}

/**
 * Removes italic fonts from a glyphs `index.json`, the list of font ids a client may request.
 *
 * Detected by the `_italic` suffix that versatiles-fonts gives them: the index carries bare ids,
 * so the `style` field {@link removeItalicFaces} keys on is not available here.
 *
 * @param json - The content of `index.json`.
 */
export function removeItalicFontIds(json: Buffer): Buffer {
	const ids = JSON.parse(json.toString('utf8')) as string[];
	const kept = ids.filter((id) => !id.endsWith('_italic'));

	// Unlike font_families.json this file ships without a trailing newline; match it, so the only
	// difference from the upstream file is the entries that were removed.
	return Buffer.from(JSON.stringify(kept, null, 2));
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
