
import { ClassicLevel } from 'classic-level';

export class Cache {
	private readonly db: ClassicLevel<string, Buffer>;

	public constructor(folder: string) {
		this.db = new ClassicLevel(folder, { keyEncoding: 'utf8', valueEncoding: 'buffer' });
	}

	public async get(key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> {
		try {
			return await this.db.get(key);
		} catch (err) {
			const buffer = await cbBuffer();
			await this.db.put(key, buffer);
			return buffer;
		}
	}
}
