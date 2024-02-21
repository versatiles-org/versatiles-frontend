import { jest } from '@jest/globals';

const originalFs = await import('node:fs/promises');

const instance = {
	...originalFs.default,
	readdir: jest.fn(originalFs.default.readdir),
	rm: jest.fn().mockReturnValue(undefined),
	stat: jest.fn(originalFs.default.stat),
};

jest.unstable_mockModule('node:fs/promises', () => ({ ...instance, default: instance }));

const fs = (await import('node:fs/promises')) as jest.Mocked<typeof originalFs>;

if (!jest.isMockFunction(fs.readdir)) throw Error();
if (!jest.isMockFunction(fs.rm)) throw Error();
if (!jest.isMockFunction(fs.stat)) throw Error();

export default fs;
export const { readdir, rm, stat } = fs;
