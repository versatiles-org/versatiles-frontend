/**
 * VersaTiles branding: the logo and name, linking to versatiles.org, and a link to the
 * donation page.
 *
 * A MapLibre control rather than a link placed over the map: MapLibre stacks the controls
 * of a corner, so the branding can't overlap the styler or other controls. Add it first, so
 * it sits on top of its corner:
 *
 *   map.addControl(createVersaTilesBrand(), 'top-left');
 */

const BRAND_HOME_URL = 'https://versatiles.org';
const BRAND_SUPPORT_URL = 'https://versatiles.org/donate/';
const BRAND_LOGO_URL = '/assets/images/versatiles-logo.png';

const BRAND_HEART_SVG =
	'<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
	'<path fill="#e5484d" d="M12 21s-7.5-4.6-10-9.3C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.8h2.4c.8-1.5 2.4-2.8 4.6-2.8 3.9 0 5.8 4.1 4.2 7.2C19.5 16.4 12 21 12 21z"/>' +
	'</svg>';

class VersaTilesBrandControl {
	onAdd() {
		this._container = document.createElement('div');
		this._container.className = 'maplibregl-ctrl versatiles-brand';

		const home = document.createElement('a');
		home.className = 'versatiles-brand-home';
		home.href = BRAND_HOME_URL;
		home.title = 'VersaTiles website';
		// The name is hidden on narrow screens, so the logo carries the link's accessible name.
		home.innerHTML =
			`<img src="${BRAND_LOGO_URL}" alt="VersaTiles" width="24" height="24" />` +
			'<span class="versatiles-brand-name" aria-hidden="true">VersaTiles</span>';

		const support = document.createElement('a');
		support.className = 'versatiles-brand-support';
		support.href = BRAND_SUPPORT_URL;
		support.title = 'Support VersaTiles with a donation';
		support.innerHTML = `${BRAND_HEART_SVG}<span>Support us</span>`;

		this._container.append(home, support);
		return this._container;
	}

	onRemove() {
		this._container.remove();
	}
}

function createVersaTilesBrand() {
	return new VersaTilesBrandControl();
}
