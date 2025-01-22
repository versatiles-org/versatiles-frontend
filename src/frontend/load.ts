import type { FrontendConfig } from './frontend';

/**
 * Loads frontend configurations from a `frontends.json` file.
 * 
 * @returns An array of FrontendConfig objects.
 */
export async function loadFrontendConfigs(): Promise<FrontendConfig[]> {
	return (await import('../../frontends/config.ts?' + Date.now())).frontendConfigs;
}
