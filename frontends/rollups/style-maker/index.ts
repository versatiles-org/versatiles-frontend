import MapMaker from './mapmaker';

init();

/**
 * Initialize the app once the DOM is ready.
 */
export function init(): void {
	if (document.readyState === 'complete') {
		// Call start() and let it handle any thrown errors
		start().catch(console.error);
	} else {
		// Listen again for 'readystatechange' until the document is complete
		document.addEventListener('readystatechange', init);
	}
}

/**
 * Retrieves an 'id' query parameter and runs MapMaker.
 */
async function start(): Promise<void> {
	const id = new URLSearchParams(window.location.search).get('id');
	if (!id) {
		throw new Error('id is not defined');
	}

	// Note: If globalThis.maplibregl isn't typed, you may need to cast it:
	//       (globalThis as any).maplibregl
	await MapMaker(globalThis.maplibregl, 'map', `/tiles/${id}/`);
}