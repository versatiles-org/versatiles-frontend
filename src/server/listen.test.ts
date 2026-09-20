import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server as HttpServer } from 'http';
import { listen, listenWithFallback } from './listen';

const servers: HttpServer[] = [];

function track(server: HttpServer): HttpServer {
	servers.push(server);
	return server;
}

afterEach(() => {
	while (servers.length > 0) servers.pop()?.close();
});

describe('listen', () => {
	it('resolves with the port the operating system picked for port 0', async () => {
		const result = await listen(express(), 0, '127.0.0.1');
		track(result.server);

		expect(result.port).toBeGreaterThan(0);
	});

	it('rejects with EADDRINUSE instead of resolving when the port is taken', async () => {
		const first = await listen(express(), 0, '127.0.0.1');
		track(first.server);

		// Express invokes its listen callback even when the bind failed, so this used to
		// look like a successful start while the first server kept answering.
		await expect(listen(express(), first.port, '127.0.0.1')).rejects.toThrow(/EADDRINUSE/);
	});
});

describe('listenWithFallback', () => {
	it('uses the preferred port when it is free', async () => {
		const free = await listen(express(), 0, '127.0.0.1');
		const preferred = free.port;
		await new Promise<void>((resolve) => free.server.close(() => resolve()));

		const result = await listenWithFallback(express(), preferred, '127.0.0.1');
		track(result.server);

		expect(result.port).toBe(preferred);
	});

	it('moves to the next port and reports the busy one', async () => {
		const blocker = await listen(express(), 0, '127.0.0.1');
		track(blocker.server);

		const busy: number[] = [];
		const result = await listenWithFallback(express(), blocker.port, '127.0.0.1', (port) => busy.push(port));
		track(result.server);

		// Only the blocked port is known to be taken. The ones after it belong to the machine, and
		// anything - a parallel test worker included - may hold one, so asserting that the walk
		// stopped after exactly one step made this test fail on roughly a quarter of runs. Assert
		// the shape of the walk instead: it starts at the preferred port, steps one at a time, and
		// binds the first port it did not report as busy.
		expect(busy[0]).toBe(blocker.port);
		expect(busy).toStrictEqual(Array.from({ length: busy.length }, (_, index) => blocker.port + index));
		expect(result.port).toBe(blocker.port + busy.length);
	});

	it('falls back to an arbitrary free port when every candidate is busy', async () => {
		const blocker = await listen(express(), 0, '127.0.0.1');
		track(blocker.server);

		// attempts = 1, so the only candidate is the blocked port.
		const result = await listenWithFallback(express(), blocker.port, '127.0.0.1', undefined, 1);
		track(result.server);

		expect(result.port).toBeGreaterThan(0);
		expect(result.port).not.toBe(blocker.port);
	});
});
