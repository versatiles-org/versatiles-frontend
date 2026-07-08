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
