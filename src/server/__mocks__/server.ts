import { jest } from '@jest/globals';

const originalModule = await import('../server?' + Math.random()) as typeof import('../server');

const serverInstance = {
	start: jest.fn().mockReturnValue(Promise.resolve(undefined)),
};

export const parseDevConfig = jest.fn(originalModule.parseDevConfig);
export const Server = jest.fn(() => serverInstance);

const mockedModule = { parseDevConfig, Server };

jest.unstable_mockModule('../server', () => mockedModule);
