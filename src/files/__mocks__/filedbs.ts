import { FileDBs } from '../filedbs';
import { MockedFileDB } from './filedb';



export class MockedFileDBs extends FileDBs {
	constructor(testFileDBs?: Record<string, Record<string, string>>) {
		super();
		if (testFileDBs) {
			Object.entries(testFileDBs).forEach(([name, testFiles]) => {
				this.fileDBs.set(name, new MockedFileDB(testFiles));
			});
		}
	}
	public enterWatchMode(): void {
	}
}
