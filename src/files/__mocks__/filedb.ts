import type { FileDB } from '../filedb';
import { jest } from '@jest/globals';

export const MockedFileDB = jest.fn(() => {
	return {
		files: new Map(),
		enterWatchMode: jest.fn(),
		compress: jest.fn(async () => { }),
		setFile: jest.fn(),
		getFile: jest.fn(() => Buffer.from('')),
		setFileFromBuffer: jest.fn(() => Buffer.from('')),
		iterate: jest.fn(() => (new Map()).values()),
	} as const satisfies FileDB;
});