import type { Curl as CurlType } from '../curl';
import type { FileSystem } from '../../files/filedb';
import { jest } from '@jest/globals';

export type CurlInstance = InstanceType<typeof CurlType> & { url: string; fileSystem: FileSystem };

export const mockCurl = {
	Curl: jest.fn((fileSystem: FileSystem, url: string) => ({
		url: url,
		fileSystem: fileSystem,
		ungzipUntar: jest.fn().mockReturnValue(Promise.resolve()),
		save: jest.fn().mockReturnValue(Promise.resolve()),
		unzip: jest.fn().mockReturnValue(Promise.resolve()),
		getBuffer: jest.fn().mockReturnValue(Promise.resolve(Buffer.from('mocked buffer'))),
	})),
} as unknown as jest.Mocked<typeof import('../curl')>;
