export default function VersatilesControl(opt) {
	let map;

	const container = createDOM('div', 'maplibregl-ctrl maplibregl-ctrl-group');
	container.addEventListener('contextmenu', (e) => e.preventDefault());

	const btnStylemaker = createButton('stylemaker', 'Stylemaker', e => map.zoomIn({}, { originalEvent: e }));
	const btnInspector = createButton('inspector', 'Inspector', e => map.zoomOut({}, { originalEvent: e }));
	const btnLog = createButton('log', 'show log', e => map.zoomOut({}, { originalEvent: e }));
	const zoomInButton = createButton('maplibregl-ctrl-zoom-in', 'Zoom in', e => map.zoomIn({}, { originalEvent: e }));
	const zoomOutButton = createButton('maplibregl-ctrl-zoom-out', 'Zoom out', e => map.zoomOut({}, { originalEvent: e }));

	return { onAdd, onRemove }

	function onAdd(node) {
		map = node;
		map.on('zoom', updateZoomButtons);
		updateZoomButtons();
		return container;
	}
	function onRemove(map) {
		DOM.remove(container);
		map.off('zoom', updateZoomButtons);

		map = undefined;
	}
	function createDOM(tagName, className, container) {
		const el = window.document.createElement(tagName);
		if (className !== undefined) el.className = className;
		if (container) container.appendChild(el);
		return el;
	}

	function createButton(className, label, fn) {
		const button = createDOM('button', className, container);
		button.type = 'button';
		button.setAttribute('aria-label', label);
		button.addEventListener('click', fn);
		createDOM('span', 'maplibregl-ctrl-icon', button).setAttribute('aria-hidden', 'true');
		return button;
	}

	function updateZoomButtons() {
		const zoom = map.getZoom();
		const isMax = zoom === map.getMaxZoom();
		const isMin = zoom === map.getMinZoom();
		zoomInButton.disabled = isMax;
		zoomOutButton.disabled = isMin;
		zoomInButton.setAttribute('aria-disabled', isMax.toString());
		zoomOutButton.setAttribute('aria-disabled', isMin.toString());
	}
}