/**
 * MapDesignerControl is a custom control for MapLibre GL JS maps that allows users to switch between different map styles.
 */
class MapDesignerControl {
	/**
	 * Initializes a new instance of the MapDesignerControl.
	 * @param {Object} config Configuration options for the control.
	 */
	constructor(config) {
		this.config = config;
	}

	/**
	 * Returns the default position for the control on the map.
	 * @returns {string} The default position.
	 */
	getDefaultPosition() {
		return 'top-right';
	}

	/**
	 * Called when the control is added to the map.
	 * @param {Map} map The MapLibre GL JS map instance.
	 * @returns {HTMLElement} The element containing the control.
	 */
	onAdd(map) {
		this.map = map;
		this.mapDesigner = getMapDesigner(map, this.config);

		return this.mapDesigner.container;
	}

	/**
	 * Called when the control is removed from the map.
	 */
	onRemove() {
		if (!this.buttonContainer || !this.map) {
			return;
		}

		this.button.removeEventListener('click', this.onDocumentClick);
		this.buttonContainer.remove();
		document.removeEventListener('click', this.onDocumentClick);

		// Clean up references
		this.map = undefined;
	}
}

function getMapDesigner(map, config) {
	const container = createElementFromHTML('<div></div>');

	const styles = VersaTilesStyle.styles; // Assuming VersaTilesStyle.styles is defined elsewhere
	let currentStyle = styles.colorful; // Default style

	document.addEventListener('click', onDocumentClick);
	const button = getButton();
	const { list, listContainer } = getListContainer();

	updateStyle();

	return { container };

	function updateStyle() {
		map.setStyle(currentStyle(config));
	}

	function onDocumentClick(event) {
		if (!button.contains(event.target)) {
			listContainer.style.display = 'none';
		}
	}

	function getButton() {
		// Create button container
		const buttonContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');
		container.appendChild(buttonContainer);

		// Create style toggle button
		const button = createElementFromHTML('<button type="button" class="maplibregl-ctrl-icon maplibregl-style-switcher"></button>');
		buttonContainer.appendChild(button);

		// Toggle style list display
		button.addEventListener('click', () => {
			listContainer.style.display = listContainer.style.display === 'block' ? 'none' : 'block';
		});

		return button;
	}

	function getListContainer() {

		// Create list container
		const listContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');
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
				const target = event.target;
				if (target.classList.contains('active')) return;

				listContainer.style.display = 'none';
				button.style.display = 'block';
				listContainer.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				target.classList.add('active');

				currentStyle = style;
				updateStyle();
			});

			if (style === currentStyle) {
				styleElement.classList.add('active');
			}
			list.appendChild(styleElement);
		});

		return { list, listContainer };
	}

	function createElementFromHTML(htmlString) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlString, 'text/html');
		return doc.body.firstChild; // Returns the first element
	}
}