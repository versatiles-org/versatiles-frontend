import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatSize, generateOverview } from './overview';
import type { Frontend } from './frontend';
import { File } from '../files/file';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function mockFrontend(name: string, files: { name: string; size: number }[]): Frontend {
	const fileObjects = files.map((f) => new File(f.name, 0, Buffer.alloc(f.size)));
	return {
		config: { name, fileDBs: [] },
		*iterate() {
			yield* fileObjects;
		},
	} as unknown as Frontend;
}

describe('formatSize', () => {
	it('formats zero', () => {
		expect(formatSize(0)).toBe('0');
	});

	it('formats kilobytes with thousand separator', () => {
		expect(formatSize(500)).toBe('1');
		expect(formatSize(1000)).toBe('1');
		expect(formatSize(14000)).toBe('14');
		expect(formatSize(1500000)).toBe("1'500");
		expect(formatSize(90100000)).toBe("90'100");
	});
});

describe('generateOverview', () => {
	it('generates correct table with multiple frontends', () => {
		const f1 = mockFrontend('frontend', [
			{ name: 'index.html', size: 14000 },
			{ name: 'assets/styles/main.css', size: 2000000 },
			{ name: 'assets/styles/dark.css', size: 500000 },
		]);
		const f2 = mockFrontend('frontend-min', [
			{ name: 'index.html', size: 12000 },
			{ name: 'assets/lib/maplibre-gl/maplibre.js', size: 830000 },
		]);

		const result = generateOverview([f1, f2]);

		expect(result).toContain('## Asset Overview');
		expect(result).toContain('```');
		expect(result).toContain('Folder (KB)');
		expect(result).toContain('frontend');
		expect(result).toContain('frontend-min');
		// Data rows with right-aligned values
		expect(result).toContain('assets/styles/');
		expect(result).toContain('assets/lib/maplibre-gl/');
		// Sum row
		expect(result).toContain('Sum');
	});

	it('handles empty frontends', () => {
		const f = mockFrontend('empty', []);
		const result = generateOverview([f]);

		expect(result).toContain('Folder (KB)');
		expect(result).toMatch(/Sum\s+-/);
	});

	it('sorts / first then folders alphabetically', () => {
		const f = mockFrontend('test', [
			{ name: 'z.txt', size: 1000000 },
			{ name: 'b/file.txt', size: 1000000 },
			{ name: 'a/file.txt', size: 1000000 },
		]);
		const result = generateOverview([f]);
		const lines = result.split('\n');
		const dataLines = lines.filter((l) => l.includes("1'000") || l.startsWith('/'));
		expect(dataLines[0]).toMatch(/^\//);
		expect(dataLines[1]).toMatch(/^a\//);
		expect(dataLines[2]).toMatch(/^b\//);
	});

	it('groups glyphs subfolders via mapFolder', () => {
		const f = mockFrontend('test', [
			{ name: 'assets/glyphs/noto_sans_regular/0-255.pbf', size: 5000000 },
			{ name: 'assets/glyphs/noto_sans_bold/0-255.pbf', size: 3000000 },
			{ name: 'assets/glyphs/other_font/0-255.pbf', size: 2000000 },
		]);
		const result = generateOverview([f]);

		expect(result).toContain('assets/glyphs/noto_sans_*/');
		expect(result).toContain('assets/glyphs/*');
	});

	it('wraps table in code block with heading', () => {
		const f = mockFrontend('test', [{ name: 'a.txt', size: 1000000 }]);
		const result = generateOverview([f]);
		expect(result).toContain('## Asset Overview');
		expect(result).toContain('```\n');
	});

	it('pads all cells in a column to equal width', () => {
		const f = mockFrontend('col', [
			{ name: 'data_a/small.txt', size: 1000 },
			{ name: 'data_b/big.txt', size: 1500000 },
		]);
		const result = generateOverview([f]);
		const table = result.split('\n```\n')[1]; // get content inside code block
		const lines = table.split('\n');
		expect(lines.length).toBe(6);
		// All lines should have the same length
		const lengths = lines.map((l) => l.length);
		expect(Array.from(new Set(lengths).values())).toStrictEqual([19]);
	});

	it('contains separator lines', () => {
		const f = mockFrontend('test', [{ name: 'a.txt', size: 1000000 }]);
		const result = generateOverview([f]);
		const lines = result.split('\n');
		const separators = lines.filter((l) => /^-+$/.test(l));
		expect(separators.length).toBeGreaterThanOrEqual(2);
	});

	describe('with dstFolder', () => {
		let tmpDir: string;

		beforeEach(() => {
			tmpDir = mkdtempSync(join(tmpdir(), 'overview-test-'));
		});

		afterEach(() => {
			rmSync(tmpDir, { recursive: true });
		});

		it('appends compressed archive sizes', () => {
			const f = mockFrontend('frontend', [{ name: 'index.html', size: 1000000 }]);
			writeFileSync(join(tmpDir, 'frontend.tar.gz'), Buffer.alloc(500000));
			writeFileSync(join(tmpDir, 'frontend.br.tar.gz'), Buffer.alloc(300000));

			const result = generateOverview([f], tmpDir);

			expect(result).toMatch(/\.tar\.gz\s+500/);
			expect(result).toMatch(/\.br\.tar\.gz\s+300/);
		});

		it('shows dash when archive file is missing', () => {
			const f = mockFrontend('frontend', [{ name: 'index.html', size: 1000000 }]);

			const result = generateOverview([f], tmpDir);

			expect(result).toMatch(/\.tar\.gz\s+-/);
			expect(result).toMatch(/\.br\.tar\.gz\s+-/);
		});

		it('does not append archive rows without dstFolder', () => {
			const f = mockFrontend('frontend', [{ name: 'index.html', size: 1000000 }]);

			const result = generateOverview([f]);

			expect(result).not.toContain('.tar.gz');
			expect(result).not.toContain('.br.tar.gz');
		});
	});
});
