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
		const label = releaseNotes.add('MapLibre GL');
		expect(label).toBeDefined();
		expect(label.name).toBe('MapLibre GL');
		expect(label.version).toBe('');
	});

	it('should return existing label if added again', () => {
		const label1 = releaseNotes.add('MapLibre GL');
		const label2 = releaseNotes.add('MapLibre GL');
		expect(label1).toBe(label2);
	});

	it('should set version for a label', () => {
		const label = releaseNotes.add('MapLibre GL');
		label.setVersion('5.0.0');
		expect(label.version).toBe('5.0.0');
	});

	it('should set release version', () => {
		releaseNotes.setVersion('3.5.1');
		// Since version is private, we test it via save()
		releaseNotes.add('Test Component').setVersion('1.0.0');
		releaseNotes.save(testFilename);

		const content = readFileSync(testFilename, 'utf-8');
		expect(content).toContain('# VersaTiles Frontend 3.5.1');
	});

	it('should save release notes with all labels', () => {
		releaseNotes.setVersion('3.5.1');
		releaseNotes.add('MapLibre GL').setVersion('5.0.0');
		releaseNotes.add('VersaTiles Style').setVersion('2.1.0');
		releaseNotes.add('VersaTiles Fonts').setVersion('1.5.0');

		releaseNotes.save(testFilename);

		const content = readFileSync(testFilename, 'utf-8');
		expect(content).toContain('# VersaTiles Frontend 3.5.1');
		expect(content).toContain('## Components');
		expect(content).toContain('- MapLibre GL: 5.0.0');
		expect(content).toContain('- VersaTiles Style: 2.1.0');
		expect(content).toContain('- VersaTiles Fonts: 1.5.0');
	});

	it('should use ?.?.? for labels without version', () => {
		releaseNotes.setVersion('3.5.1');
		releaseNotes.add('Component Without Version');
		releaseNotes.add('Component With Version').setVersion('1.2.3');

		releaseNotes.save(testFilename);

		const content = readFileSync(testFilename, 'utf-8');
		expect(content).toContain('- Component Without Version: ?.?.?');
		expect(content).toContain('- Component With Version: 1.2.3');
	});

	it('should throw error when saving without setting version', () => {
		releaseNotes.add('Some Component').setVersion('1.0.0');

		expect(() => {
			releaseNotes.save(testFilename);
		}).toThrow('No version specified for release');
	});
});
