/* eslint-disable @typescript-eslint/consistent-type-imports */

import { jest } from '@jest/globals';

const instance = {
	get: jest.fn(),
	listen: jest.fn((port, callback: () => void) => {
		callback();
	}),
};

export const mockExpress = {
	default: jest.fn(() => instance),
} as unknown as jest.Mocked<typeof import('express')>;
