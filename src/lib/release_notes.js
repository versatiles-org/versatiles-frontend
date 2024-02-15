
import { writeFileSync } from 'node:fs';

const releaseNotes= new ReleaseNotes();
export default releaseNotes;

function ReleaseNotes() {
	let version;
	const labelList = [];
	const labelMap = new Map();

	process.stderr.write('\u001b[s')

	return { add, setVersion, save }

	function add(name) {
		const label = { name, version: '' };
		labelList.push(label);
		if (labelMap.has(name)) throw Error();
		labelMap.set(name, label)

		return v => label.version = v;
	}

	function setVersion(v) {
		version = v;
	}

	function save(filename) {
		if (!version) throw Error('no version for release');
		
		let notes = [
			`## VersaTiles Frontend ${version}`,
			'',
			'contains:',
			...labelList.map(l => {
				if (!l.version) throw Error('no version for ' + l.name);
				return `- ${l.name}: ${l.version}`
			})
		].join('\n');

		writeFileSync(filename, notes);
	}
}
