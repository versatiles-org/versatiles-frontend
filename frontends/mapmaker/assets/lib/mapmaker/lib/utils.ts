
export async function loadJSON(url: string): Promise<any> {
	let response = await fetch(url).catch(e => false);
	if (!(response instanceof Response)) return false;
	if (response.status !== 200) return false;
	return await response.json();
}
