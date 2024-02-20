/* eslint-disable @typescript-eslint/naming-convention */
import type { Curl as CurlType } from '../curl.js';
import type { FileSystem } from '../file_system.js';
import { jest } from '@jest/globals';

export type CurlInstance = InstanceType<typeof CurlType> & { url: string; fileSystem: FileSystem };

jest.unstable_mockModule('./curl.js', () => ({
	Curl: jest.fn((fileSystem: FileSystem, url: string) => ({
		url: url,
		fileSystem: fileSystem,
		ungzipUntar: jest.fn().mockReturnValue(Promise.resolve()),
		save: jest.fn().mockReturnValue(Promise.resolve()),
		unzip: jest.fn().mockReturnValue(Promise.resolve()),
		getBuffer: jest.fn().mockReturnValue(Promise.resolve(Buffer.from('mocked buffer'))),
	})),
}));

const { Curl } = await import('../curl.js');

export { Curl };
