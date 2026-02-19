import { describe, it, expect } from 'vitest';
import { formatSize, generateOverview } from './overview';
import type { Frontend } from './frontend';
import { File } from '../files/file';

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
	it('formats small values', () => {
		expect(formatSize(0)).toBe('0.0 MB');
		expect(formatSize(999)).toBe('0.0 MB');
	});

	it('formats megabytes', () => {
		expect(formatSize(1000000)).toBe('1.0 MB');
		expect(formatSize(1500000)).toBe('1.5 MB');
		expect(formatSize(90100000)).toBe('90.1 MB');
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
		expect(result).toContain('| Folder | frontend | frontend-min |');
		// Root files
		expect(result).toContain('| `/` | 0.0 MB | 0.0 MB |');
		// assets/styles/* only in f1 (mapped via mapFolder)
		expect(result).toContain('| `assets/styles/*` | 2.5 MB | - |');
		// assets/lib/maplibre-gl/ only in f2
		expect(result).toContain('| `assets/lib/maplibre-gl/` | - | 0.8 MB |');
		// Sum row
		expect(result).toContain('| **Sum** | **2.5 MB** | **0.8 MB** |');
	});

	it('handles empty frontends', () => {
		const f = mockFrontend('empty', []);
		const result = generateOverview([f]);

		expect(result).toContain('| Folder | empty |');
		expect(result).toContain('| **Sum** | - |');
	});

	it('sorts / first then folders alphabetically', () => {
		const f = mockFrontend('test', [
			{ name: 'z.txt', size: 1000000 },
			{ name: 'b/file.txt', size: 1000000 },
			{ name: 'a/file.txt', size: 1000000 },
		]);
		const result = generateOverview([f]);
		const lines = result.split('\n');
		const dataLines = lines.filter(
			(l) => l.startsWith('| ') && !l.startsWith('| Folder') && !l.startsWith('|--') && !l.startsWith('| **Sum')
		);
		expect(dataLines[0]).toContain('`/`');
		expect(dataLines[1]).toContain('`a/`');
		expect(dataLines[2]).toContain('`b/`');
	});

	it('groups glyphs subfolders via mapFolder', () => {
		const f = mockFrontend('test', [
			{ name: 'assets/glyphs/noto_sans_regular/0-255.pbf', size: 5000000 },
			{ name: 'assets/glyphs/noto_sans_bold/0-255.pbf', size: 3000000 },
			{ name: 'assets/glyphs/other_font/0-255.pbf', size: 2000000 },
		]);
		const result = generateOverview([f]);

		// noto_sans_* grouped together
		expect(result).toContain('`assets/glyphs/noto_sans_*/`');
		expect(result).toContain('| `assets/glyphs/noto_sans_*/` | 8.0 MB |');
		// other glyphs grouped under assets/glyphs/*/
		expect(result).toContain('| `assets/glyphs/*/` | 2.0 MB |');
	});

	it('uses right-aligned columns and ## heading', () => {
		const f = mockFrontend('test', [{ name: 'a.txt', size: 1000000 }]);
		const result = generateOverview([f]);
		expect(result).toContain('|---:|');
		expect(result).toContain('## Asset Overview');
	});
});
