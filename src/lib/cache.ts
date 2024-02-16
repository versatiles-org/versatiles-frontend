
import { ClassicLevel } from 'classic-level';


const folder = new URL('../../cache', import.meta.url).pathname;
const db = new ClassicLevel<string, Buffer>(folder, { keyEncoding: 'utf8', valueEncoding: 'buffer' });

async function cache(key: string, cbBuffer: () => Promise<Buffer>): Promise<Buffer> {
	let buffer: Buffer | false = false;
	try {
		buffer = await db.get(key);
	} catch (err) {
	}

	if (buffer === false) {
		buffer = await cbBuffer();
		if (!(buffer instanceof Buffer)) throw Error();
		await db.put(key, buffer);
	} else {
		if (!(buffer instanceof Buffer)) throw Error();
	}

	return buffer;
}

export default cache;
