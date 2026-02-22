import { writeFileSync } from 'fs';
import type { SourceInfo } from '../files/source_config';

/**
 * Represents a single label or component within the release notes, with an optional version.
 */
class Label {
	public name: string;

	public url: string;

	public version = '';

	public constructor(source: SourceInfo) {
		this.name = source.name;
		this.url = source.url;
	}

	public setVersion(version: string): void {
		this.version = version;
	}
}

/**
 * Manages the creation and saving of release notes for a project.
 */
export class ReleaseNotes {
	private version = '';

	private suffix = '';

	private readonly labelList: Label[] = [];

	private readonly labelMap = new Map<string, Label>();

	/**
	 * Adds a new label to the release notes.
	 *
	 * @param source - The source info for the component.
	 * @returns The newly created Label instance.
	 */
	public add(source: SourceInfo): Label {
		if (this.labelMap.has(source.name)) return this.labelMap.get(source.name)!;

		const label = new Label(source);
		this.labelList.push(label);
		this.labelMap.set(source.name, label);

		return label;
	}

	/**
	 * Sets the version of the release.
	 */
	public setVersion(version: string): void {
		this.version = version;
	}

	/**
	 * Appends additional content to the end of the release notes.
	 */
	public append(text: string): void {
		this.suffix += text;
	}

	/**
	 * Saves the release notes to a specified file.
	 */
	public save(filename: string): void {
		if (!this.version) throw Error('No version specified for release');

		const notes = [
			`# VersaTiles Frontend ${this.version}`,
			'',
			'## Components',
			'',
			...this.labelList.map((l) => `- [${l.name}](${l.url}): ${l.version || '?.?.?'}`),
		].join('\n');

		writeFileSync(filename, notes + this.suffix);
	}
}

// Singleton instance of ReleaseNotes for use throughout the application.
const releaseNotes = new ReleaseNotes();
export default releaseNotes;
