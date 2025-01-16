// lib/utils.test.ts

import { loadJSON } from './utils';
import fetchMock from 'jest-fetch-mock';
import { describe, it, expect, beforeEach } from '@jest/globals';

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