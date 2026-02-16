import { createReadStream, existsSync } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import { resolve } from 'path';
import { expect } from 'vitest';

export const releaseDir = new URL('../release', import.meta.url).pathname;

export const hasRelease = existsSync(releaseDir) && existsSync(resolve(releaseDir, 'frontend.tar.gz'));

export interface FileEntry {
	name: string;
	size: number;
	verified?: boolean;
}

export async function listTarGzFiles(filename: string): Promise<FileEntry[]> {
	const filePath = resolve(releaseDir, filename);
	const files: FileEntry[] = [];
	await pipeline(
		createReadStream(filePath),
		createGunzip(),
		tar.t({
			onReadEntry: (entry) => {
				files.push({ name: entry.path, size: entry.size });
				entry.resume();
			},
		})
	);
	return files.sort((a, b) => a.name.localeCompare(b.name));
}

interface Bundle {
	name: string;
	files: FileEntry[];
}

interface BundleFile {
	bundle: string;
	name: string;
}

export class Bundles {
	public readonly bundles: Bundle[];
	constructor(bundles: Bundle[]) {
		this.bundles = bundles;
	}
	bundleNames(): string[] {
		return this.bundles.map((b) => b.name);
	}
	withPrefix(prefix: string): PrefixedBundles {
		return new PrefixedBundles(
			this.bundles.map((b) => ({ name: b.name, files: b.files.filter((f) => f.name.startsWith(prefix)) })),
			prefix
		);
	}
	expectEmpty() {
		for (const bundle of this.bundles) {
			expect(bundle.files.filter((f) => !f.verified).map((f) => f.name)).toStrictEqual([]);
		}
	}
}

class PrefixedBundles {
	private prefix: string;
	private bundles: Bundle[];
	constructor(bundles: Bundle[], prefix: string) {
		this.bundles = bundles;
		this.prefix = prefix;
	}
	private verify(cb: (file: string) => boolean): BundleFile[] {
		const found: BundleFile[] = [];
		for (const bundle of this.bundles) {
			bundle.files.forEach((file) => {
				if (!cb(file.name)) return;
				if (file.verified) return;
				file.verified = true;
				found.push({ bundle: bundle.name, name: file.name });
			});
		}
		return found;
	}
	rest(): Record<string, string[]> {
		const found = this.verify((f) => f.startsWith(this.prefix));
		const result: Record<string, string[]> = {};
		for (const { bundle, name } of found) {
			if (!result[bundle]) result[bundle] = [];
			result[bundle].push(name.slice(this.prefix.length));
		}
		for (const bundle in result) {
			result[bundle].sort();
		}
		return result;
	}
	file(filename: string): boolean {
		const filenameWithPrefix = this.prefix + filename;
		for (const bundle of this.bundles) {
			let found = false;
			bundle.files.forEach((file) => {
				if (file.name !== filenameWithPrefix) return;
				if (file.verified) return;
				file.verified = true;
				found = true;
			});
			if (!found) {
				throw new Error(`File ${filenameWithPrefix} not found in bundle ${bundle.name}`);
			}
		}
		return true;
	}
	count(regex: RegExp): Record<string, number> | number {
		const found = this.verify((f) => f.startsWith(this.prefix) && regex.test(f.slice(this.prefix.length)));
		const counts: Record<string, number> = {};
		const bundleNames = this.bundles.map((b) => b.name);
		for (const bundle of bundleNames) {
			counts[bundle] = 0;
		}
		for (const { bundle } of found) {
			counts[bundle] = (counts[bundle] || 0) + 1;
		}
		const anyCount = Object.values(counts)[0];
		if (Object.values(counts).every((c) => c === anyCount)) {
			return anyCount;
		}
		return counts;
	}
	sizes(regex: RegExp): Record<string, number> | number {
		const sizes: Record<string, number> = {};
		for (const bundle of this.bundles) {
			let size = 0;
			bundle.files.forEach((file) => {
				if (!file.name.startsWith(this.prefix)) return;
				const name = file.name.slice(this.prefix.length);
				if (!regex.test(name)) return;
				size += file.size;
			});
			sizes[bundle.name] = size;
		}
		const anySize = Object.values(sizes)[0];
		if (Object.values(sizes).every((s) => s === anySize)) {
			return anySize;
		}
		return sizes;
	}
}
