import type { Curl as CurlType } from '../curl';
import { StaticFileDB } from '../../files/__mocks__/filedb-static';
import { vi } from 'vitest';

type CurlInstance = CurlType;

export const curlCalls: string[] = [];

// A simple class-based mock so `new Curl(...)` works in production code.
export class Curl {
	url: string;
	fileDB: typeof StaticFileDB;
	ungzipUntar: CurlInstance['ungzipUntar'];
	save: CurlInstance['save'];
	unzip: CurlInstance['unzip'];
	getBuffer: CurlInstance['getBuffer'];

	constructor(fileDB: typeof StaticFileDB, url: string) {
		this.fileDB = fileDB;
		this.url = url;
		curlCalls.push(url);

		this.ungzipUntar = vi.fn(async () => {
			// no-op in tests
		}) as CurlInstance['ungzipUntar'];

		this.save = vi.fn(async () => {
			// no-op in tests
		}) as CurlInstance['save'];

		this.unzip = vi.fn(async () => {
			// no-op in tests
		}) as CurlInstance['unzip'];

		this.getBuffer = vi.fn(async () => Buffer.from('mocked buffer')) as CurlInstance['getBuffer'];
	}
}

// Optional: a shared mocked instance if tests want a ready-made Curl object.
export const mockedCurlInstance = new Curl(new StaticFileDB(), 'mocked url');

export default Curl;
