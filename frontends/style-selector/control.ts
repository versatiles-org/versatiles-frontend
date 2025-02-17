
import type { Map, IControl, ControlPosition, Evented as EventedClass } from 'maplibre-gl';
import { StyleSelector, StyleSelectorConfig } from './style-selector';

// @ts-expect-error don't know how to fix this
const Evented = maplibregl.Evented as EventedClass;

type StyleSelectorControlOptions = StyleSelectorConfig & {
}

/**
 * StyleSelectorControl is a custom control for MapLibre GL JS maps that allows users to switch between different map styles.
 */
// @ts-expect-error don't know how to fix this
export class Control extends Evented implements IControl {
	private config: StyleSelectorControlOptions;
	private map?: Map;
	private styleSelector?: StyleSelector;

	/**
	 * Initializes a new instance of the StyleSelectorControl.
	 * @param {Object} config Configuration options for the control.
	 */
	constructor(config: StyleSelectorControlOptions) {
		super();
		this.config = Object.assign({}, config);
	}

	/**
	 * Returns the default position for the control on the map.
	 * @returns {string} The default position.
	 */
	getDefaultPosition(): ControlPosition {
		return 'top-right';
	}

	/**
	 * Called when the control is added to the map.
	 * @param {Map} map The MapLibre GL JS map instance.
	 * @returns {HTMLElement} The element containing the control.
	 */
	onAdd(map: maplibregl.Map): HTMLElement {
		this.map = map;
		this.styleSelector = new StyleSelector(this.map, this.config);

		return this.styleSelector.container;
	}

	/**
	 * Called when the control is removed from the map.
	 */
	onRemove() {
		// Clean up references
		this.map = undefined;
		this.styleSelector = undefined;
	}
}
