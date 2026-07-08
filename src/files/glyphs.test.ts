import { describe, it, expect } from 'vitest';
import { emptyGlyphPbf } from './glyphs';

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
