 
 
 

import { jest } from '@jest/globals';
import PromiseFunction from '../../utils/async';

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
