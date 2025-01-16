import type { IControl, Map as MaplibreMap } from 'maplibre-gl';

interface ControllerOptions {
	disableDesignMaker?: boolean;
	disableInspectorMode?: boolean;
	inspectorMode?: boolean;
	addBackgroundMap?: boolean;
	addBoundingBox?: boolean;
	// Add any other properties you'd like to support here
}

interface Controller {
	options?: ControllerOptions;
}

interface IconStyle {
	name: string;
	svg: string;
}

export class MaplibreControl implements IControl {
	private map?: MaplibreMap;
	private container!: HTMLDivElement;

	private btnDesignMaker!: HTMLButtonElement;
	private btnInspectorMode!: HTMLButtonElement;
	private btnBackgroundMap!: HTMLButtonElement;
	private btnBoundingBox!: HTMLButtonElement;
	private btnZoomIn!: HTMLButtonElement;
	private btnZoomOut!: HTMLButtonElement;

	private options: ControllerOptions;

	/**
	 * @param controller  An object that may contain an `options` field
	 * @param callback    A callback function to invoke whenever style changes occur
	 */
	constructor(
		private controller: Controller = {},
		private callback: (options: ControllerOptions) => void
	) {
		this.options = controller.options || {};

		// Immediately add custom icon styles (the same ones in your JS)
		this.addIconStyles(
			{
				name: 'design-maker',
				svg: `<svg width='23' height='23' fill='#fff' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'><path d='m224,482c-34,-7 -55,-36 -55,-76 -0,-43 -17,-60 -62,-62C-24,338 12,121 156,50 350,-45 557,162 461,355 418,442 309,500 224,482Zm67,-36C444,416 503,229 394,119 272,-4 64,82 64,258c-0,40 7,48 46,50 60,2 93,36 93,95 0,41 25,53 87,43zm9,-32c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm70,-105c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm-246,-70c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm211,-35c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zM231,166c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10z' /></svg>`
			},
			{
				name: 'inspector-mode',
				svg: `<svg width='23' height='23' fill='#fff' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'><path d='M16 8C7.66 8 1.25 15.34 1.25 15.34L0.65 16L1.25 16.65C1.25 16.65 7.09 23.32 14.87 23.93C15.24 23.98 15.61 24 16 24C16.38 24 16.75 23.98 17.12 23.93C24.90 23.32 30.75 16.65 30.75 16.65L31.34 16L30.75 15.34C30.75 15.34 24.33 8 16 8ZM16 10C18.20 10 20.23 10.60 22 11.40C22.63 12.46 23 13.67 23 15C23 18.61 20.28 21.58 16.78 21.96C16.76 21.97 16.73 21.96 16.71 21.96C16.48 21.98 16.24 22 16 22C15.73 22 15.47 21.98 15.21 21.96C11.71 21.58 9 18.61 9 15C9 13.69 9.35 12.48 9.96 11.43L9.93 11.43C11.71 10.61 13.77 10 16 10ZM16 12C14.34 12 13 13.34 13 15C13 16.65 14.34 18 16 18C17.65 18 19 16.65 19 15C19 13.34 17.65 12 16 12ZM7.25 12.93C7.09 13.60 7 14.28 7 15C7 16.75 7.5 18.39 8.37 19.78C5.85 18.32 4.10 16.58 3.53 16C4.01 15.50 5.35 14.20 7.25 12.93ZM24.75 12.93C26.64 14.20 27.98 15.50 28.46 16C27.89 16.58 26.14 18.32 23.62 19.78C24.5 18.39 25 16.75 25 15C25 14.28 24.90 13.60 24.75 12.93Z'/></svg>`
			},
			{
				name: 'background-map',
				svg: `<svg width='21' height='21' fill='#fff' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'><path d='M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.502.502 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103zM10 1.91l-4-.8v12.98l4 .8V1.91zm1 12.98 4-.8V1.11l-4 .8v12.98zm-6-.8V1.11l-4 .8v12.98l4-.8z' fill-rule='evenodd'/></svg>`
			},
			{
				name: 'bounding-box',
				svg: `<svg width='21' height='21' style='stroke:#fff;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;fill:none;' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'><path d='M13,1h4M20,1h4M6,1h4M1,3v-2h2M29,13v4M29,20v4M29,6v4M27,1h2v2M17,29h-4M10,29h-4M24,29h-4M29,27v2h-2M1,17v-4M1,10v-4M1,24v-4M3,29h-2v-2'/></svg>`
			}
		);

		// Toggle initial states
		this.toggleInspectorMode(this.options.inspectorMode ?? false);
		this.toggleBackgroundMap(this.options.addBackgroundMap ?? false);
		this.toggleBoundingBox(this.options.addBoundingBox ?? false);
	}

	/**
	 * Called when the control is added to the map.
	 * @param map MapLibre map instance
	 * @returns The container HTML element for this control
	 */
	public onAdd(map: MaplibreMap): HTMLElement {
		this.map = map;

		// Create root container
		this.container = this.createDOM('div', 'maplibregl-ctrl maplibregl-ctrl-group') as HTMLDivElement;

		// Create buttons
		this.btnDesignMaker = this.createButton('design-maker', 'DesignMaker', (e) => {
			this.map?.zoomIn({}, { originalEvent: e });
		});
		this.btnInspectorMode = this.createButton('inspector-mode', 'Inspector Mode', () => {
			this.toggleInspectorMode();
			this.updateStyle();
		});
		this.btnBackgroundMap = this.createButton('background-map', 'Add Background Map', () => {
			this.toggleBackgroundMap();
			this.updateStyle();
		});
		this.btnBoundingBox = this.createButton('bounding-box', 'Add Bounding Box', () => {
			this.toggleBoundingBox();
			this.updateStyle();
		});
		this.btnZoomIn = this.createButton('zoom-in', 'Zoom in', (e) => {
			this.map?.zoomIn({}, { originalEvent: e });
		});
		this.btnZoomOut = this.createButton('zoom-out', 'Zoom out', (e) => {
			this.map?.zoomOut({}, { originalEvent: e });
		});

		// Respect disabling flags
		if (this.options.disableDesignMaker) {
			this.btnDesignMaker.disabled = true;
		}
		if (this.options.disableInspectorMode) {
			this.btnInspectorMode.disabled = true;
		}

		// Hook into map zoom events so we can toggle zoom-in/zoom-out properly
		this.map.on('zoom', this.updateZoomButtons);
		this.updateZoomButtons(); // Initialize

		return this.container;
	}

	/**
	 * Called when the control is removed from the map.
	 * Cleans up event listeners & DOM elements.
	 */
	public onRemove(): void {
		if (!this.map) return;

		this.map.off('zoom', this.updateZoomButtons);

		// Remove container from DOM
		if (this.container?.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}
		this.map = undefined;
	}

	// -------------------- Helper Methods --------------------

	private toggleInspectorMode(value?: boolean): void {
		const newVal = value ?? !this.options.inspectorMode;
		this.options.inspectorMode = newVal;
		if (this.btnInspectorMode) {
			this.btnInspectorMode.classList.toggle('depressed', newVal);
		}
	}

	private toggleBackgroundMap(value?: boolean): void {
		const newVal = value ?? !this.options.addBackgroundMap;
		this.options.addBackgroundMap = newVal;
		if (this.btnBackgroundMap) {
			this.btnBackgroundMap.classList.toggle('depressed', newVal);
		}
	}

	private toggleBoundingBox(value?: boolean): void {
		const newVal = value ?? !this.options.addBoundingBox;
		this.options.addBoundingBox = newVal;
		if (this.btnBoundingBox) {
			this.btnBoundingBox.classList.toggle('depressed', newVal);
		}
	}

	private updateStyle(): void {
		this.callback(this.options);
	}

	private updateZoomButtons = (): void => {
		if (!this.map) return;
		const zoom = this.map.getZoom();
		this.toggleButton(this.btnZoomIn, zoom >= this.map.getMaxZoom());
		this.toggleButton(this.btnZoomOut, zoom <= this.map.getMinZoom());
	};

	private toggleButton(button: HTMLButtonElement, state: boolean): void {
		button.disabled = state;
		button.setAttribute('aria-disabled', state.toString());
	}

	private createDOM(
		tagName: string,
		className?: string,
		container?: HTMLElement
	): HTMLElement {
		const el = window.document.createElement(tagName);
		if (className) {
			el.className = className;
		}
		if (container) {
			container.appendChild(el);
		}
		return el;
	}

	private createButton(
		className: string,
		label: string,
		fn: (evt: MouseEvent) => void
	): HTMLButtonElement {
		const button = this.createDOM('button', `maplibregl-ctrl-${className}`, this.container) as HTMLButtonElement;
		button.type = 'button';
		// Replace spaces with non-breaking spaces for ARIA label
		button.setAttribute('aria-label', label.replaceAll(' ', '\u00A0'));
		button.addEventListener('click', fn);

		// Icon container
		const iconSpan = this.createDOM('span', 'maplibregl-ctrl-icon', button);
		iconSpan.setAttribute('aria-hidden', 'true');

		return button;
	}

	/**
	 * Dynamically inserts CSS rules for custom icons and button hover.
	 */
	private addIconStyles(...styles: IconStyle[]): void {
		// Use the last stylesheet in the document; update if you have a custom approach
		const styleSheet = document.styleSheets[document.styleSheets.length - 1] as CSSStyleSheet;

		styles.forEach(({ name, svg }) => {
			let encoded = svg;
			encoded = encoded.replaceAll('%', '%25');
			encoded = encoded.replaceAll('"', '%22');
			encoded = encoded.replaceAll('<', '%3C');
			encoded = encoded.replaceAll('>', '%3E');
			encoded = encoded.replaceAll('#', '%23');

			styleSheet.insertRule(
				`button.maplibregl-ctrl-${name} .maplibregl-ctrl-icon {
           background-image: url("data:image/svg+xml;charset=utf-8,${encoded}");
           background-blend-mode: difference;
           background-color: #fff;
         }`,
				styleSheet.cssRules.length
			);
		});

		styleSheet.insertRule(
			`button[aria-label] { position: relative; }`,
			styleSheet.cssRules.length
		);

		styleSheet.insertRule(
			[
				'button[aria-label]:hover:after {',
				'  position: absolute;',
				'  z-index: 1;',
				'  top: 0;',
				'  right: 30px;',
				'  display: block;',
				'  overflow: hidden;',
				'  height: 2em;',
				'  border-radius: .2em;',
				'  padding: 0 .7em;',
				'  content: attr(aria-label);',
				'  color: #fff;',
				'  background: #000;',
				'  font-size: 1em;',
				'  line-height: 2em;',
				'  text-align: left;',
				'  white-space: nowrap;',
				'}'
			].join(''),
			styleSheet.cssRules.length
		);

		styleSheet.insertRule(
			[
				'button[aria-label][disabled]:hover:after {',
				'  opacity: 0.3;',
				'}'
			].join(''),
			styleSheet.cssRules.length
		);

		styleSheet.insertRule(
			[
				'button.depressed .maplibregl-ctrl-icon {',
				'  background-color: #000 !important;',
				'}'
			].join(''),
			styleSheet.cssRules.length
		);
	}
}

// If you also need an `Inspector` class or function, you can define it here.
// Currently, it was just an empty function in your original snippet.
export function Inspector(): void {
	// ...
}