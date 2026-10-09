import { PromiseFunction, progress, type ProgressLabel } from '../async-progress';
import type { FileDBs } from '../sources/file-dbs';

/**
 * Compresses the files of all file databases with brotli, showing the overall percentage.
 */
export function precompress(fileDBs: FileDBs): PromiseFunction {
	let s: ProgressLabel;
	return PromiseFunction.single(
		async () => {
			s = progress.add('precompress files');
		},
		async () => {
			s.start();
			const entries = Array.from(fileDBs.values()).map((fileDB) => ({ fileDB, sizeSum: 0, sizePos: 0 }));
			await Promise.all(
				entries.map(async (entry) => {
					await entry.fileDB.compress((sizePos, sizeSum) => {
						entry.sizeSum = sizeSum;
						entry.sizePos = sizePos;
						const allSum = entries.reduce((sum, e) => sum + e.sizeSum, 0);
						const allPos = entries.reduce((sum, e) => sum + e.sizePos, 0);
						s.updateLabel(`precompress files: ${((100 * allPos) / allSum).toFixed(0)}%`);
					});
				})
			);
			s.end();
		}
	);
}
