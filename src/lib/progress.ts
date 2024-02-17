
type Status = 'finished' | 'new' | 'running';

export class ProgressLabel {
	public label: string;

	public indent: number;

	public status: Status;

	private readonly progress: Progress;

	public constructor(progress: Progress, label: string, indent: number) {
		this.progress = progress;
		this.label = label;
		this.indent = indent || 0;
		this.status = 'new';
	}

	public updateLabel(label: string): void {
		if (this.label === label) return;
		this.label = label;
		this.progress.redraw();
	}

	public start(): void {
		this.status = 'running';
		this.progress.redraw();
	}

	public end(): void {
		this.status = 'finished';
		this.progress.redraw();
	}
}

class Progress {
	private readonly labelList: ProgressLabel[] = [];

	public constructor() {
		process.stderr.write('\x1b[2J\x1b[3J\x1b[H\x1b7');
	}

	public add(name: string, indent = 0): ProgressLabel {
		const label = new ProgressLabel(this, name, indent);
		this.labelList.push(label);
		this.redraw();

		return label;
	}

	public redraw(): void {
		const status = '\x1b8' + this.labelList.map(l => {
			let code = '0;39';
			if (l.status === 'running') code = '1;39';
			if (l.status === 'finished') code = '2;39';
			return [
				`\x1b[${code}m`,
				'   '.repeat(l.indent),
				' - ',
				l.label,
				'\x1b[0m\n',
			].join('');
		}).join('');
		process.stderr.write(status);
	}
}

const progress = new Progress();
export default progress;
