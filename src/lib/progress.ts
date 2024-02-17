
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

	private header?: string;

	private finished = false;

	public constructor() {
		process.stderr.write('\x1b[2J\x1b[3J\x1b[H\x1b7');
		this.redraw();
	}

	public setHeader(header: string): void {
		this.header = header;
		this.redraw();
	}

	public finish(): void {
		this.finished = true;
	}

	public add(name: string, indent = 0): ProgressLabel {
		const label = new ProgressLabel(this, name, indent);
		this.labelList.push(label);
		this.redraw();

		return label;
	}

	public redraw(): void {
		process.stderr.write([
			'\x1b8',
			`\x1b[${this.finished ? 2 : 1}m${this.header ?? ''}\x1b[0m\n`,
			...this.labelList.map(l => {
				let code = '0';
				if (l.status === 'running') code = '1';
				if (l.status === 'finished') code = '2';
				return [
					`\x1b[${code}m`,
					'   '.repeat(l.indent),
					' - ',
					l.label,
					'\x1b[0m\n',
				].join('');
			}),
			this.finished ? '\x1b[2mFinished\x1b[0m\n' : '',
		].join(''));
	}
}

const progress = new Progress();
export default progress;
