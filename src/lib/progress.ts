
class Label {
	public readonly name: string;

	public closed = false;

	public time: string;

	private readonly progress: Progress;

	public constructor(progress: Progress, name: string) {
		this.name = name;
		this.time = this.getTime();
		this.progress = progress;
	}

	public close(): void {
		this.closed = true;
		this.time = this.getTime();
		this.progress.redraw();
	}

	public open(): void {
		this.closed = false;
		this.time = this.getTime();
		this.progress.redraw();
	}

	private getTime(): string {
		return new Date().toLocaleTimeString('de-DE');
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
		this.labelList.sort((a, b) => a.name < b.name ? -1 : 1);
		const status = '\u001b[u' + this.labelList.map(l =>
			' - \u001b[' + (l.closed ? 32 : 31) + 'm' + l.name + '\u001b[39;2m ' + l.time + '\u001b[0m\n',
		).join('');
		process.stderr.write(status);
	}
}
