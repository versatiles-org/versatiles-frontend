import { jest } from '@jest/globals';
import PromiseFunction from '../../utils/async';
import type { FileSystem } from '../../filesystem/file_system';

export const mockAssets: jest.Mocked<typeof import('../../frontend/assets')> = {
	loadAssets: jest.fn((fileSystem: FileSystem): PromiseFunction => {
		return PromiseFunction.single(async () => { }, async () => {
			fileSystem.addBufferAsFile('index.html', 42, Buffer.from('file content'));
		});
	}),
};
