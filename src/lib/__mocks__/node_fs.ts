
import { jest } from '@jest/globals';

const originalFs = await import('node:fs');

const instance = {
	...originalFs.default,
	createWriteStream: jest.fn().mockReturnValue({
		on: jest.fn().mockReturnThis(),
		end: jest.fn().mockReturnThis(),
		close: jest.fn(),
	}),
	writeFileSync: jest.fn().mockReturnValue(undefined),
};

jest.unstable_mockModule('node:fs', () => ({ ...instance, default: instance }));

const fs = (await import('node:fs')) as jest.Mocked<typeof originalFs>;

if (!jest.isMockFunction(fs.createWriteStream)) throw Error();

export default fs;
