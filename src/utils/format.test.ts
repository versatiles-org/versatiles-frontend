import { describe, expect, it } from 'vitest';
import { groupDigits } from './format';

describe('groupDigits', () => {
	it('groups thousands with an apostrophe', () => {
		expect(groupDigits(0)).toBe('0');
		expect(groupDigits(999)).toBe('999');
		expect(groupDigits(1000)).toBe("1'000");
		expect(groupDigits(49075)).toBe("49'075");
		expect(groupDigits(1234567)).toBe("1'234'567");
	});
});
