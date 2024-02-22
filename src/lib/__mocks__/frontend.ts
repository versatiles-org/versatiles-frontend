/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import PromiseFunction from '../async';

const originalModule = await import('../frontend');

export const mockFrontend = {
	generateFrontends: jest.fn((): PromiseFunction => {
		return PromiseFunction.single(async () => { }, async () => { });
	}),
	loadFrontendConfigs: jest.fn(originalModule.loadFrontendConfigs),
	Frontend: jest.fn(() => {
		return {
			enterWatchMode: jest.fn().mockReturnValue(undefined),
			//start: jest.fn().mockReturnValue(Promise.resolve(undefined)),
		};
	}),
} as unknown as jest.Mocked<typeof import('../frontend')>;
