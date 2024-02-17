
export class ProgressLabel {
	public label: string;

	public indent: number;

	public closed = false;

	private readonly progress: Progress;

	public constructor(progress: Progress, label: string, indent: number) {
		this.progress = progress;
		this.label = label;
		this.indent = indent || 0;
	}

	public updateLabel(label: string): void {
		if (this.label === label) return;
		this.label = label;
		this.progress.redraw();
	}

	public close(): void {
		this.closed = true;
		this.progress.redraw();
	}

	public open(): void {
		this.closed = false;
		this.progress.redraw();
	}
}

class Progress {
	private readonly labelList: ProgressLabel[] = [];

	public constructor() {
		process.stderr.write('\u001b[s');
	}

	public add(name: string, indent = 0): ProgressLabel {
		const label = new ProgressLabel(this, name, indent);
		this.labelList.push(label);
		this.redraw();

		return label;
	}

	public redraw(): void {
		const status = '\u001b[u' + this.labelList.map(l => {
			return [
				'   '.repeat(l.indent),
				' - \u001b[', l.closed ? 32 : 31, 'm',
				l.label,
				'\u001b[0m\n',
			].join('');
		}).join('');
		process.stderr.write(status);
	}
}

const progress = new Progress();
export default progress;
