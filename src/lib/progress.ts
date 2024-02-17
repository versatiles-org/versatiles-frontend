import supportsColor from 'supports-color';


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
		if (this.progress.enabled) {
			this.progress.redraw();
		} else {
			this.progress.write(this.getOutputText());

		}
	}

	public end(): void {
		this.status = 'finished';
		if (this.progress.enabled) {
			this.progress.redraw();
		} else {
			this.progress.write(this.getOutputText());

		}
	}

	public getOutputAnsi(): string {
		let code = '0';
		if (this.status === 'running') code = '1';
		if (this.status === 'finished') code = '2';
		return [
			`\x1b[${code}m`,
			'   '.repeat(this.indent),
			' - ',
			this.label,
			'\x1b[0m\n',
		].join('');
	}

	public getOutputText(): string {
		let status = '???';
		if (this.status === 'running') status = 'start';
		if (this.status === 'finished') status = 'finish';
		const indent = '   '.repeat(this.indent);
		return `${indent} - ${status}: ${this.label}`;
	}
}

class Progress {
	public readonly enabled: boolean;

	private readonly labelList: ProgressLabel[] = [];

	private header?: string;

	private finished = false;

	public constructor() {
		this.enabled = Boolean(supportsColor.stdout);
		if (this.enabled) {
			process.stdout.write('\x1b[2J\x1b[3J\x1b[H\x1b7');
			this.redraw();
		}
	}

	public setHeader(header: string): void {
		if (this.enabled) {
			this.header = header;
			this.redraw();
		} else {
			this.write(header);
		}
	}

	public finish(): void {
		if (this.enabled) {
			this.finished = true;
			this.redraw();
		} else {
			this.write('Finished');
		}
	}

	public add(name: string, indent = 0): ProgressLabel {
		const label = new ProgressLabel(this, name, indent);
		this.labelList.push(label);
		this.redraw();

		return label;
	}

	public redraw(): void {
		if (!this.enabled) return;
		process.stdout.write([
			'\x1b8',
			`\x1b[${this.finished ? 2 : 1}m${this.header ?? ''}\x1b[0m\n`,
			...this.labelList.map(l => l.getOutputAnsi()),
			this.finished ? '\x1b[2mFinished\x1b[0m\n' : '',
		].join(''));
	}

	public write(line: string): void {
		process.stdout.write(line + '\n');
	}
}

const progress = new Progress();
export default progress;
