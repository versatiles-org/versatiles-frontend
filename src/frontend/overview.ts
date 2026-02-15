import type { Frontend } from './frontend';

/**
 * Formats a byte count as a human-readable string.
 */
export function formatSize(bytes: number): string {
	return (bytes / 1000000).toFixed(1) + ' MB';
}

/**
 * Generates a markdown overview table comparing assets across frontends.
 */
export function generateOverview(frontends: Frontend[]): string {
	// Collect sizes per (folder, frontend) combination
	const folderSizes = new Map<string, Map<string, number>>();

	for (const frontend of frontends) {
		const name = frontend.config.name;
		for (const file of frontend.iterate()) {
			const lastSlash = file.name.lastIndexOf('/');
			let folder = lastSlash === -1 ? '/' : file.name.slice(0, lastSlash + 1);
			folder = mapFolder(folder);
			let frontendMap = folderSizes.get(folder);
			if (!frontendMap) {
				frontendMap = new Map();
				folderSizes.set(folder, frontendMap);
			}
			frontendMap.set(name, (frontendMap.get(name) ?? 0) + file.bufferRaw.length);
		}
	}

	// Sort folders: "/" first, then alphabetically
	const folders = [...folderSizes.keys()].sort((a, b) => {
		if (a === '/') return -1;
		if (b === '/') return 1;
		return a.localeCompare(b);
	});

	const names = frontends.map((f) => f.config.name);

	// Build header
	const lines: string[] = [];
	lines.push('## Asset Overview');
	lines.push('');
	lines.push('| Folder | ' + names.join(' | ') + ' |');
	lines.push('|--------|' + names.map(() => '---:').join('|') + '|');

	// Build rows
	const sums = new Map<string, number>();
	for (const folder of folders) {
		const frontendMap = folderSizes.get(folder)!;
		const cells = names.map((name) => {
			const size = frontendMap.get(name);
			if (size == null) return '-';
			sums.set(name, (sums.get(name) ?? 0) + size);
			return formatSize(size);
		});
		lines.push('| `' + folder + '` | ' + cells.join(' | ') + ' |');
	}

	// Sum row
	const sumCells = names.map((name) => {
		const total = sums.get(name);
		return total == null ? '-' : '**' + formatSize(total) + '**';
	});
	lines.push('| **Sum** | ' + sumCells.join(' | ') + ' |');

	return lines.join('\n') + '\n';
}

function mapFolder(folder: string): string {
	if (folder.startsWith('assets/glyphs/')) {
		if (folder.startsWith('assets/glyphs/noto_sans_')) {
			return 'assets/glyphs/noto_sans_*';
		}
		return 'assets/glyphs/*';
	}
	if (folder.startsWith('assets/styles/')) {
		return 'assets/styles/*';
	}
	if (folder.startsWith('assets/sprites/')) {
		return 'assets/sprites/*';
	}
	return folder;
}
