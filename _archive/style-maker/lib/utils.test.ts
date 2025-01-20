import { loadJSON, deepClone, absoluteUrl } from './utils';
import fetchMock from 'jest-fetch-mock';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Enable fetch mocking
fetchMock.enableMocks();

describe('loadJSON', () => {
	beforeEach(() => {
		fetchMock.resetMocks();
	});

	it('should return JSON data when the response is successful', async () => {
		const mockData = { key: 'value' };
		fetchMock.mockResponseOnce(JSON.stringify(mockData), { status: 200 });

		const result = await loadJSON('https://example.com/data.json');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/data.json');
		expect(result).toEqual(mockData);
	});

	it('should return false if the fetch fails', async () => {
		fetchMock.mockReject(new Error('Fetch error'));

		const result = await loadJSON('https://example.com/data.json');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/data.json');
		expect(result).toBe(false);
	});

	it('should return false if the response status is not 200', async () => {
		fetchMock.mockResponseOnce('Error', { status: 404 });

		const result = await loadJSON('https://example.com/data.json');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/data.json');
		expect(result).toBe(false);
	});

	it('should return false if the response is not an instance of Response', async () => {
		// Simulate an invalid response (not an instance of Response)
		fetchMock.mockRejectOnce(new Error('Invalid response'));

		const result = await loadJSON('https://example.com/data.json');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result).toBe(false);
	});

	it('should handle invalid JSON gracefully', async () => {
		fetchMock.mockResponseOnce('Invalid JSON', { status: 200 });

		await expect(loadJSON('https://example.com/data.json')).rejects.toThrow();
	});
});

describe('deepClone', () => {
	it('should return primitives as-is', () => {
		expect(deepClone(42)).toBe(42);
		expect(deepClone('hello')).toBe('hello');
		expect(deepClone(true)).toBe(true);
		expect(deepClone(null)).toBe(null);
		expect(deepClone(undefined)).toBe(undefined);
	});

	it('should deeply clone arrays', () => {
		const arr = [1, [2, 3], { a: 4 }];
		const cloned = deepClone(arr);

		expect(cloned).toEqual(arr);
		expect(cloned).not.toBe(arr); // Ensure it's a new instance
		expect(cloned[1]).not.toBe(arr[1]);
		expect(cloned[2]).not.toBe(arr[2]);
	});

	it('should deeply clone objects', () => {
		const obj = { a: 1, b: { c: 2, d: [3, 4] } };
		const cloned = deepClone(obj);

		expect(cloned).toEqual(obj);
		expect(cloned).not.toBe(obj); // Ensure it's a new instance
		expect(cloned.b).not.toBe(obj.b);
		expect(cloned.b.d).not.toBe(obj.b.d);
	});

	it('should handle circular references gracefully', () => {
		const obj = { a: 1 };
		obj.self = obj;

		expect(() => deepClone(obj)).toThrow(); // Modify if deepClone supports circular refs
	});
});

describe('absoluteUrl', () => {
	const location = new URL('http://example.com/base/');
	Object.defineProperty(globalThis, 'window', {
		value: { location },
		writable: false,
	});
	const originalHref = location.href;

	afterEach(() => {
		location.href = originalHref;
	});

	it('should resolve a single relative URL', () => {
		expect(absoluteUrl('foo/bar.json'))
			.toBe('http://example.com/base/foo/bar.json');
	});

	it('should resolve a single relative URL, when location is a file', () => {
		location.href = 'http://example.com/base/index.html';
		expect(absoluteUrl('foo/bar.json'))
			.toBe('http://example.com/base/foo/bar.json');
	});

	it('should resolve a single absolute/ URL', () => {
		expect(absoluteUrl('/foo/bar.json'))
			.toBe('http://example.com/foo/bar.json');
	});

	it('should resolve multiple relative URLs sequentially', () => {
		expect(absoluteUrl('foo/', 'bar/', 'baz.json'))
			.toBe('http://example.com/base/foo/bar/baz.json');
	});

	it('should handle absolute URLs without changing protocol', () => {
		expect(absoluteUrl('https://example.org', '//other.com/resource.json'))
			.toBe('https://other.com/resource.json');
	});

	it('should handle absolute URLs without changing them', () => {
		expect(absoluteUrl('http://other.com/resource.json'))
			.toBe('http://other.com/resource.json');
	});

	it('should handle mixed relative and absolute URLs', () => {
		expect(absoluteUrl('foo', 'http://other.com/resource.json'))
			.toBe('http://other.com/resource.json');
	});
});
