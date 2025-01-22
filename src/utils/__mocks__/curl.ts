import type { Curl as CurlType } from '../curl';
import { StaticFileDB } from '../../files/__mocks__/filedb-static';
import { jest } from '@jest/globals';

export const mockedCurlInstance = jest.mocked({
	url: 'mocked url',
	fileDB: new StaticFileDB(),
	ungzipUntar: jest.fn(async () => { }),
	save: jest.fn(async () => { }),
	unzip: jest.fn(async () => { }),
	getBuffer: jest.fn(async () => Buffer.from('mocked buffer')),
}) as unknown as jest.Mocked<CurlType>;

export const Curl = jest.fn((_fileDB: StaticFileDB, _url: string) => mockedCurlInstance);

const mockedModule = { Curl };

try { jest.unstable_mockModule('./curl', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../curl', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./utils/curl', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../utils/curl', () => mockedModule) } catch (_) { /* */ }
