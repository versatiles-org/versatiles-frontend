/* eslint-disable @typescript-eslint/naming-convention */
import type { Curl as CurlType } from '../curl.js';
import { jest } from '@jest/globals';
import type { FileSystem } from '../file_system.js';

export type CurlInstance = InstanceType<typeof CurlType> & { url: string; fileSystem: FileSystem };

jest.unstable_mockModule('./curl.js', () => ({
	Curl: jest.fn((fileSystem: FileSystem, url: string) => ({
		url: url,
		fileSystem: fileSystem,
		ungzipUntar: jest.fn<CurlInstance['ungzipUntar']>().mockReturnValue(Promise.resolve()),
		save: jest.fn<CurlInstance['save']>().mockReturnValue(Promise.resolve()),
		unzip: jest.fn<CurlInstance['unzip']>().mockReturnValue(Promise.resolve()),
		getBuffer: jest.fn<CurlInstance['getBuffer']>().mockReturnValue(Promise.resolve(Buffer.from('mocked buffer'))),
	})),
}));

const { Curl } = await import('../curl.js');

export { Curl };
