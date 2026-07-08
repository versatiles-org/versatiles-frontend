/**
 * A small wrapper around the global `fetch` that adds a request timeout and
 * retries transient failures (network errors and 5xx responses) with
 * exponential backoff. 4xx responses are returned as-is (not retried), since
 * they are not transient.
 */

export interface FetchRetryOptions {
	/** Number of additional attempts after the first (default 3). */
	retries?: number;
	/** Per-attempt timeout in milliseconds (default 30000). */
	timeoutMs?: number;
	/** Base backoff delay in milliseconds; doubles each attempt (default 500). */
	retryDelayMs?: number;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRetry(
	url: string,
	init: RequestInit = {},
	options: FetchRetryOptions = {}
): Promise<Response> {
	const { retries = 3, timeoutMs = 30000, retryDelayMs = 500 } = options;

	let lastError: unknown;
	for (let attempt = 0; attempt <= retries; attempt++) {
		// Use a manual controller instead of AbortSignal.timeout() so we can clear the timer
		// as soon as the request settles. An uncleared AbortSignal.timeout() keeps a pending
		// timer that fires later on the already-finished request, surfacing as an uncaught
		// DOMException [TimeoutError] mid-build.
		const controller = new AbortController();
		const timer = setTimeout(
			() => controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError')),
			timeoutMs
		);
		try {
			const response = await fetch(url, { ...init, signal: controller.signal });

			// Retry transient server errors; return everything else (incl. 4xx) to the caller.
			if (response.status >= 500 && attempt < retries) {
				lastError = new Error(`server responded ${response.status} for ${url}`);
				await delay(retryDelayMs * 2 ** attempt);
				continue;
			}
			return response;
		} catch (error) {
			// Network error or timeout (AbortError): retry with backoff until exhausted.
			lastError = error;
			if (attempt >= retries) break;
			await delay(retryDelayMs * 2 ** attempt);
		} finally {
			clearTimeout(timer);
		}
	}

	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
