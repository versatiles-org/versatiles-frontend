import { existsSync, readdirSync, readFileSync, statSync, watch } from 'fs';
import { FileDB } from './filedb';
import { basename, relative, resolve } from 'path';

export interface StaticFileDBConfig {
	type: 'static';
	path: string;
}

export class StaticFileDB extends FileDB {
	private path: string;

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
				readdirSync(path).forEach((name) => addPath(resolve(path, name)));
			} else {
				db.setFileFromFilename(path);
			}
		}
	}

	public enterWatchMode(): void {
		watch(this.path, { recursive: true }, (event, filename) => {
			if (!filename || (event !== 'change' && event !== 'rename')) return;
			this.updateFileFromFilename(resolve(this.path, filename));
		});
	}

	private setFileFromFilename(filename: string): void {
		this.setFileFromBuffer(relative(this.path, filename), readFileSync(filename));
	}

	/**
	 * Reflects a filesystem change into the in-memory database. A 'rename' event
	 * also fires on deletions and on newly-created directories, so we must not
	 * blindly read the path — that would crash the watcher with ENOENT/EISDIR.
	 */
	private updateFileFromFilename(filename: string): void {
		const name = relative(this.path, filename);
		try {
			if (!existsSync(filename) || !statSync(filename).isFile()) {
				// File was deleted or the event refers to a directory: drop any stale entry.
				this.files.delete(name);
				return;
			}
			this.setFileFromBuffer(name, readFileSync(filename));
		} catch {
			// The file may have been removed/replaced between the check and the read.
			this.files.delete(name);
		}
	}
}
