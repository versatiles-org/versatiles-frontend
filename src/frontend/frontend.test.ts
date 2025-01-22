import { jest } from '@jest/globals';
import { FrontendConfig } from './frontend';

await import('../utils/__mocks__/cache');

const { createWriteStream } = await import('../utils/__mocks__/node_fs');

const { FileDBs, loadFileDBConfigs } = await import('../files/__mocks__/filedbs');
const { Frontend, } = await import('./frontend');
const { loadFrontendConfigs } = await import('./load');
const { generateFrontends } = await import('./generate');
const progress = (await import('../utils/progress')).default;
const PromiseFunction = (await import('../utils/async')).default;

progress.disable();

if (!jest.isMockFunction(createWriteStream)) throw Error();

let fileDBConfig = await loadFileDBConfigs();

describe('Frontend class', () => {
	let mockFileDBs: InstanceType<typeof FileDBs>;
	const testConfig = {
		name: 'frontend',
		fileDBs: ['all'],
		ignore: ['ignore-me.txt'],
	} as const satisfies FrontendConfig;

	beforeEach(() => {
		jest.clearAllMocks(); // Clear mocks before each test
		mockFileDBs = new FileDBs(
			Object.fromEntries(
				Object.entries(fileDBConfig)
					.map(([name, config]) => {
						return [name, { [name + '.html']: 'html content of ' + name }];
					})
			)
		);
	});

	it('should create gzip-compressed tarball', async () => {
		const frontend = new Frontend(mockFileDBs, testConfig);

		await frontend.saveAsTarGz('/tmp/');

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream).toHaveBeenCalledWith('/tmp/frontend.tar.gz');
	});

	it('should create brotli tarball', async () => {
		const frontend = new Frontend(mockFileDBs, testConfig);

		await frontend.saveAsBrTarGz('/tmp/');

		expect(createWriteStream).toHaveBeenCalledTimes(1);
		expect(createWriteStream).toHaveBeenCalledWith('/tmp/frontend.br.tar.gz');
	});

	it('loads frontend configurations correctly', async () => {
		const configs = await loadFrontendConfigs();
		expect(configs).toContainEqual(expect.objectContaining(
			{ name: expect.any(String), fileDBs: expect.any(Array) },
		));
	});

	it('generates frontends', async () => {
		await PromiseFunction.run(await generateFrontends(mockFileDBs, '/tmp/'));

		expect(createWriteStream).toHaveBeenCalledTimes(6);

		const calledFilenames = createWriteStream.mock.calls.map(call => call[0] as string).sort();
		expect(calledFilenames).toStrictEqual([
			'/tmp/frontend-dev.br.tar.gz',
			'/tmp/frontend-dev.tar.gz',
			'/tmp/frontend-min.br.tar.gz',
			'/tmp/frontend-min.tar.gz',
			'/tmp/frontend.br.tar.gz',
			'/tmp/frontend.tar.gz',
		]);
	});
});
