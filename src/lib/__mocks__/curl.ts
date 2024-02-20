/* eslint-disable @typescript-eslint/naming-convention */
import type { Curl as CurlType } from '../curl';
import type { FileSystem } from '../file_system';
import { jest } from '@jest/globals';

export type CurlInstance = InstanceType<typeof CurlType> & { url: string; fileSystem: FileSystem };

jest.unstable_mockModule('./curl', () => ({
	Curl: jest.fn((fileSystem: FileSystem, url: string) => ({
		url: url,
		fileSystem: fileSystem,
		ungzipUntar: jest.fn().mockReturnValue(Promise.resolve()),
		save: jest.fn().mockReturnValue(Promise.resolve()),
		unzip: jest.fn().mockReturnValue(Promise.resolve()),
		getBuffer: jest.fn().mockReturnValue(Promise.resolve(Buffer.from('mocked buffer'))),
	})),
}));

const { Curl } = await import('../curl');

export { Curl };
