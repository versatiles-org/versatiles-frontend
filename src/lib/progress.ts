
class Label {
	public label: string;

	public closed = false;

	private readonly progress: Progress;

	public constructor(progress: Progress, label: string) {
		this.label = label;
		this.progress = progress;
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

export default class Progress {
	private readonly labelList: Label[] = [];

	private readonly labelMap = new Map<string, Label>();

	public constructor() {
		process.stderr.write('\u001b[s');
	}

	public add(name: string): Label {
		const label = new Label(this, name);
		this.labelList.push(label);
		if (this.labelMap.has(name)) throw Error();
		this.labelMap.set(name, label);
		this.redraw();

		return label;
	}

	public redraw(): void {
		const status = '\u001b[u' + this.labelList.map(l =>
			' - \u001b[' + (l.closed ? 32 : 31) + 'm' + l.label + '\u001b[0m\n',
		).join('');
		process.stderr.write(status);
	}
}
