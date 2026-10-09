import { vi, describe, it, expect, beforeEach } from 'vitest';
import { join } from 'path';
import { gunzipSync, gzipSync, zstdCompressSync } from 'zlib';
import tarStream from 'tar-stream';

// Mock cache module
vi.mock('../utils/cache', () => ({
	cache: vi.fn(async (_action: string, _key: string, cbBuffer: () => Promise<Buffer>) => cbBuffer()),
}));

const { cache } = await import('../utils');
const { Archive } = await import('./archive');

// Mock fetch helper
function mockFetchResponse(data: unknown, status = 200): void {
	// @ts-expect-error mocking global
	global.fetch = vi.fn(async () =>
		Promise.resolve({
			arrayBuffer: async () => Promise.resolve(getAsBuffer()),
			headers: new Headers({ 'content-type': 'text/plain' }),
			json: async () => Promise.resolve(getAsJSON()),
			status,
		})
	);

	function getAsBuffer(): Buffer {
		if (Buffer.isBuffer(data)) return data;
		if (typeof data === 'string') return Buffer.from(data);
		throw Error();
	}

	function getAsJSON(): unknown {
		return data;
	}
}

// Build a gzipped tarball from a list of entries; entries with content are regular files.
async function createTarGz(
	entries: (Partial<tarStream.Header> & { name: string; content?: string })[]
): Promise<Buffer> {
	const pack = tarStream.pack();
	for (const { content, ...header } of entries) {
		if (content == null) pack.entry(header);
		else pack.entry(header, content);
	}
	pack.finalize();
	const chunks: Buffer[] = [];
	for await (const chunk of pack) chunks.push(chunk as Buffer);
	return gzipSync(Buffer.concat(chunks));
}

describe('Archive', () => {
	let archive: InstanceType<typeof Archive>;
	// Receives the extracted files.
	const onFile = vi.fn<(path: string, content: Buffer) => void>();
	const testUrl = 'https://example.com/resource.tar.gz';
	const testFolder = '/test/folder';
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

		archive = new Archive(testUrl);
	});

	it('should fetch and ungzip/untar a resource', async () => {
		mockFetchResponse(testGzipTar);
		await archive.ungzipUntar((f) => join(testFolder, f), onFile);

		expect(cache).toHaveBeenCalledTimes(1);
		expect(cache).toHaveBeenCalledWith('getBuffer', testUrl, expect.any(Function));

		expect(onFile).toHaveBeenCalledTimes(2);
		expect(onFile).toHaveBeenNthCalledWith(1, '/test/folder/file1.txt', expect.any(Buffer));
		expect(onFile).toHaveBeenNthCalledWith(2, '/test/folder/file2.txt', expect.any(Buffer));
	});

	it('should fetch and unzstd/untar a resource', async () => {
		// The same tarball as testGzipTar, compressed with zstd instead of gzip.
		mockFetchResponse(zstdCompressSync(gunzipSync(testGzipTar)));
		await archive.unzstdUntar((f) => join(testFolder, f), onFile);

		expect(cache).toHaveBeenCalledWith('getBuffer', testUrl, expect.any(Function));
		expect(onFile).toHaveBeenCalledTimes(2);
		expect(onFile).toHaveBeenNthCalledWith(1, '/test/folder/file1.txt', expect.any(Buffer));
		expect(onFile).toHaveBeenNthCalledWith(2, '/test/folder/file2.txt', expect.any(Buffer));
	});

	it('should reject a gzipped tarball in unzstdUntar', async () => {
		mockFetchResponse(testGzipTar);
		await expect(archive.unzstdUntar((f) => join(testFolder, f), onFile)).rejects.toThrow();
	});

	it('should fetch, unzip, and save contents based on filter callback', async () => {
		mockFetchResponse(testZip);

		await archive.unzip((filename) => filename.endsWith('.txt') && join('/unzipped/', filename), onFile);

		expect(cache).toHaveBeenCalledTimes(1);
		expect(cache).toHaveBeenCalledWith('getBuffer', testUrl, expect.any(Function));

		expect(onFile).toHaveBeenCalledTimes(2);
		expect(onFile).toHaveBeenNthCalledWith(1, '/unzipped/file1.txt', expect.any(Buffer));
		expect(onFile).toHaveBeenNthCalledWith(2, '/unzipped/file2.txt', expect.any(Buffer));
	});

	it('should return a buffer from getBuffer method', async () => {
		mockFetchResponse('mocked response');
		const buffer = await archive.getBuffer();

		expect(buffer).toBeInstanceOf(Buffer);
		expect(buffer.toString()).toEqual('mocked response');
		// Ensure the fetch was called with the correct arguments
		expect(fetch).toHaveBeenCalledWith(testUrl, expect.objectContaining({ redirect: 'follow' }));
	});

	it('should throw an error for non-HTTPS URLs in getBuffer', async () => {
		const insecure = new Archive('http://insecure-url.com/resource');

		await expect(insecure.getBuffer()).rejects.toThrow(
			'only secure https:// urls are supported, got: http://insecure-url.com/resource'
		);
	});

	it('should throw an error when HTTP response is not 200', async () => {
		mockFetchResponse('Error', 404);

		await expect(archive.getBuffer()).rejects.toThrow(`url "${testUrl}" returned error 404`);
	});

	it('should autodrain unzip entries when filter returns false', async () => {
		mockFetchResponse(testZip);

		// Filter that rejects all files
		await archive.unzip(() => false, onFile);

		// Should complete without error, but no files should be saved
		expect(onFile).not.toHaveBeenCalled();
	});

	describe('ungzipUntar with links', () => {
		const linkTarGz = createTarGz([
			{ name: 'dir/a.txt', content: 'content of a' },
			{ name: 'dir/hardlink.txt', type: 'link', linkname: 'dir/a.txt' },
			{ name: 'dir/symlink.txt', type: 'symlink', linkname: 'a.txt' },
			{ name: 'dir/sub/symlink-up.txt', type: 'symlink', linkname: '../a.txt' },
			{ name: 'chain.txt', type: 'symlink', linkname: 'dir/hardlink.txt' },
			{ name: 'dir/dangling.txt', type: 'link', linkname: 'dir/missing.txt' },
			{ name: 'dir/escaping.txt', type: 'symlink', linkname: '../../etc/passwd' },
			{ name: 'dir/absolute.txt', type: 'link', linkname: '/etc/passwd' },
			{ name: 'cycle-a.txt', type: 'symlink', linkname: 'cycle-b.txt' },
			{ name: 'cycle-b.txt', type: 'symlink', linkname: 'cycle-a.txt' },
			{ name: 'forward.txt', type: 'symlink', linkname: 'later.txt' },
			{ name: 'later.txt', content: 'content of later' },
		]);

		async function untar(mapName: (name: string) => string | false): Promise<Map<string, Buffer>> {
			mockFetchResponse(await linkTarGz);
			const files = new Map<string, Buffer>();
			await new Archive(testUrl).ungzipUntar(mapName, (path, content) => files.set(path, content));
			return files;
		}

		it('saves links with the content of their target and skips bad ones', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			const files = await untar((f) => join('out', f));

			expect(Object.fromEntries([...files].map(([name, content]) => [name, content.toString()]))).toStrictEqual({
				'out/dir/a.txt': 'content of a',
				'out/later.txt': 'content of later',
				'out/dir/hardlink.txt': 'content of a',
				'out/dir/symlink.txt': 'content of a',
				'out/dir/sub/symlink-up.txt': 'content of a',
				'out/chain.txt': 'content of a',
				'out/forward.txt': 'content of later',
			});

			// Links share the target's buffer instead of copying it.
			const target = files.get('out/dir/a.txt');
			expect(files.get('out/dir/hardlink.txt')).toBe(target);
			expect(files.get('out/chain.txt')).toBe(target);

			expect(warn.mock.calls.map((call) => call[0]).sort()).toStrictEqual([
				'Skipping dangling link "cycle-a.txt" -> "cycle-b.txt"',
				'Skipping dangling link "cycle-b.txt" -> "cycle-a.txt"',
				'Skipping dangling link "dir/dangling.txt" -> "dir/missing.txt"',
				'Skipping unsafe link "dir/absolute.txt" -> "/etc/passwd" (escapes the archive)',
				'Skipping unsafe link "dir/escaping.txt" -> "../../etc/passwd" (escapes the archive)',
			]);
			warn.mockRestore();
		});

		it('runs link paths through the filter and resolves targets the filter skipped', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			const files = await untar((f) => (f === 'dir/a.txt' || f.includes('dangling') ? false : join('out', f)));

			expect(files.has('out/dir/a.txt')).toBe(false);
			expect(files.get('out/dir/hardlink.txt')?.toString()).toBe('content of a');
			expect(files.has('out/dir/dangling.txt')).toBe(false);
			// A link the filter rejects is skipped silently, like a regular file.
			expect(warn.mock.calls.some((call) => String(call[0]).includes('dir/dangling.txt'))).toBe(false);
			warn.mockRestore();
		});
	});

	it('should filter files in ungzipUntar when filter returns false', async () => {
		mockFetchResponse(testGzipTar);

		// Filter that only accepts file1.txt
		await archive.ungzipUntar((filename) => {
			if (filename.includes('file1.txt')) return join(testFolder, filename);
			return false;
		}, onFile);

		// Should only save one file
		expect(onFile).toHaveBeenCalledTimes(1);
		expect(onFile).toHaveBeenCalledWith('/test/folder/file1.txt', expect.any(Buffer));
	});
});
