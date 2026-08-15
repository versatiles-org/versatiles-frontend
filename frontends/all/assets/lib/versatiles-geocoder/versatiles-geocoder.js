/**
 * Location search (address geocoding) powered by the VersaTiles Photon backend.
 *
 * Shared by every frontend that offers search, so the backend URL and the result
 * mapping live in one place. Depends on the `MaplibreGeocoder` and `maplibregl`
 * globals, but only when called - so invoke it once those libraries have run,
 * e.g. from a DOMContentLoaded handler:
 *
 *   map.addControl(createVersaTilesGeocoder(), 'top-left');
 */
function createVersaTilesGeocoder() {
	return new MaplibreGeocoder(
		{
			forwardGeocode: async (config) => {
				const url = `https://geocode.versatiles.org/api?q=${encodeURIComponent(config.query)}&limit=5`;
				const geojson = await (await fetch(url)).json();
				geojson.features.forEach((f) => {
					const { name, city, country } = f.properties;
					f.place_name = [name, city, country].filter(Boolean).join(', ');
					f.place_type = ['place'];
					f.center = f.geometry.coordinates;
				});
				return geojson;
			},
		},
		{ maplibregl, marker: false, placeholder: 'Search location' }
	);
}
