import { File } from '../file';
import { jest } from '@jest/globals';

export type MockedFile = jest.Mock<typeof MockedFile>;
export const MockedFile = jest.fn((name: string, modificationTime: number, bufferRaw: Buffer) => {
	return jest.mocked(new File(name, modificationTime, bufferRaw));
});