import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import notes from '../utils/release_notes';
import { FileDB } from './filedb';
import { safeJoinDest } from './safe-path';
import type { NpmBundleConfig, NpmSourceConfig } from './source_config';

export class NpmFileDB extends FileDB {
	public static async build(config: NpmSourceConfig): Promise<NpmFileDB> {
		const db = new NpmFileDB();

		const pkgDir = resolvePackageRoot(config.pkg);

		const pkgJsonPath = join(pkgDir, 'package.json');
		const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
		const label = notes.add(config.source);
		label.setVersion(pkgJson.version);

		addPath(pkgDir, '');
		if (config.bundle) await addBundle(db, pkgDir, config.dest, config.bundle);
		return db;

		function addPath(absPath: string, relPath: string): void {
			const stat = statSync(absPath);
			if (stat.isDirectory()) {
				for (const name of readdirSync(absPath)) {
					addPath(join(absPath, name), relPath ? `${relPath}/${name}` : name);
				}
			} else {
				if (config.include && !config.include.test(relPath)) return;
				let destName = config.flatten ? basename(relPath) : relPath;
				if (config.rename?.[destName]) destName = config.rename[destName];
				const dest = safeJoinDest(config.dest, destName);
				if (dest === false) {
					console.warn(`Skipping unsafe package entry "${relPath}" (escapes "${config.dest}")`);
					return;
				}
				db.setFileFromBuffer(dest, readFileSync(absPath));
			}
		}
	}

	public enterWatchMode(): void {}
}

/**
 * Bundles an ESM entry point into a classic script exposing a global, and adds
 * it (plus its source map) to the database.
 */
async function addBundle(db: FileDB, pkgDir: string, dest: string, bundle: NpmBundleConfig): Promise<void> {
	// Imported lazily so that packages without a bundle step never load esbuild.
	const { build } = await import('esbuild');

	const entryPath = join(pkgDir, bundle.entry);
	const { globalName } = bundle;

	// esbuild's own `globalName` would expose the ES module namespace, whose properties are
	// getter-only and non-configurable. Consumers used to monkey-patch the UMD global, so we
	// copy the namespace into a plain object and publish that instead.
	const shim = [
		`import * as __ns from './${basename(entryPath)}';`,
		`const ${globalName} = { ...__ns };`,
		bundle.setup ?? '',
		`globalThis.${globalName} = ${globalName};`,
	].join('\n');

	const result = await build({
		stdin: { contents: shim, resolveDir: dirname(entryPath), sourcefile: `${globalName}-bundle.js`, loader: 'js' },
		outfile: bundle.outfile,
		bundle: true,
		format: 'iife',
		minify: true,
		sourcemap: true,
		target: ['es2020'],
		write: false,
		logLevel: 'silent',
	});

	for (const file of result.outputFiles) {
		const target = safeJoinDest(dest, basename(file.path));
		if (target === false) throw new Error(`Unsafe bundle output "${file.path}" (escapes "${dest}")`);
		db.setFileFromBuffer(target, Buffer.from(file.contents));
	}
}

function resolvePackageRoot(pkg: string): string {
	const require = createRequire(import.meta.url);

	// Fastest path: the package exports its own package.json
	try {
		return dirname(require.resolve(`${pkg}/package.json`));
	} catch {
		// package restricts "exports" - fall back to resolving an entry point
	}

	const errors: unknown[] = [];

	// CommonJS resolution of the main entry
	try {
		return findPackageRoot(require.resolve(pkg));
	} catch (error) {
		errors.push(error);
	}

	// ESM-only packages have no "require" condition, so they only resolve via ESM
	if (typeof import.meta.resolve === 'function') {
		try {
			return findPackageRoot(fileURLToPath(import.meta.resolve(pkg)));
		} catch (error) {
			errors.push(error);
		}
	}

	throw new AggregateError(errors, `Could not resolve npm package "${pkg}"`);
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
