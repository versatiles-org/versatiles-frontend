
export async function loadJSON(url: string): Promise<any> {
	const response = await fetch(url).catch(e => false);
	if (!(response instanceof Response)) return false;
	if (response.status !== 200) return false;
	return await response.json();
}


/**
 * Deeply clones an object or array, preserving nested structures.
 */
export function deepClone<T>(obj: T): T {
	if (typeof obj !== 'object' || obj === null) {
		return obj; // primitive
	}
	if (Array.isArray(obj)) {
		return obj.map((item) => deepClone(item)) as unknown as T;
	}
	const clone: Record<string, any> = {};
	for (const [key, val] of Object.entries(obj)) {
		clone[key] = deepClone(val);
	}
	return clone as T;
}

/**
 * Ensures a URL string is resolved as an absolute URL.
 * Accepts multiple arguments to apply sequentially:
 *   absoluteUrl("http://example.com", "foo/bar.json")
 */
export function absoluteUrl(...urls: string[]): string {
	let url = encodeURI(window.location.href);
	while (urls.length > 0) {
		const next = encodeURI(urls.shift()!);
		url = new URL(next, url).href;
	}
	return decodeURI(url);
}