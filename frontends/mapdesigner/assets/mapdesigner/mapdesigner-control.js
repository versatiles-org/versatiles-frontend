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
		this.styles = VersaTilesStyle.styles; // Assuming VersaTilesStyle.styles is defined elsewhere
		this.currentStyle = this.styles.colorful; // Default style
		this.onDocumentClick = this.onDocumentClick.bind(this); // Bind to maintain `this` context
	}

	/**
	 * Updates the map style based on the currentStyle property.
	 * @private
	 */
	_updateStyle() {
		const config = { ...this.config };
		this.map.setStyle(this.currentStyle(config));
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

		// Create control container
		this.controlContainer = createElementFromHTML('<div class="maplibregl-ctrl maplibregl-ctrl-group"></div>');

		// Create style selector container
		this.listContainer = createElementFromHTML('<div class="maplibregl-style-list"></div>');
		this.controlContainer.appendChild(this.listContainer);

		// Create style toggle button
		this.controlButton = createElementFromHTML('<button type="button" class="maplibregl-ctrl-icon maplibregl-style-switcher"></button>');
		this.controlContainer.appendChild(this.controlButton);

		// Populate style options
		Object.entries(this.styles).forEach(([name, style]) => {
			const styleElement = createElementFromHTML(`<button type="button">${name}</button>`);
			styleElement.dataset.uri = JSON.stringify(style.uri);

			// Style selection event
			styleElement.addEventListener('click', (event) => {
				const target = event.target;
				if (target.classList.contains('active')) return;

				this.listContainer.style.display = 'none';
				this.controlButton.style.display = 'block';
				this.listContainer.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
				target.classList.add('active');

				this.currentStyle = style;
				this._updateStyle();
			});

			if (style === this.currentStyle) {
				styleElement.classList.add('active');
			}
			this.listContainer.appendChild(styleElement);
		});

		// Toggle style list display
		this.controlButton.addEventListener('click', () => {
			this.controlButton.style.display = 'none';
			this.listContainer.style.display = 'block';
		});

		document.addEventListener('click', this.onDocumentClick);

		// Set initial map style
		this._updateStyle();

		return this.controlContainer;
	}

	/**
	 * Called when the control is removed from the map.
	 */
	onRemove() {
		if (!this.controlContainer || !this.map) {
			return;
		}

		this.controlButton.removeEventListener('click', this.onDocumentClick);
		this.controlContainer.remove();
		document.removeEventListener('click', this.onDocumentClick);

		// Clean up references
		this.map = undefined;
	}

	/**
	 * Handles document click events to close the style selector when clicking outside.
	 * @param {Event} event The click event.
	 * @private
	 */
	onDocumentClick(event) {
		if (!this.controlContainer.contains(event.target)) {
			this.listContainer.style.display = 'none';
			this.controlButton.style.display = 'block';
		}
	}
}

function createElementFromHTML(htmlString) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(htmlString, 'text/html');
	return doc.body.firstChild; // Returns the first element
}