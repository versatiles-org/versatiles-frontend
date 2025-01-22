import { MockedFile } from './file';
import { FileDB } from '../filedb';

export class MockedFileDB extends FileDB {
	constructor(testFiles?: Record<string, string>) {
		super();
		if (testFiles) {
			Object.entries(testFiles).forEach(([name, content]) => {
				this.files.set(name, new MockedFile(name, 12345, Buffer.from(content)));
			});
		}
	}
	public enterWatchMode(): void {
	}
}
