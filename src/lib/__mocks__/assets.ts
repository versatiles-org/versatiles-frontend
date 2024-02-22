/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-empty-function */

import { jest } from '@jest/globals';
import PromiseFunction from '../async';
import type { FileSystem } from '../file_system';

export const mockAssets: jest.Mocked<typeof import('../assets')> = {
	getAssets: jest.fn((fileSystem: FileSystem): PromiseFunction => {
		return PromiseFunction.single(async () => { }, async () => {
			fileSystem.addFile('index.html', 42, Buffer.from('file content'));
		});
	}),
};
