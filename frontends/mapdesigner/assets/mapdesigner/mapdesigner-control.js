class MapDesignerControl {
	constructor(config) {
		this.config = config;
		this.styles = VersaTilesStyle.styles;
		this.currentStyle = this.styles.colorful;
		this.onDocumentClick = this.onDocumentClick.bind(this);
	}
	_updateStyle() {
		const config = { ...this.config };
		this.map.setStyle(this.currentStyle(config));
	}
	getDefaultPosition() {
		const defaultPosition = 'top-right';
		return defaultPosition;
	}
	onAdd(map) {
		this.map = map;
		this.controlContainer = document.createElement('div');
		this.controlContainer.classList.add('maplibregl-ctrl');
		this.controlContainer.classList.add('maplibregl-ctrl-group');
		this.mapStyleContainer = document.createElement('div');
		this.styleButton = document.createElement('button');
		this.styleButton.type = 'button';
		this.mapStyleContainer.classList.add('maplibregl-style-list');
		Object.entries(this.styles).forEach(([name, style]) => {
			const styleElement = document.createElement('button');
			styleElement.type = 'button';
			styleElement.innerText = name;
			styleElement.classList.add(name.replace(/[^a-z0-9-]/gi, '_'));
			styleElement.dataset.uri = JSON.stringify(style.uri);
			styleElement.addEventListener('click', (event) => {
				const target = event.target;
				if (target.classList.contains('active')) return;

				this.mapStyleContainer.style.display = 'none';
				this.styleButton.style.display = 'block';
				const elms =
					this.mapStyleContainer.getElementsByClassName('active');
				while (elms[0]) {
					elms[0].classList.remove('active');
				}
				target.classList.add('active');

				this.currentStyle = style;
				this._updateStyle();
			});
			if (style === this.currentStyle) {
				styleElement.classList.add('active');
			}
			this.mapStyleContainer.appendChild(styleElement);
		})
		this.styleButton.classList.add('maplibregl-ctrl-icon');
		this.styleButton.classList.add('maplibregl-style-switcher');
		this.styleButton.addEventListener('click', () => {
			this.styleButton.style.display = 'none';
			this.mapStyleContainer.style.display = 'block';
		});
		document.addEventListener('click', this.onDocumentClick);
		this.controlContainer.appendChild(this.styleButton);
		this.controlContainer.appendChild(this.mapStyleContainer);
		this._updateStyle();
		return this.controlContainer;
	}
	onRemove() {
		if (
			!this.controlContainer ||
			!this.controlContainer.parentNode ||
			!this.map ||
			!this.styleButton
		) {
			return;
		}
		this.styleButton.removeEventListener('click', this.onDocumentClick);
		this.controlContainer.parentNode.removeChild(this.controlContainer);
		document.removeEventListener('click', this.onDocumentClick);
		this.map = undefined;
	}
	onDocumentClick(event) {
		if (
			this.controlContainer &&
			!this.controlContainer.contains(event.target) &&
			this.mapStyleContainer &&
			this.styleButton
		) {
			this.mapStyleContainer.style.display = 'none';
			this.styleButton.style.display = 'block';
		}
	}
}
