
import { writeFileSync } from 'node:fs';

class Label {
	public name: string;

	public version = '';

	public constructor(name: string) {
		this.name = name;
	}

	public setVersion(version: string): void {
		this.version = version;
	}
}

class ReleaseNotes {
	private version = '';

	private readonly labelList: Label[] = [];

	private readonly labelMap = new Map<string, Label>();

	public constructor() {
		process.stderr.write('\u001b[s');
	}

	public add(name: string): Label {
		const label = new Label(name);
		this.labelList.push(label);
		if (this.labelMap.has(name)) throw Error();
		this.labelMap.set(name, label);

		return label;
	}

	public setVersion(version: string): void {
		this.version = version;
	}

	public save(filename: string): void {
		if (!this.version) throw Error('no version for release');

		const notes = [
			`## VersaTiles Frontend ${this.version}`,
			'',
			'contains:',
			...this.labelList.map(l => {
				if (!l.version) throw Error('no version for ' + l.name);
				return `- ${l.name}: ${l.version}`;
			}),
		].join('\n');

		writeFileSync(filename, notes);
	}
}

const releaseNotes = new ReleaseNotes();
export default releaseNotes;
