/**
 * Location search (address geocoding) powered by the VersaTiles Photon backend.
 *
 * A self-contained MapLibre control: it renders its own input and result list, so it needs
 * no geocoder library. Add it once the map exists:
 *
 *   map.addControl(createVersaTilesGeocoder(), 'top-left');
 */

const API_URL = 'https://geocode.versatiles.org/api';
const RESULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;

// The backend answers 400 for any other language, so an unsupported locale must omit it.
const SUPPORTED_LANGUAGES = ['de', 'en', 'fr'];

// Photon returns an extent only for areas. Points (most POIs) get a zoom by result type.
const ZOOM_BY_TYPE = {
	country: 4,
	state: 6,
	county: 8,
	city: 11,
	district: 13,
	locality: 14,
	street: 16,
	house: 17,
};
const DEFAULT_ZOOM = 14;

// Buildings can be a few metres across; without a cap their extent would zoom in absurdly far.
const MAX_FIT_ZOOM = 17;
const FIT_PADDING = 60;

let instanceCount = 0;

class VersaTilesGeocoderControl {
	constructor(options = {}) {
		this._placeholder = options.placeholder ?? 'Search location';
		this._id = `versatiles-geocoder-${++instanceCount}`;
		this._features = [];
		this._highlighted = -1;
		this._timer = undefined;
		this._controller = undefined;
	}

	onAdd(map) {
		this._map = map;

		this._container = document.createElement('div');
		this._container.className = 'maplibregl-ctrl versatiles-geocoder';

		this._input = document.createElement('input');
		this._input.className = 'versatiles-geocoder-input';
		this._input.type = 'text';
		this._input.placeholder = this._placeholder;
		this._input.setAttribute('autocomplete', 'off');
		this._input.setAttribute('role', 'combobox');
		this._input.setAttribute('aria-autocomplete', 'list');
		this._input.setAttribute('aria-expanded', 'false');
		this._input.setAttribute('aria-controls', `${this._id}-list`);
		this._input.setAttribute('aria-label', this._placeholder);

		this._list = document.createElement('ul');
		this._list.className = 'versatiles-geocoder-results';
		this._list.id = `${this._id}-list`;
		this._list.setAttribute('role', 'listbox');
		this._list.hidden = true;

		this._container.append(this._input, this._list);

		this._input.addEventListener('input', () => this._scheduleSearch());
		this._input.addEventListener('keydown', (event) => this._onKeyDown(event));
		this._input.addEventListener('focus', () => {
			if (this._features.length > 0) this._open();
		});
		// Closing on blur would fire before a click on a result registers, so the list
		// suppresses the blur instead and handles the click itself.
		this._list.addEventListener('mousedown', (event) => event.preventDefault());
		this._input.addEventListener('blur', () => this._close());

		// The map reacts to the same keys (e.g. arrows pan, +/- zoom) while typing.
		this._container.addEventListener('keydown', (event) => event.stopPropagation());
		this._container.addEventListener('dblclick', (event) => event.stopPropagation());

		return this._container;
	}

	onRemove() {
		clearTimeout(this._timer);
		this._controller?.abort();
		this._container.remove();
		this._map = undefined;
	}

	_scheduleSearch() {
		clearTimeout(this._timer);
		this._timer = setTimeout(() => void this._search(), DEBOUNCE_MS);
	}

	async _search() {
		const query = this._input.value.trim();
		if (query.length < MIN_QUERY_LENGTH) {
			this._features = [];
			this._close();
			return;
		}

		// Drop the previous request: a slow answer to an older query must not replace a newer list.
		this._controller?.abort();
		const controller = new AbortController();
		this._controller = controller;

		try {
			const response = await fetch(this._buildUrl(query), { signal: controller.signal });
			if (!response.ok) throw new Error(`geocoder responded ${response.status}`);
			const { features } = await response.json();
			this._features = Array.isArray(features) ? features : [];
			this._render();
		} catch (error) {
			if (error.name === 'AbortError') return; // superseded by a newer query
			this._features = [];
			this._renderMessage('Search unavailable');
		}
	}

	_buildUrl(query) {
		const url = new URL(API_URL);
		url.searchParams.set('q', query);
		url.searchParams.set('limit', String(RESULT_LIMIT));

		// Bias towards what the user is looking at: "Springfield" should find the nearby one.
		const center = this._map.getCenter();
		url.searchParams.set('lat', center.lat.toFixed(5));
		url.searchParams.set('lon', center.lng.toFixed(5));

		const language = preferredLanguage();
		if (language) url.searchParams.set('lang', language);

		return url;
	}

	_render() {
		this._highlighted = -1;
		this._list.replaceChildren();

		if (this._features.length === 0) {
			this._renderMessage('No results');
			return;
		}

		this._features.forEach((feature, index) => {
			const item = document.createElement('li');
			item.className = 'versatiles-geocoder-result';
			item.id = `${this._id}-option-${index}`;
			item.setAttribute('role', 'option');
			item.setAttribute('aria-selected', 'false');

			const title = document.createElement('span');
			title.className = 'versatiles-geocoder-title';
			title.textContent = title_(feature.properties);

			const context = document.createElement('span');
			context.className = 'versatiles-geocoder-context';
			context.textContent = context_(feature.properties);

			item.append(title, context);
			item.addEventListener('click', () => this._select(index));
			this._list.append(item);
		});

		this._open();
	}

	_renderMessage(message) {
		this._list.replaceChildren();
		const item = document.createElement('li');
		item.className = 'versatiles-geocoder-message';
		item.textContent = message;
		this._list.append(item);
		this._open();
	}

	_onKeyDown(event) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this._highlight(this._highlighted + 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				this._highlight(this._highlighted - 1);
				break;
			case 'Enter':
				event.preventDefault();
				// Nothing highlighted means the first result, so Enter always does something.
				this._select(this._highlighted < 0 ? 0 : this._highlighted);
				break;
			case 'Escape':
				event.preventDefault();
				this._close();
				break;
		}
	}

	_highlight(index) {
		const items = this._list.querySelectorAll('.versatiles-geocoder-result');
		if (items.length === 0) return;

		this._highlighted = (index + items.length) % items.length;
		items.forEach((item, i) => {
			const active = i === this._highlighted;
			item.classList.toggle('is-highlighted', active);
			item.setAttribute('aria-selected', String(active));
		});
		this._input.setAttribute('aria-activedescendant', items[this._highlighted].id);
	}

	_select(index) {
		const feature = this._features[index];
		if (!feature) return;

		this._input.value = title_(feature.properties);
		this._close();
		this._goTo(feature);
	}

	_goTo(feature) {
		const { extent, type } = feature.properties;

		if (Array.isArray(extent) && extent.length === 4) {
			// Photon orders the extent [west, north, east, south], not the usual GeoJSON bbox
			// [west, south, east, north]. fitBounds happens to normalise the latitudes either
			// way, but naming them correctly keeps the mapping obvious for anyone reusing it.
			const [west, north, east, south] = extent;
			this._map.fitBounds(
				[
					[west, south],
					[east, north],
				],
				{ padding: FIT_PADDING, maxZoom: MAX_FIT_ZOOM }
			);
			return;
		}

		this._map.flyTo({ center: feature.geometry.coordinates, zoom: ZOOM_BY_TYPE[type] ?? DEFAULT_ZOOM });
	}

	_open() {
		this._list.hidden = false;
		this._input.setAttribute('aria-expanded', 'true');
	}

	_close() {
		this._list.hidden = true;
		this._highlighted = -1;
		this._input.setAttribute('aria-expanded', 'false');
		this._input.removeAttribute('aria-activedescendant');
	}
}

/**
 * The label of a result, e.g. "Adlon Kempinski" or "Unter den Linden 77".
 */
function title_(properties) {
	if (properties.name) return properties.name;
	return [properties.street, properties.housenumber].filter(Boolean).join(' ') || 'Unnamed';
}

/**
 * The second line of a result, locating it well enough to tell duplicates apart.
 */
function context_(properties) {
	const street = properties.name && properties.street ? [properties.street, properties.housenumber] : [];
	return [
		street.filter(Boolean).join(' '),
		[properties.postcode, properties.city].filter(Boolean).join(' '),
		properties.state,
		properties.country,
	]
		.filter(Boolean)
		.join(', ');
}

/**
 * The first browser language the backend actually supports, or null to let it decide.
 */
function preferredLanguage() {
	const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
	for (const tag of tags) {
		const code = String(tag ?? '')
			.toLowerCase()
			.split('-')[0];
		if (SUPPORTED_LANGUAGES.includes(code)) return code;
	}
	return null;
}

function createVersaTilesGeocoder(options) {
	return new VersaTilesGeocoderControl(options);
}
