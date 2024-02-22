/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';

const originalModule = await import('../server');

const serverInstance = {
	start: jest.fn().mockReturnValue(Promise.resolve(undefined)),
};

export const mockServer = {
	parseDevConfig: jest.fn(originalModule.parseDevConfig),
	Server: jest.fn(() => serverInstance),
} as unknown as jest.Mocked<typeof import('../server')>;
