import { jest } from '@jest/globals';
import { mockFetchResponse } from '../utils/__mocks__/global_fetch';
import type { DevConfig, Server as ServerType } from './server';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Frontend as FrontendType } from '../frontend/frontend';
import { FileDBs } from '../files/__mocks__/filedbs';


const { mockExpress } = await import('../utils/__mocks__/express');
jest.unstable_mockModule('express', () => mockExpress);
const express = (await import('express')).default;

await import('../utils/__mocks__/cache');

const { Server, parseDevConfig } = await import('./server');
const { Frontend } = await import('../frontend/__mocks__/frontend');

describe('Server', () => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let server: ServerType;
	let mockedFrontend: FrontendType;
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

		const fileDBs = new FileDBs({ all: { 'existingFile.txt': 'file content' } });
		const frontendConfig = { name: 'test', fileDBs: ['all'] };
		mockedFrontend = new Frontend(fileDBs, frontendConfig);

		server = new Server(mockedFrontend, {
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

describe('parseDevConfig', () => {
	test('should return an empty config if no properties are provided', () => {
		const input = {};
		const result = parseDevConfig(input);
		expect(result).toEqual({});
	});

	test('should throw an error if input is not an object', () => {
		const inputs = [null, undefined, 42, 'string', true];
		for (const input of inputs) {
			expect(() => parseDevConfig(input)).toThrow("Invalid 'dev' property, must be an object");
		}
	});

	test('should throw an error if proxy is not an array', () => {
		const input = { proxy: 'invalid' };
		expect(() => parseDevConfig(input)).toThrow("Invalid 'proxy' configuration, each proxy must be an object with 'from' and 'to' string properties");
	});

	test('should throw an error if proxy array contains invalid objects', () => {
		const invalidProxies = [
			{ from: '/api' }, // Missing 'to'
			{ to: '/target' }, // Missing 'from'
			{ from: '/api', to: 42 }, // 'to' is not a string
			'not an object',
		];

		for (const invalidProxy of invalidProxies) {
			const input = { proxy: [invalidProxy] };
			expect(() => parseDevConfig(input)).toThrow("Invalid 'proxy' configuration, each proxy must be an object with 'from' and 'to' string properties");
		}
	});

	test('should correctly parse a valid proxy configuration', () => {
		const input = {
			proxy: [
				{ from: '/api', to: 'http://localhost:3000/api' },
				{ from: '/assets', to: 'http://localhost:3000/assets' },
			],
		};

		const expectedOutput: DevConfig = {
			proxy: [
				{ from: '/api', to: 'http://localhost:3000/api' },
				{ from: '/assets', to: 'http://localhost:3000/assets' },
			],
		};

		const result = parseDevConfig(input);
		expect(result).toEqual(expectedOutput);
	});

	test('should handle an empty proxy array', () => {
		const input = { proxy: [] };
		const expectedOutput: DevConfig = { proxy: [] };
		const result = parseDevConfig(input);
		expect(result).toEqual(expectedOutput);
	});
});