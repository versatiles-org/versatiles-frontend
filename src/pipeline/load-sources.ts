import { PromiseFunction } from '../async-progress';
import { createFileDB, FileDBs } from '../sources/file-dbs';
import type { SourceConfig } from '../sources/source-config';

/**
 * Loads every file source into the file databases, in parallel, with a progress label each.
 *
 * @param staticFolder - The folder of the static sources, which their paths are relative to.
 */
export function loadSources(
	fileDBs: FileDBs,
	sourceConfigs: Record<string, SourceConfig>,
	staticFolder: string
): PromiseFunction {
	return PromiseFunction.wrapProgress(
		'load file sources',
		PromiseFunction.parallel(
			...Object.entries(sourceConfigs).map(([name, config]) =>
				PromiseFunction.wrapAsync(name, 1, async () => {
					fileDBs.set(name, await createFileDB(config, staticFolder));
				})
			)
		)
	);
}
