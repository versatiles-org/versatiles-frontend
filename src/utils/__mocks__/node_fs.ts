/* eslint-disable @typescript-eslint/consistent-type-imports */

import { jest } from '@jest/globals';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const originalFs = await import('node:fs');

export const mockFs = {
	...originalFs.default,
	createReadStream: jest.fn(originalFs.default.createReadStream),
	createWriteStream: jest.fn(() => {
		const filename = resolve(tmpdir(), Math.random().toString(36) + '.tmp');
		const stream = originalFs.createWriteStream(filename);
		return stream;
	}),
	existsSync: jest.fn(originalFs.default.existsSync),
	mkdirSync: jest.fn().mockReturnValue(undefined),
	rmSync: jest.fn().mockReturnValue(undefined),
	writeFileSync: jest.fn().mockReturnValue(undefined),
} as unknown as jest.Mocked<typeof import('node:fs')>;
