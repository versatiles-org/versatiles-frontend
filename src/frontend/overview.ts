import { resolve } from 'path';
import { statSync } from 'fs';
import type { Frontend } from './frontend';

/**
 * Formats a byte count as KB with no decimal point.
 */
export function formatSize(bytes: number): string {
	return Math.round(bytes / 1000)
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

/**
 * Generates an ASCII overview table comparing assets across frontends.
 */
export function generateOverview(frontends: Frontend[], dstFolder?: string): string {
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
		if (a.endsWith('*') && b.startsWith(a.slice(0, -1))) return 1;
		if (b.endsWith('*') && a.startsWith(b.slice(0, -1))) return -1;
		return a.localeCompare(b);
	});

	const names = frontends.map((f) => f.config.name);

	// Build rows as grid: each row is [label, ...values]
	type Row = string[] | null; // null = separator line
	const rows: Row[] = [];

	// Header
	rows.push(['Folder (KB)', ...names]);
	rows.push(null); // separator

	// Data rows
	const sums = new Map<string, number>();
	for (const folder of folders) {
		const frontendMap = folderSizes.get(folder)!;
		const cells = names.map((name) => {
			const size = frontendMap.get(name);
			if (size == null) return '-';
			sums.set(name, (sums.get(name) ?? 0) + size);
			return formatSize(size);
		});
		rows.push([folder, ...cells]);
	}

	// Sum row
	rows.push(null); // separator
	rows.push([
		'Sum',
		...names.map((name) => {
			const total = sums.get(name);
			return total == null ? '-' : formatSize(total);
		}),
	]);

	// Compressed archive sizes
	if (dstFolder) {
		rows.push(null); // separator
		for (const ext of ['.tar.gz', '.br.tar.gz']) {
			rows.push([
				ext,
				...names.map((name) => {
					try {
						return formatSize(statSync(resolve(dstFolder, name + ext)).size);
					} catch {
						return '-';
					}
				}),
			]);
		}
	}

	// Compute column widths
	const colCount = names.length + 1;
	const colWidths = Array.from({ length: colCount }, (_, col) => {
		let max = 0;
		for (const row of rows) {
			if (row) max = Math.max(max, row[col].length);
		}
		return max;
	});

	// Render table
	const tableLines: string[] = [];

	const columnSeparator = '   ';
	const tableWidth = colWidths.reduce((s, w) => s + w) + (colCount - 1) * columnSeparator.length;
	const dashLine = '-'.repeat(tableWidth);
	for (const row of rows) {
		if (row == null) {
			tableLines.push(dashLine);
		} else {
			const cells = row.map((cell, i) => (i === 0 ? cell.padEnd(colWidths[i]) : cell.padStart(colWidths[i])));
			tableLines.push(cells.join(columnSeparator));
		}
	}

	return '## Asset Overview\n\n```\n' + tableLines.join('\n') + '\n```\n\n*All file sizes are in KB*\n';
}

function mapFolder(folder: string): string {
	if (folder.startsWith('assets/glyphs/')) {
		if (folder.startsWith('assets/glyphs/noto_sans_')) {
			return 'assets/glyphs/noto_sans_*/';
		}
		return 'assets/glyphs/*';
	}
	if (folder.startsWith('assets/styles/')) {
		return 'assets/styles/';
	}
	if (folder.startsWith('assets/sprites/')) {
		return 'assets/sprites/';
	}
	return folder;
}
