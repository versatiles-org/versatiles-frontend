import { writeFileSync } from 'node:fs';

/**
 * Represents a single label or component within the release notes, with an optional version.
 */
class Label {
	public name: string; // Name of the label or component.

	public version = ''; // Version of the component, defaulting to an empty string.

	/**
	 * Constructs a Label instance.
	 * 
	 * @param name - The name of the label or component.
	 */
	public constructor(name: string) {
		this.name = name;
	}

	/**
	 * Sets the version for the label or component.
	 * 
	 * @param version - The version to be set.
	 */
	public setVersion(version: string): void {
		this.version = version;
	}
}

/**
 * Manages the creation and saving of release notes for a project.
 */
class ReleaseNotes {
	private version = ''; // The version of the release.

	private readonly labelList: Label[] = []; // List of all labels included in the release notes.

	private readonly labelMap = new Map<string, Label>(); // Map for quick label lookup by name.

	/**
	 * Constructs a ReleaseNotes instance.
	 */
	public constructor() {
		// Save the current cursor position in the terminal.
		process.stderr.write('\u001b[s');
	}

	/**
	 * Adds a new label to the release notes.
	 * 
	 * @param name - The name of the new label or component.
	 * @returns The newly created Label instance.
	 */
	public add(name: string): Label {
		const label = new Label(name);
		this.labelList.push(label);
		if (this.labelMap.has(name)) throw Error('Duplicate label name');
		this.labelMap.set(name, label);

		return label;
	}

	/**
	 * Sets the version of the release.
	 * 
	 * @param version - The version of the release to be set.
	 */
	public setVersion(version: string): void {
		this.version = version;
	}

	/**
	 * Saves the release notes to a specified file.
	 * 
	 * @param filename - The name of the file where the release notes should be saved.
	 */
	public save(filename: string): void {
		if (!this.version) throw Error('No version specified for release');

		// Compile the release notes content.
		const notes = [
			`## VersaTiles Frontend ${this.version}`,
			'',
			'contains:',
			...this.labelList.map(l => {
				if (!l.version) throw Error(`No version specified for ${l.name}`);
				return `- ${l.name}: ${l.version}`;
			}),
		].join('\n');

		// Write the compiled release notes to the specified file.
		writeFileSync(filename, notes);
	}
}

// Singleton instance of ReleaseNotes for use throughout the application.
const releaseNotes = new ReleaseNotes();
export default releaseNotes;
