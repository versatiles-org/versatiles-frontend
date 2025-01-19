import { styles } from '@versatiles/style';
import type { default as mapNS } from 'maplibre-gl';

const { colorful, eclipse, graybeard, neutrino } = styles;
type Style = typeof colorful | typeof eclipse | typeof graybeard | typeof neutrino;

export class StyleSelector {
	public container: HTMLElement;
	private currentStyle: Style;
	private map: mapNS.Map;
	private config: any;
	private button: HTMLElement;
	private listContainer: HTMLElement;

	constructor(map: mapNS.Map, config: any) {
		this.map = map;
		this.config = config;
		const container = this.container = createElementFromHTML('<div></div>');
		this.currentStyle = styles.colorful; // Default style

		document.addEventListener('click', this.onDocumentClickHandler);

		// Create button container
		const buttonContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');
		container.appendChild(buttonContainer);

		// Create style toggle button
		const button = this.button = createElementFromHTML('<button type="button" class="maplibregl-ctrl-icon maplibregl-style-switcher"></button>');
		buttonContainer.appendChild(button);

		// Toggle style list display
		button.addEventListener('click', () => {
			listContainer.style.display = listContainer.style.display === 'block' ? 'none' : 'block';
		});

		// Create list container
		const listContainer = this.listContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');
		container.appendChild(listContainer);
		listContainer.style.display = 'none';

		// Create style selector container
		const list = createElementFromHTML('<div class="maplibregl-style-list"></div>');
		listContainer.appendChild(list);

		// Populate style options
		Object.entries(styles).forEach(([name, style]) => {
			const styleElement = createElementFromHTML(`<button type="button">${name}</button>`);

			// Style selection event
			styleElement.addEventListener('click', (event) => {
				const target = event.target as HTMLElement;
				if (target.classList.contains('active')) return;

				listContainer.style.display = 'none';
				button.style.display = 'block';
				listContainer.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				target.classList.add('active');

				this.currentStyle = style;
				this.updateStyle();
			});

			if (style === this.currentStyle) {
				styleElement.classList.add('active');
			}
			list.appendChild(styleElement);
		});

		this.updateStyle();
	}

	private updateStyle() {
		this.map.setStyle(this.currentStyle(this.config));
	}

	private onDocumentClickHandler(event: MouseEvent) {
		if (!this.button.contains(event.target as Node)) {
			this.listContainer.style.display = 'none';
		}
	}

	public destroy() {
		document.removeEventListener('click', this.onDocumentClickHandler);
	}
}


export function createElementFromHTML(htmlString: string): HTMLElement {
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlString, 'text/html');
	return doc.body.firstChild as HTMLElement; // Returns the first element
}


