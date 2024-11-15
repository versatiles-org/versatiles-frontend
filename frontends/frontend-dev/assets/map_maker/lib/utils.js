
export async function loadJSON(url) {
	let response = await fetch(url).catch(e => false);
	if (!response || response.status !== 200) return false;
	return await response.json();
}
