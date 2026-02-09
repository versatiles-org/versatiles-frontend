import { vi, describe, it, expect, afterEach } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import type { Frontend } from '../frontend/frontend';
import { parseDevConfig, Server } from './server';

// Helper to create a mock Frontend
function createMockFrontend(files: Record<string, string>): Frontend {
	return {
		getFile(path: string): Buffer | null {
			if (path in files) return Buffer.from(files[path]);
			return null;
		},
	} as Frontend;
}

// Helper to start the server on a random port and return base URL + cleanup function
function startTestServer(server: Server): { baseUrl: string; httpServer: http.Server } {
	// Access private app for testing
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const app = (server as any).app;
	const httpServer = http.createServer(app);
	httpServer.listen(0);
	const port = (httpServer.address() as AddressInfo).port;
	return { baseUrl: `http://localhost:${port}`, httpServer };
}

// Helper to make a GET request
async function get(baseUrl: string, path: string): Promise<{ status: number; body: string; headers: Headers }> {
	const response = await fetch(`${baseUrl}${path}`);
	const body = await response.text();
	return { status: response.status, body, headers: response.headers };
}

describe('parseDevConfig', () => {
	it('returns empty config for empty object', () => {
		expect(parseDevConfig({})).toStrictEqual({});
	});

	it('parses valid proxy config', () => {
		const config = parseDevConfig({
			proxy: [{ from: '/api/', to: 'http://localhost:3000/api/' }],
		});
		expect(config).toStrictEqual({
			proxy: [{ from: '/api/', to: 'http://localhost:3000/api/' }],
		});
	});

	it('throws for non-object input', () => {
		expect(() => parseDevConfig(null)).toThrow("Invalid 'dev' property");
		expect(() => parseDevConfig('string')).toThrow("Invalid 'dev' property");
		expect(() => parseDevConfig(42)).toThrow("Invalid 'dev' property");
	});

	it('throws for invalid proxy config', () => {
		expect(() => parseDevConfig({ proxy: 'not-array' })).toThrow("Invalid 'proxy' configuration");
		expect(() => parseDevConfig({ proxy: [{ from: '/a/' }] })).toThrow("Invalid 'proxy' configuration");
		expect(() => parseDevConfig({ proxy: [{ from: 123, to: '/b/' }] })).toThrow("Invalid 'proxy' configuration");
		expect(() => parseDevConfig({ proxy: [null] })).toThrow("Invalid 'proxy' configuration");
	});
});

describe('Server', () => {
	let httpServer: http.Server;
	let baseUrl: string;

	afterEach(() => {
		vi.restoreAllMocks();
		if (httpServer) httpServer.close();
	});

	function setup(files: Record<string, string>, config?: ConstructorParameters<typeof Server>[1]) {
		const frontend = createMockFrontend(files);
		const server = new Server(frontend, config);
		const result = startTestServer(server);
		httpServer = result.httpServer;
		baseUrl = result.baseUrl;
	}

	it('serves a file with correct MIME type', async () => {
		setup({ 'index.html': '<h1>Hello</h1>' });
		const res = await get(baseUrl, '/index.html');

		expect(res.status).toBe(200);
		expect(res.body).toBe('<h1>Hello</h1>');
		expect(res.headers.get('content-type')).toContain('text/html');
	});

	it('serves index.html for directory paths', async () => {
		setup({ 'index.html': '<h1>Root</h1>' });
		const res = await get(baseUrl, '/');

		expect(res.status).toBe(200);
		expect(res.body).toBe('<h1>Root</h1>');
	});

	it('strips leading slashes for file lookup', async () => {
		setup({ 'style.css': 'body {}' });
		const res = await get(baseUrl, '/style.css');

		expect(res.status).toBe(200);
		expect(res.body).toBe('body {}');
		expect(res.headers.get('content-type')).toContain('text/css');
	});

	it('returns 404 for missing files', async () => {
		setup({});
		const res = await get(baseUrl, '/missing.txt');

		expect(res.status).toBe(404);
		expect(res.body).toContain('not found');
	});

	it('escapes HTML in 404 response', async () => {
		setup({});
		// fetch URL-encodes special characters, so req.path receives the encoded form.
		// Verify the 404 body does not contain unescaped angle brackets from the path.
		const res = await get(baseUrl, '/some%3Cscript%3Epath');

		expect(res.status).toBe(404);
		expect(res.body).toContain('not found');
		expect(res.body).not.toContain('<script>');
	});

	it('proxies requests matching proxy config', async () => {
		// Start a small backend to proxy to
		const backend = http.createServer((_req, res) => {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end('{"ok":true}');
		});
		backend.listen(0);
		const backendPort = (backend.address() as AddressInfo).port;

		try {
			setup({}, { proxy: [{ from: '/api/', to: `http://localhost:${backendPort}/api/` }] });
			const res = await get(baseUrl, '/api/data');

			expect(res.status).toBe(200);
			expect(res.body).toBe('{"ok":true}');
			expect(res.headers.get('content-type')).toContain('application/json');
		} finally {
			backend.close();
		}
	});

	it('returns 502 when proxy fetch fails', async () => {
		// Use a port that nothing is listening on
		setup({}, { proxy: [{ from: '/api/', to: 'http://localhost:1/' }] });
		const res = await get(baseUrl, '/api/data');

		expect(res.status).toBe(502);
		expect(res.body).toBe('proxy error');
	});

	it('returns 404 when no proxy rule matches', async () => {
		setup({}, { proxy: [{ from: '/api/', to: 'http://localhost:1/' }] });
		const res = await get(baseUrl, '/other/path');

		expect(res.status).toBe(404);
	});

	it('uses octet-stream for unknown file types', async () => {
		setup({ 'data.xyz': 'binary' });
		const res = await get(baseUrl, '/data.xyz');

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('application/octet-stream');
	});
});
