

import express from 'express';
import type { FileSystem } from './file_system.js';
import type { Express } from 'express';

export class Server {
	private readonly app: Express;

	public constructor(fileSystem: FileSystem) {
		this.app = express();

		this.app.get('*', (req, res) => {
			let { path } = req;
			path = path.replace(/^\/+/, '');

			const buffer = fileSystem.getFile(path);
			if (buffer == null) {
				res.status(404).end(`path "${path}" not found. Maybe add an "index.html"?`);
			} else {
				res.status(200).end(buffer);
			}
		});
	}

	public async start(): Promise<void> {
		return new Promise(res => this.app.listen(8080, () => {
			console.log('Server started: http://localhost:8080/');
			res();
		}));
	}
}
