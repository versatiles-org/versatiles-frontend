import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockFetchResponse } from './__mocks__/global_fetch';
import '../files/__mocks__/filedb';
import { join } from 'path';

const { cache } = await import('./__mocks__/cache');
const { FileDB } = await import('../files/filedb');
const { Curl } = await import('./curl');

describe('Curl', () => {
	let curl: InstanceType<typeof Curl>;
	// @ts-expect-error TS is not aware of the mock implementation
	const mockFileDB = new FileDB();
	const testUrl = 'http://example.com/resource.tar.gz';
	const testFolder = '/test/folder';
	const testFilename = 'resource.tar.gz';
	const testGzipTar = Buffer.from(
		'H4sIAOVA1WUCA+3TQQrDIBCFYY/iCcqMVXOeUCKR2k1iocevSaCr0l1DQ/8P4SHMQtGXchn0VB/VfI+IRO/tkl0Ma4rb9hsNVn2IwZ2jSmdFvXdirJgd3OfaT+0ot3wZ+6FcpyGXd3NtLKXPl2zsKw+ijnm2baXlHxj8m+Xd3S/1X3Xtv3r6v3f/HXUAAAAAAAAAAAAAAAA4nCfDsvruACgAAA==',
		'base64'
	);
	const testZip = Buffer.from(
		'UEsDBAoAAgAAABwHVVgLvTyiDQAAAA0AAAAJABwAZmlsZTEudHh0VVQJAANHPNVlSDzVZXV4CwABBPUBAAAEFAAAAHRoaXMgaXMgZmlsZTFQSwMECgACAAAAHQdVWLHsNTsNAAAADQAAAAkAHABmaWxlMi50eHRVVAkAA0k81WVLPNVldXgLAAEE9QEAAAQUAAAAdGhpcyBpcyBmaWxlMlBLAQIeAwoAAgAAABwHVVgLvTyiDQAAAA0AAAAJABgAAAAAAAEAAACkgQAAAABmaWxlMS50eHRVVAUAA0c81WV1eAsAAQT1AQAABBQAAABQSwECHgMKAAIAAAAdB1VYsew1Ow0AAAANAAAACQAYAAAAAAABAAAApIFQAAAAZmlsZTIudHh0VVQFAANJPNVldXgLAAEE9QEAAAQUAAAAUEsFBgAAAAACAAIAngAAAKAAAAAAAA==',
		'base64'
	);

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// Initialize Curl with mocked FileDB and URL
		curl = new Curl(mockFileDB, testUrl);
		vi.spyOn(mockFileDB, 'setFileFromBuffer');
	});

	it('should fetch and ungzip/untar a resource', async () => {
		mockFetchResponse(testGzipTar);
		await curl.ungzipUntar((f) => join(testFolder, f));

		expect(cache).toHaveBeenCalledTimes(1);
		expect(cache).toHaveBeenCalledWith('getBuffer', testUrl, expect.any(Function));

		expect(mockFileDB.setFileFromBuffer).toHaveBeenCalledTimes(2);
		expect(mockFileDB.setFileFromBuffer).toHaveBeenNthCalledWith(
			1,
			'/test/folder/file1.txt',
			1708473415000,
			expect.any(Buffer)
		);
		expect(mockFileDB.setFileFromBuffer).toHaveBeenNthCalledWith(
			2,
			'/test/folder/file2.txt',
			1708473417000,
			expect.any(Buffer)
		);
	});

	it('should save a resource directly to a file', async () => {
		await curl.save(testFilename);

		// Verify cache and FileDB interactions
		expect(cache).toHaveBeenCalledWith('getBuffer', testUrl, expect.any(Function));
		expect(mockFileDB.setFileFromBuffer).toHaveBeenCalledWith(testFilename, expect.any(Number), expect.any(Buffer));
	});

	it('should fetch, unzip, and save contents based on filter callback', async () => {
		mockFetchResponse(testZip);

		await curl.unzip((filename) => filename.endsWith('.txt') && join('/unzipped/', filename));

		expect(cache).toHaveBeenCalledTimes(1);
		expect(cache).toHaveBeenCalledWith('getBuffer', testUrl, expect.any(Function));

		expect(mockFileDB.setFileFromBuffer).toHaveBeenCalledTimes(2);
		expect(mockFileDB.setFileFromBuffer).toHaveBeenNthCalledWith(1, '/unzipped/file1.txt', 1820, expect.any(Buffer));
		expect(mockFileDB.setFileFromBuffer).toHaveBeenNthCalledWith(2, '/unzipped/file2.txt', 1821, expect.any(Buffer));
	});

	it('should return a buffer from getBuffer method', async () => {
		mockFetchResponse('mocked response');
		const buffer = await curl.getBuffer();

		expect(buffer).toBeInstanceOf(Buffer);
		expect(buffer.toString()).toEqual('mocked response');
		// Ensure the fetch was called with the correct arguments
		expect(fetch).toHaveBeenCalledWith(testUrl, { redirect: 'follow' });
	});

	// Add more tests as needed for other scenarios and edge cases
});
