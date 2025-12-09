import { env } from 'process';
import supportsColor from 'supports-color';

// Defines possible states for a progress label.
type Status = 'finished' | 'new' | 'running';

/**
 * Represents a single progress label with a status and text label, capable of being rendered in the console.
 */
export class ProgressLabel {
	public label: string; // Text label for the progress item.

	public indent: number; // Indentation level for visual hierarchy.

	public status: Status; // Current status of the progress item.

	private readonly progress: Progress; // Reference to the parent Progress instance for managing updates.

	/**
	 * Constructs a ProgressLabel instance.
	 *
	 * @param progress - The parent Progress instance.
	 * @param label - The text label for this progress item.
	 * @param indent - The indentation level for this item.
	 */
	public constructor(progress: Progress, label: string, indent: number) {
		this.progress = progress;
		this.label = label;
		this.indent = indent || 0;
		this.status = 'new';
	}

	/**
	 * Updates the text label and triggers a redraw of the progress display.
	 *
	 * @param label - The new text label.
	 */
	public updateLabel(label: string): void {
		if (this.label === label) return;
		this.label = label;
		this.progress.redraw();
	}

	/**
	 * Marks the progress item as started and triggers a redraw or write.
	 */
	public start(): void {
		this.status = 'running';
		if (this.progress.useAnsi) {
			this.progress.redraw();
		} else {
			this.progress.writeLine(this.getOutputText());
		}
	}

	/**
	 * Marks the progress item as finished and triggers a redraw or write.
	 */
	public end(): void {
		this.status = 'finished';
		if (this.progress.useAnsi) {
			this.progress.redraw();
		} else {
			this.progress.writeLine(this.getOutputText());
		}
	}

	/**
	 * Generates ANSI-colored output for this progress item.
	 *
	 * @returns A string with ANSI escape codes for coloring based on the item's status.
	 */
	public getOutputAnsi(): string {
		let code = '0'; // Default to no color.
		if (this.status === 'running') code = '1'; // Set color for running status.
		if (this.status === 'finished') code = '2'; // Set color for finished status.
		return [
			`\x1b[${code}m`, // ANSI escape code for color.
			'   '.repeat(this.indent), // Indentation spaces.
			' - ', // Prefix for the label.
			this.label,
			'\x1b[0m\x1b[0K\n', // Reset ANSI styling.
		].join('');
	}

	/**
	 * Generates a plain text output for this progress item, suitable for non-ANSI terminals.
	 *
	 * @returns A plain text string representation of this progress item.
	 */
	public getOutputText(): string {
		let status = '???'; // Default status text.
		if (this.status === 'running') status = 'start';
		if (this.status === 'finished') status = 'finish';
		const indent = '   '.repeat(this.indent); // Generate indentation spaces.
		return `${indent} - ${status}: ${this.label}`;
	}
}

/**
 * Manages a collection of ProgressLabel instances and handles the overall progress display.
 */
export class Progress {
	private readonly labelList: ProgressLabel[] = []; // List of all progress labels.

	public header?: string; // Optional header text for the progress display.

	private finished = false; // Flag indicating if the progress display is marked as finished.

	private started = false; // Flag indicating if the progress display has been started.

	#useAnsi: boolean; // Flag for using ANSI color codes in output.

	#disabled = false; // Flag for disabling any output.

	/**
	 * Constructs a Progress instance, determining if ANSI colors are supported.
	 */
	public constructor() {
		this.#useAnsi = Boolean(supportsColor.stdout);
		if (env.NO_COLOR != null) this.#useAnsi = false;
	}

	public get useAnsi(): boolean {
		return this.#useAnsi;
	}

	/**
	 * Disables the use of ANSI colors in the progress display.
	 */
	public setAnsi(ansi: boolean): void {
		this.#useAnsi = ansi;
	}

	/**
	 * Disables any output.
	 */
	public disable(): void {
		this.#disabled = true;
	}

	/**
	 * Sets the header text for the progress display and triggers a redraw.
	 *
	 * @param header - The header text to set.
	 */
	public setHeader(header: string): void {
		if (this.#useAnsi) {
			this.header = header;
			this.redraw();
		} else {
			this.writeLine(header);
		}
	}

	/**
	 * Marks the progress display as finished and triggers a final redraw or write.
	 */
	public finish(): void {
		if (this.#useAnsi) {
			this.finished = true;
			this.redraw();
		} else {
			this.writeLine('Finished');
		}
	}

	/**
	 * Adds a new ProgressLabel to the collection and triggers a redraw of the progress display.
	 *
	 * @param name - The text label for the new progress item.
	 * @param indent - The indentation level for the new item.
	 * @returns The newly created ProgressLabel instance.
	 */
	public add(name: string, indent = 0): ProgressLabel {
		const label = new ProgressLabel(this, name, indent);
		this.labelList.push(label);
		this.redraw();

		return label;
	}

	/**
	 * Redraws the entire progress display, updating the terminal output.
	 */
	public redraw(): void {
		if (this.#disabled) return;
		if (!this.#useAnsi) return;

		if (!this.started) {
			// Clear the terminal and set up for drawing.
			this.write('\x1b[2J\x1b[3J\x1b[H\x1b7');
			this.started = true;
		}

		// Re-draw the progress display, including the header and all labels.
		this.write(
			[
				'\x1b8', // Restore cursor position.
				`\x1b[${this.finished ? 2 : 1}m${this.header ?? ''}\x1b[0m\n`, // Optionally set header with styling.
				...this.labelList.map((l) => l.getOutputAnsi()), // Generate ANSI output for each label.
				this.finished ? '\x1b[2mFinished\x1b[0m\n' : '', // Optionally mark as finished.
			].join('')
		);
	}

	/**
	 * Writes a line of text to the terminal, bypassing ANSI styling.
	 *
	 * @param line - The line of text to write.
	 */
	public writeLine(line: string): void {
		if (this.#disabled) return;
		this.write(line + '\n');
	}

	public write(text: string): void {
		process.stdout.write(text);
	}
}

// The singleton instance of Progress for use throughout the application.
const globalProgress = new Progress();
export default globalProgress;
