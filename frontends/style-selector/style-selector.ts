import { styles } from '@versatiles/style';
import type { default as maplibre } from 'maplibre-gl';

type Style = typeof styles.colorful | typeof styles.eclipse | typeof styles.graybeard | typeof styles.neutrino;

export interface StyleSelectorConfig {
	tiles: string[];
}

export class StyleSelector {
	public container: HTMLElement;
	private currentStyle: Style;
	private map: maplibre.Map;
	private config: StyleSelectorConfig;
	private button: HTMLElement;
	private listContainer: HTMLElement;
	private knownStyles: { [name: string]: Style };

	constructor(map: maplibre.Map, config: StyleSelectorConfig) {
		this.map = map;
		this.config = config;
		this.onDocumentClickHandler = this.onDocumentClickHandler.bind(this);

		this.knownStyles = { ...styles };
		delete this.knownStyles.empty; // Remove empty style from list

		this.currentStyle = this.knownStyles.colorful; // Default style

		const container = this.container = createElementFromHTML('<div></div>');

		document.addEventListener('click', this.onDocumentClickHandler);

		// Create button container
		const buttonContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');
		container.appendChild(buttonContainer);

		// Create style toggle button
		this.button = createElementFromHTML('<button type="button" class="maplibregl-ctrl-icon maplibregl-style-switcher"></button>');
		buttonContainer.appendChild(this.button);

		// Toggle style list display
		this.button.addEventListener('click', () => {
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
		Object.entries(this.knownStyles).forEach(([name, style]) => {
			const styleElement = createElementFromHTML(`<button type="button">${name}</button>`);

			// Style selection event
			styleElement.addEventListener('click', (event) => {
				const target = event.target as HTMLElement;
				if (target.classList.contains('active')) return;

				listContainer.style.display = 'none';
				this.button.style.display = 'block';
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
}


export function createElementFromHTML(htmlString: string): HTMLElement {
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlString, 'text/html');
	return doc.body.firstChild as HTMLElement; // Returns the first element
}


