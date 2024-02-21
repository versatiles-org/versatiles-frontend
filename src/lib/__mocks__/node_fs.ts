import { jest } from '@jest/globals';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const originalFs = await import('node:fs');

const instance = {
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
};

jest.unstable_mockModule('node:fs', () => ({ ...instance, default: instance }));

const fs = (await import('node:fs')) as jest.Mocked<typeof originalFs>;

if (!jest.isMockFunction(fs.createReadStream)) throw Error();
if (!jest.isMockFunction(fs.createWriteStream)) throw Error();
if (!jest.isMockFunction(fs.existsSync)) throw Error();
if (!jest.isMockFunction(fs.mkdirSync)) throw Error();
if (!jest.isMockFunction(fs.rmSync)) throw Error();
if (!jest.isMockFunction(fs.writeFileSync)) throw Error();

export default fs;
export const { createReadStream, createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } = fs;
