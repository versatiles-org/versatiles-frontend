import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Readable } from 'node:stream';

/**
 * Deletes the contents of a folder recursively and recreates it.
 * 
 * @param path - The path to the folder to clean up.
 */
export function cleanupFolder(path: string): void {
	if (existsSync(path)) {
		// If the folder exists, remove it and all its contents.
		rmSync(path, { recursive: true, maxRetries: 3, retryDelay: 100 });
	}
	// Recreate the folder after deletion.
	ensureFolder(path);
}

/**
 * Ensures that a folder exists, creating it (and any necessary parent directories) if it does not.
 * 
 * @param path - The path to the folder to ensure.
 */
export function ensureFolder(path: string): void {
	if (existsSync(path)) return; // If the folder already exists, do nothing.
	ensureFolder(dirname(path)); // Ensure the parent directory exists.
	mkdirSync(path); // Create the folder.
}
