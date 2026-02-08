import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join } from 'path';
import { createRequire } from 'module';
import notes from '../utils/release_notes';
import { FileDB } from './filedb';
import type { NpmSourceConfig } from './source_config';

export class NpmFileDB extends FileDB {
	public static async build(config: NpmSourceConfig): Promise<NpmFileDB> {
		const db = new NpmFileDB();

		// Resolve the main entry of the package, then walk up to find the package root
		const require = createRequire(import.meta.url);
		const entryPath = require.resolve(config.pkg);
		const pkgDir = findPackageRoot(entryPath);

		const pkgJsonPath = join(pkgDir, 'package.json');
		const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
		const label = notes.add(config.notes);
		label.setVersion(pkgJson.version);

		addPath(pkgDir, '');
		return db;

		function addPath(absPath: string, relPath: string): void {
			const stat = statSync(absPath);
			if (stat.isDirectory()) {
				for (const name of readdirSync(absPath)) {
					addPath(join(absPath, name), relPath ? `${relPath}/${name}` : name);
				}
			} else {
				if (config.include && !config.include.test(relPath)) return;
				const destName = config.flatten ? basename(relPath) : relPath;
				db.setFileFromBuffer(join(config.dest, destName), stat.mtimeMs, readFileSync(absPath));
			}
		}
	}

	public enterWatchMode(): void {}
}

function findPackageRoot(startPath: string): string {
	let dir = dirname(startPath);
	while (dir !== dirname(dir)) {
		const pkgPath = join(dir, 'package.json');
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			if (pkg.version) return dir;
		}
		dir = dirname(dir);
	}
	throw new Error(`Could not find package.json starting from ${startPath}`);
}
