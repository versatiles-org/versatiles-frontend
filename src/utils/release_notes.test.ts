import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { ReleaseNotes } from './release_notes';

describe('ReleaseNotes', () => {
	let releaseNotes: ReleaseNotes;
	const testFilename = './test-release-notes.md';

	beforeEach(() => {
		releaseNotes = new ReleaseNotes();
	});

	afterEach(() => {
		// Clean up test file if it exists
		if (existsSync(testFilename)) {
			unlinkSync(testFilename);
		}
	});

	it('should add a label', () => {
		const label = releaseNotes.add({ name: 'MapLibre GL', url: 'https://maplibre.org' });
		expect(label).toBeDefined();
		expect(label.name).toBe('MapLibre GL');
		expect(label.url).toBe('https://maplibre.org');
		expect(label.version).toBe('');
	});

	it('should return existing label if added again', () => {
		const label1 = releaseNotes.add({ name: 'MapLibre GL', url: 'https://maplibre.org' });
		const label2 = releaseNotes.add({ name: 'MapLibre GL', url: 'https://maplibre.org' });
		expect(label1).toBe(label2);
	});

	it('should set version for a label', () => {
		const label = releaseNotes.add({ name: 'MapLibre GL', url: 'https://maplibre.org' });
		label.setVersion('5.0.0');
		expect(label.version).toBe('5.0.0');
	});

	it('should set release version', () => {
		releaseNotes.setVersion('3.5.1');
		// Since version is private, we test it via save()
		releaseNotes.add({ name: 'Test Component', url: 'https://example.com' }).setVersion('1.0.0');
		releaseNotes.save(testFilename);

		const content = readFileSync(testFilename, 'utf-8');
		expect(content).toContain('# VersaTiles Frontend 3.5.1');
	});

	it('should save release notes with all labels', () => {
		releaseNotes.setVersion('3.5.1');
		releaseNotes.add({ name: 'MapLibre GL', url: 'https://maplibre.org' }).setVersion('5.0.0');
		releaseNotes
			.add({ name: 'VersaTiles Style', url: 'https://github.com/versatiles-org/versatiles-style' })
			.setVersion('2.1.0');
		releaseNotes
			.add({ name: 'VersaTiles Fonts', url: 'https://github.com/versatiles-org/versatiles-fonts' })
			.setVersion('1.5.0');

		releaseNotes.save(testFilename);

		const content = readFileSync(testFilename, 'utf-8');
		expect(content).toContain('# VersaTiles Frontend 3.5.1');
		expect(content).toContain('## Components');
		expect(content).toContain('- [MapLibre GL](https://maplibre.org): 5.0.0');
		expect(content).toContain('- [VersaTiles Style](https://github.com/versatiles-org/versatiles-style): 2.1.0');
		expect(content).toContain('- [VersaTiles Fonts](https://github.com/versatiles-org/versatiles-fonts): 1.5.0');
	});

	it('should use ?.?.? for labels without version', () => {
		releaseNotes.setVersion('3.5.1');
		releaseNotes.add({ name: 'Component Without Version', url: 'https://example.com/no-version' });
		releaseNotes.add({ name: 'Component With Version', url: 'https://example.com/with-version' }).setVersion('1.2.3');

		releaseNotes.save(testFilename);

		const content = readFileSync(testFilename, 'utf-8');
		expect(content).toContain('- [Component Without Version](https://example.com/no-version): ?.?.?');
		expect(content).toContain('- [Component With Version](https://example.com/with-version): 1.2.3');
	});

	it('should throw error when saving without setting version', () => {
		releaseNotes.add({ name: 'Some Component', url: 'https://example.com' }).setVersion('1.0.0');

		expect(() => {
			releaseNotes.save(testFilename);
		}).toThrow('No version specified for release');
	});
});
