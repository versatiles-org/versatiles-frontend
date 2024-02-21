/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */

import { jest } from '@jest/globals';
import { mockFetchResponse } from './__mocks__/global_fetch';

const { cache } = await import('./__mocks__/cache');
const { Curl } = await import('./curl');
const { FileSystem } = await import('./file_system');

describe('Curl', () => {
	let curl: InstanceType<typeof Curl>;
	const mockFileSystem = new FileSystem();
	const testUrl = 'http://example.com/resource.tar.gz';
	const testFolder = '/test/folder';
	const testFilename = 'resource.tar.gz';
	const testGzipTar = Buffer.from('H4sIAOVA1WUCA+3TQQrDIBCFYY/iCcqMVXOeUCKR2k1iocevSaCr0l1DQ/8P4SHMQtGXchn0VB/VfI+IRO/tkl0Ma4rb9hsNVn2IwZ2jSmdFvXdirJgd3OfaT+0ot3wZ+6FcpyGXd3NtLKXPl2zsKw+ijnm2baXlHxj8m+Xd3S/1X3Xtv3r6v3f/HXUAAAAAAAAAAAAAAAA4nCfDsvruACgAAA==', 'base64');
	const testZip = Buffer.from('UEsDBAoAAgAAABwHVVgLvTyiDQAAAA0AAAAJABwAZmlsZTEudHh0VVQJAANHPNVlSDzVZXV4CwABBPUBAAAEFAAAAHRoaXMgaXMgZmlsZTFQSwMECgACAAAAHQdVWLHsNTsNAAAADQAAAAkAHABmaWxlMi50eHRVVAkAA0k81WVLPNVldXgLAAEE9QEAAAQUAAAAdGhpcyBpcyBmaWxlMlBLAQIeAwoAAgAAABwHVVgLvTyiDQAAAA0AAAAJABgAAAAAAAEAAACkgQAAAABmaWxlMS50eHRVVAUAA0c81WV1eAsAAQT1AQAABBQAAABQSwECHgMKAAIAAAAdB1VYsew1Ow0AAAANAAAACQAYAAAAAAABAAAApIFQAAAAZmlsZTIudHh0VVQFAANJPNVldXgLAAEE9QEAAAQUAAAAUEsFBgAAAAACAAIAngAAAKAAAAAAAA==', 'base64');

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();
		// Initialize Curl with mocked FileSystem and URL
		curl = new Curl(mockFileSystem, testUrl);
		jest.spyOn(mockFileSystem, 'addFile');
	});

	it('should fetch and ungzip/untar a resource', async () => {
		mockFetchResponse(testGzipTar);
		await curl.ungzipUntar(testFolder);

		expect(cache).toHaveBeenCalledTimes(1);
		expect(cache).toHaveBeenCalledWith(`getBuffer:${testUrl}`, expect.any(Function));

		expect(mockFileSystem.addFile).toHaveBeenCalledTimes(2);
		expect(mockFileSystem.addFile).toHaveBeenNthCalledWith(1, '/test/file1.txt', 1708473415000, expect.any(Buffer));
		expect(mockFileSystem.addFile).toHaveBeenNthCalledWith(2, '/test/file2.txt', 1708473417000, expect.any(Buffer));
	});

	it('should save a resource directly to a file', async () => {
		await curl.save(testFilename);

		// Verify cache and FileSystem interactions
		expect(cache).toHaveBeenCalledWith(`getBuffer:${testUrl}`, expect.any(Function));
		expect(mockFileSystem.addFile).toHaveBeenCalledWith(testFilename, expect.any(Number), expect.any(Buffer));
	});

	it('should fetch, unzip, and save contents based on filter callback', async () => {
		mockFetchResponse(testZip);

		await curl.unzip(filename => filename.endsWith('.txt') ? `/unzipped/${filename}` : false);

		expect(cache).toHaveBeenCalledTimes(1);
		expect(cache).toHaveBeenCalledWith(`getBuffer:${testUrl}`, expect.any(Function));

		expect(mockFileSystem.addFile).toHaveBeenCalledTimes(2);
		expect(mockFileSystem.addFile).toHaveBeenNthCalledWith(1, '/unzipped/file1.txt', 1820, expect.any(Buffer));
		expect(mockFileSystem.addFile).toHaveBeenNthCalledWith(2, '/unzipped/file2.txt', 1821, expect.any(Buffer));
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
