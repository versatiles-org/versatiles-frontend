import { describe, it, expect, afterEach } from 'vitest';
import { LandingPage, renderPage, type LandingEntry } from './landing';

const entries: LandingEntry[] = [
	{ name: 'frontend', description: 'Full standard frontend.', port: 50001 },
	{ name: 'frontend-tiny', description: 'Minimal frontend.', port: 50002 },
];

describe('renderPage', () => {
	it('links to every frontend on its own port', () => {
		const html = renderPage(entries);

		expect(html).toContain('http://localhost:50001/');
		expect(html).toContain('http://localhost:50002/');
		expect(html).toContain('frontend-tiny');
		expect(html).toContain('Minimal frontend.');
	});

	it('escapes names and descriptions', () => {
		const html = renderPage([{ name: '<script>x</script>', description: 'a & b', port: 1 }]);

		expect(html).not.toContain('<script>x</script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('a &amp; b');
	});

	it('renders without any entries', () => {
		const html = renderPage([]);

		expect(html).toContain('<html');
		expect(html).toContain('VersaTiles');
	});
});

describe('LandingPage', () => {
	const pages: LandingPage[] = [];

	afterEach(async () => {
		while (pages.length > 0) await pages.pop()?.stop();
	});

	function createPage(): LandingPage {
		const page = new LandingPage(entries);
		pages.push(page);
		return page;
	}

	it('serves the overview', async () => {
		const port = await createPage().start(0, '127.0.0.1');
		const response = await fetch(`http://localhost:${port}/`);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/html');
		expect(await response.text()).toContain('http://localhost:50001/');
	});

	it('serves the overview on any path', async () => {
		const port = await createPage().start(0, '127.0.0.1');
		const response = await fetch(`http://localhost:${port}/anything`);

		expect(response.status).toBe(200);
	});

	it('starts on the next port when the preferred one is taken', async () => {
		const taken = await createPage().start(0, '127.0.0.1');

		const busy: number[] = [];
		const port = await createPage().start(taken, '127.0.0.1', (p) => busy.push(p));

		expect(busy).toStrictEqual([taken]);
		expect(port).not.toBe(taken);
	});
});
