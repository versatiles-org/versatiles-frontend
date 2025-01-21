import { jest } from '@jest/globals';
import { mockFetchResponse } from '../utils/__mocks__/global_fetch';
import type { Server as ServerType } from './server';
import type { File as FileType } from '../files/file';
import type { FileSystem as FileSystemType } from '../files/filedb';
import type { IncomingMessage, ServerResponse } from 'http';


const { mockExpress } = await import('../utils/__mocks__/express');
jest.unstable_mockModule('express', () => mockExpress);
const express = (await import('express')).default;

const { mockCache } = await import('../utils/__mocks__/cache');
jest.unstable_mockModule('../utils/cache', () => mockCache);
await import('../utils/cache');

const { File } = await import('../files/file');
const { FileSystem } = await import('../files/filedb');
const { Server } = await import('./server');
const { Frontend } = await import('../frontend/frontend');

describe('Server', () => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let server: ServerType;
	let mockFileSystem: FileSystemType;
	let getFunction: (req: IncomingMessage, res: ServerResponse) => void;

	async function fakeRequest(path: string): Promise<{
		header: jest.Mock<(key: string, value: string) => void>;
		status: jest.Mock<(status: number) => void>;
		end: jest.Mock<(data: Buffer | string) => void>;
	}> {
		return new Promise(resolve => {
			const response = {
				status: jest.fn().mockReturnThis(),
				header: jest.fn().mockReturnThis(),
				end: jest.fn(() => {
					resolve(response);
				}),
			};
			getFunction(
				{ path } as unknown as IncomingMessage,
				response as unknown as ServerResponse,
			);
		});
	}

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Create new mocks
		mockFetchResponse('response');

		mockFileSystem = new FileSystem(new Map<string, FileType>([
			['existingFile.txt', new File('existingFile.txt', 12, Buffer.from('file content'))],
		]));
		const mockFrontend = new Frontend(mockFileSystem, { name: 'example', include: [] }, '');

		server = new Server(mockFrontend, {
			proxy: [{ from: '/api', to: 'http://example.com/api' }],
		});

		const app = express();

		getFunction = jest.mocked(app.get).mock.calls[0][1];
	});

	it('should serve files from the file system', async () => {
		const res = await fakeRequest('/existingFile.txt');

		expect(res.header).toHaveBeenCalledTimes(1);
		expect(res.header).toHaveBeenCalledWith('content-type', 'text/plain');

		expect(res.status).toHaveBeenCalledTimes(1);
		expect(res.status).toHaveBeenCalledWith(200);

		expect(res.end).toHaveBeenCalledTimes(1);
		expect(res.end).toHaveBeenCalledWith(Buffer.from('file content'));
	});

	it('should return 404 for non-existing files', async () => {
		const res = await fakeRequest('/nonExistingFile.txt');

		expect(res.header).toHaveBeenCalledTimes(0);

		expect(res.status).toHaveBeenCalledTimes(1);
		expect(res.status).toHaveBeenCalledWith(404);

		expect(res.end).toHaveBeenCalledTimes(1);
		expect(res.end).toHaveBeenCalledWith(expect.stringContaining('not found'));
	});

	it('should proxy requests based on configuration', async () => {
		const res = await fakeRequest('/api/data');

		expect(fetch).toHaveBeenCalledWith('http://example.com/api/data');

		expect(res.header).toHaveBeenCalledTimes(1);
		expect(res.header).toHaveBeenCalledWith('content-type', 'text/plain');

		expect(res.status).toHaveBeenCalledTimes(1);
		expect(res.status).toHaveBeenCalledWith(200);

		expect(res.end).toHaveBeenCalledTimes(1);
		expect(res.end).toHaveBeenCalledWith(Buffer.from('response'));
	});
});
