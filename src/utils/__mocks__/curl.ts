import type { Curl } from '../curl';
import { MockedFileDB } from '../../files/__mocks__/filedb';
import { jest } from '@jest/globals';

export const mockedCurlInstance = jest.mocked({
	url: 'mocked url',
	fileDB: new MockedFileDB(),
	ungzipUntar: jest.fn(async () => { }),
	save: jest.fn(async () => { }),
	unzip: jest.fn(async () => { }),
	getBuffer: jest.fn(async () => Buffer.from('mocked buffer')),
}) as unknown as jest.Mocked<Curl>;

export const MockedCurl = jest.fn((fileDB: MockedFileDB, url: string) => mockedCurlInstance);

jest.unstable_mockModule('../utils/curl', () => ({ Curl: MockedCurl }));
