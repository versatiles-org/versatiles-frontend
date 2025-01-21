import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { FileDB } from './filedb';
import { basename, relative, resolve } from 'node:path';

export interface StaticFileDBConfig {
	type: 'static';
	path: string;
}

export class StaticFileDB extends FileDB {
	/**
	 * Constructs a FileSystem instance optionally with an existing map of files.
	 * 
	 * @param files - An optional map of files to initialize the file system.
	 */
	public static async build(config: StaticFileDBConfig, frontendFolder: string): Promise<StaticFileDB> {
		const path = resolve(frontendFolder, config.path);
		const db = new StaticFileDB();
		db.addPath(path, path);
		return db;
	}

	private addPath(path: string, dir: string): void {
		if (!existsSync(path)) throw Error(`path "${path}" does not exist`);
		if (basename(path).startsWith('.')) return; // Skip hidden files and directories.

		const stat = statSync(path);
		if (stat.isDirectory()) {
			readdirSync(path).forEach(name => {
				this.addPath(resolve(path, name), dir);
			});
		} else {
			this.addBufferAsFile(
				relative(dir, path),
				stat.mtimeMs,
				readFileSync(path),
			);
		}
	}
}
