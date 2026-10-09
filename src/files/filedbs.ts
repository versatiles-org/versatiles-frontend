import { FileDB } from './filedb';
import { StaticFileDB } from './filedb-static';
import { ExternalFileDB } from './filedb-external';
import { NpmFileDB } from './filedb-npm';
import type { SourceConfig } from './source_config';

/**
 * The file databases of all sources, by the name of the source.
 */
export class FileDBs {
	fileDBs = new Map<string, FileDB>();
	constructor() {}
	set(name: string, fileDB: FileDB): void {
		this.fileDBs.set(name, fileDB);
	}
	get(name: string): FileDB {
		const fileDB = this.fileDBs.get(name);
		if (fileDB === undefined) throw Error(`file db not found: ${name}`);
		return fileDB;
	}
	values(): MapIterator<FileDB> {
		return this.fileDBs.values();
	}
	enterWatchMode(): void {
		for (const fileDB of this.fileDBs.values()) fileDB.enterWatchMode();
	}
}

/**
 * Loads the files of a source into a new file database of the matching kind.
 *
 * @param frontendFolder - The folder of the static sources, which their paths are relative to.
 */
export async function createFileDB(config: SourceConfig, frontendFolder: string): Promise<FileDB> {
	switch (config.type) {
		case 'static':
			return StaticFileDB.build(config, frontendFolder);
		case 'external':
			return ExternalFileDB.build(config);
		case 'npm':
			return NpmFileDB.build(config);
		default:
			// @ts-expect-error Just to be sure
			throw Error(`unknown file db type: ${config.type}`);
	}
}
