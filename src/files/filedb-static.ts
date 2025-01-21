import { existsSync, readdirSync, readFileSync, statSync, watch } from 'node:fs';
import { FileDB } from './filedb';
import { basename, relative, resolve } from 'node:path';

export interface StaticFileDBConfig {
	type: 'static';
	path: string;
}

export class StaticFileDB extends FileDB {
	private path: string

	constructor(path: string) {
		super();
		this.path = path;
	}

	public static async build(config: StaticFileDBConfig, frontendFolder: string): Promise<StaticFileDB> {
		const db = new StaticFileDB(resolve(frontendFolder, config.path));
		addPath(db.path);
		return db;

		function addPath(path: string): void {
			if (!existsSync(path)) throw Error(`path "${path}" does not exist`);
			if (basename(path).startsWith('.')) return; // Skip hidden files and directories.

			const stat = statSync(path);
			if (stat.isDirectory()) {
				readdirSync(path).forEach(name => addPath(resolve(path, name)));
			} else {
				db.setFileFromFilename(path);
			}
		}
	}

	public enterWatchMode(): void {
		watch(this.path, { recursive: true }, (event, filename) => {
			if (!filename || (event !== 'change' && event !== 'rename')) return;
			this.setFileFromFilename(resolve(this.path, filename));
		})
	}

	private setFileFromFilename(filename: string): void {
		this.setFileFromBuffer(
			relative(this.path, filename),
			statSync(filename).mtimeMs,
			readFileSync(filename),
		);
	}
}
