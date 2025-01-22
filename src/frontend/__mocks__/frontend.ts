import type { Frontend } from '../frontend';
import { jest } from '@jest/globals';
import PromiseFunction from '../../utils/async';
import { MockedFileDBs } from '../../files/__mocks__/filedbs';

const originalModule = await import('../../frontend/frontend');

export const generateFrontends = jest.fn((): PromiseFunction => {
	return PromiseFunction.single(async () => { }, async () => { });
});

export const loadFrontendConfigs = jest.fn(originalModule.loadFrontendConfigs);

export type MockedFrontend = InstanceType<typeof MockedFrontend>;
export const MockedFrontend = jest.fn(() => {
	const knownFiles = new Map<string, string>();
	const me = {
		fileDBs: new MockedFileDBs(),
		saveAsTarGz: jest.fn(async () => { }),
		saveAsBrTarGz: jest.fn(async () => { }),
		getFile: jest.fn((path: string) => {
			const content = knownFiles.get(path);
			return content ? Buffer.from(content) : null
		}),
		iterate: jest.fn(() => (new Map()).values()),
		ignoreFilter: jest.fn(() => true),
		config: { name: 'example', fileDBs: [] },
	} as const satisfies Frontend;
	return {
		...me,
		addFile: (filename: string, content: string) => knownFiles.set(filename, content),
	};
});
