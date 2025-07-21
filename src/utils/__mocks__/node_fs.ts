

import { jest } from '@jest/globals';
import { tmpdir } from 'os';
import { resolve } from 'path';

const originalFs = await import('fs?' + Date.now());

const mock = {
	...originalFs,
	createReadStream: jest.fn(originalFs.createReadStream),
	createWriteStream: jest.fn(() => {
		const filename = resolve(tmpdir(), Math.random().toString(36) + '.tmp');
		const stream = originalFs.createWriteStream(filename);
		return stream;
	}),
	existsSync: jest.fn(originalFs.existsSync),
	mkdirSync: jest.fn(() => undefined),
	rmSync: jest.fn().mockReturnValue(undefined),
	writeFileSync: jest.fn().mockReturnValue(undefined),
} as const satisfies jest.Mocked<typeof import('fs')>;


export const mockFs = { ...mock, default: mock }
jest.unstable_mockModule('fs', () => mockFs);

export const createWriteStream = mock.createWriteStream;
