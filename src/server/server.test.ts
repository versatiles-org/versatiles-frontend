/* eslint-disable @typescript-eslint/naming-convention */
import { jest } from '@jest/globals';
import { mockFetchResponse } from '../lib/__mocks__/global_fetch';
import type { Server as ServerType } from './server';
import type { File as FileType, FileSystem as FileSystemType } from '../lib/file_system';
import type { IncomingMessage, ServerResponse } from 'http';


const { mockExpress } = await import('../lib/__mocks__/express');
jest.unstable_mockModule('express', () => mockExpress);
const express = (await import('express')).default;

const { mockCache } = await import('../utils/__mocks__/cache');
jest.unstable_mockModule('../utils/cache', () => mockCache);
const { } = await import('../utils/cache');

const { File, FileSystem } = await import('../lib/file_system');
const { Server } = await import('./server');

describe('Server', () => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let server: ServerType;
	let mockFileSystem: FileSystemType;
	let getFunction: (req: IncomingMessage, res: ServerResponse) => void;

	async function fakeRequest(path: string): Promise<{
		status: jest.Mock<(status: number) => void>;
		end: jest.Mock<(data: Buffer | string) => void>;
	}> {
		return new Promise(resolve => {
			const response = {
				status: jest.fn().mockReturnThis(), end: jest.fn(() => {
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

		server = new Server(mockFileSystem, {
			proxy: [{ from: '/api', to: 'http://example.com/api' }],
		});

		const app = express();
		// eslint-disable-next-line @typescript-eslint/prefer-destructuring
		getFunction = jest.mocked(app.get).mock.calls[0][1];
	});

	it('should serve files from the file system', async () => {
		const res = await fakeRequest('/existingFile.txt');

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.end).toHaveBeenCalledWith(Buffer.from('file content'));
	});

	it('should return 404 for non-existing files', async () => {
		const res = await fakeRequest('/nonExistingFile.txt');

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.end).toHaveBeenCalledWith(expect.stringContaining('not found'));
	});

	it('should proxy requests based on configuration', async () => {
		const res = await fakeRequest('/api/data');

		expect(fetch).toHaveBeenCalledWith('http://example.com/api/data');
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.end).toHaveBeenCalledWith(Buffer.from('response'));
	});
});
