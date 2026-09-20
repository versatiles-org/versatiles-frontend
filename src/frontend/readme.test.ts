import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { frontendConfigs } from '../../frontends/config';

/**
 * The README lists every frontend by hand, so it silently drifts whenever one is added or
 * renamed in `frontends/config.ts` - `frontend-blank` went undocumented for exactly that
 * reason. These tests make the config the single source of truth.
 */
const readme = readFileSync(resolve(import.meta.dirname, '../../README.md'), 'utf8');

/** The bullet list under "## Available Frontends", up to the next heading. */
function availableFrontendsSection(): string {
	const match = readme.match(/^## Available Frontends$(.*?)^##/ms);
	if (!match) throw Error('README has no "## Available Frontends" section');
	return match[1];
}

describe('README', () => {
	it('lists every configured frontend with its description', () => {
		const section = availableFrontendsSection();
		const documented = [...section.matchAll(/^- \*\*(.+?)\*\*: (.+)$/gm)].map(([, name, description]) => ({
			name,
			description,
		}));

		// Compared as whole lists, so an extra, missing, misspelled or reordered entry all show
		// up as one readable diff.
		expect(documented).toStrictEqual(
			frontendConfigs.map((config) => ({ name: config.name, description: config.description }))
		);
	});

	it('states the correct number of frontends in the build instructions', () => {
		const counts = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
		const expected = counts[frontendConfigs.length] ?? String(frontendConfigs.length);

		expect(readme).toContain(`This will generate all ${expected} frontends:`);
	});

	it('names every frontend in the build instructions', () => {
		const match = readme.match(/^This will generate all \w+ frontends: (.+)\.$/m);
		if (!match) throw Error('README has no "This will generate all ... frontends:" sentence');

		const named = [...match[1].matchAll(/`([^`]+)`/g)].map(([, name]) => name);
		expect(named).toStrictEqual(frontendConfigs.map((config) => config.name));
	});
});
