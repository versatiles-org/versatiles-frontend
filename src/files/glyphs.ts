/**
 * Encodes an unsigned integer as a Protobuf base-128 varint.
 */
function varint(value: number): Buffer {
	const bytes: number[] = [];
	while (value > 0x7f) {
		bytes.push((value & 0x7f) | 0x80);
		value >>>= 7;
	}
	bytes.push(value);
	return Buffer.from(bytes);
}

/**
 * Encodes a length-delimited Protobuf field (wire type 2): tag, length, then payload.
 */
function lengthDelimited(fieldNumber: number, payload: Buffer): Buffer {
	return Buffer.concat([varint((fieldNumber << 3) | 2), varint(payload.length), payload]);
}

/**
 * Builds a valid but empty glyphs PBF: a single fontstack carrying the correct name and range
 * but no glyph bitmaps. A client (e.g. MapLibre) parses this as "this range has no glyphs" and
 * serves it with HTTP 200, avoiding the 404 that a missing glyph tile would produce.
 *
 * Follows the SDF glyphs protobuf schema:
 *   message glyphs   { repeated fontstack stacks = 1; }
 *   message fontstack { required string name = 1; required string range = 2; repeated glyph glyphs = 3; }
 *
 * @param name  - The fontstack name, e.g. "noto_sans_regular".
 * @param range - The codepoint range, e.g. "1024-1279".
 */
export function emptyGlyphPbf(name: string, range: string): Buffer {
	const fontstack = Buffer.concat([
		lengthDelimited(1, Buffer.from(name, 'utf8')),
		lengthDelimited(2, Buffer.from(range, 'utf8')),
	]);
	return lengthDelimited(1, fontstack);
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
