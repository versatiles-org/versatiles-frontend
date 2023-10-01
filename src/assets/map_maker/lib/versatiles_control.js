export default function VersatilesControl(opt) {
	let map;

	addIconStyles(
		{ name: 'stylemaker', svg: "<svg xmlns='http://www.w3.org/2000/svg' width='23' height='23' fill='#000' viewBox='0 0 512 512'><path d='m224,482c-34,-7 -55,-36 -55,-76 -0,-43 -17,-60 -62,-62C-24,338 12,121 156,50 350,-45 557,162 461,355 418,442 309,500 224,482Zm67,-36C444,416 503,229 394,119 272,-4 64,82 64,258c-0,40 7,48 46,50 60,2 93,36 93,95 0,41 25,53 87,43zm9,-32c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm70,-105c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm-246,-70c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm211,-35c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zM231,166c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10z' /></svg>" },
		{ name: 'inspector', svg: "<svg xmlns='http://www.w3.org/2000/svg' width='23' height='23' fill='#000' viewBox='0 0 16 16'><path d='M10.5 1C8.02 1 6 3.02 6 5.5C6 6.56 6.38 7.52 7 8.29L2.02 13.27L2.73 13.98L7.70 9C8.48 9.62 9.44 10 10.5 10C12.98 10 15 7.98 15 5.5C15 3.02 12.98 1 10.5 1ZM10.5 2C12.44 2 14 3.56 14 5.5C14 7.44 12.44 9 10.5 9C8.56 9 7 7.44 7 5.5C7 3.56 8.56 2 10.5 2Z'/></svg>" }
	)

	const container = createDOM('div', 'maplibregl-ctrl maplibregl-ctrl-group');
	container.addEventListener('contextmenu', (e) => e.preventDefault());

	const btnStylemaker = createButton('stylemaker', 'Stylemaker', e => map.zoomIn({}, { originalEvent: e }));
	const btnInspector = createButton('inspector', 'Inspector', e => map.zoomOut({}, { originalEvent: e }));
	const btnLog = createButton('log', 'show log', e => map.zoomOut({}, { originalEvent: e }));
	const zoomInButton = createButton('zoom-in', 'Zoom in', e => map.zoomIn({}, { originalEvent: e }));
	const zoomOutButton = createButton('zoom-out', 'Zoom out', e => map.zoomOut({}, { originalEvent: e }));

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
		const button = createDOM('button', 'maplibregl-ctrl-' + className, container);
		button.type = 'button';
		button.setAttribute('aria-label', label);
		button.addEventListener('click', fn);
		createDOM('span', 'maplibregl-ctrl-icon', button).setAttribute('aria-hidden', 'true');
		return button;
	}

	function updateZoomButtons() {
		const zoom = map.getZoom();
		toggleButton(zoomInButton, zoom >= map.getMaxZoom());
		toggleButton(zoomOutButton, zoom <= map.getMinZoom());
	}

	function toggleButton(button, state) {
		button.disabled = state;
		button.setAttribute('aria-disabled', state.toString());
	}

	function addIconStyles(...styles) {
		let styleSheet = document.styleSheets[document.styleSheets.length - 1];
		styles.forEach(({ name, svg }) => {
			svg = svg.replaceAll('%', '%25');
			svg = svg.replaceAll('"', '%22');
			svg = svg.replaceAll('<', '%3C');
			svg = svg.replaceAll('>', '%3E');
			svg = svg.replaceAll('#', '%23');
			styleSheet.insertRule(`button.maplibregl-ctrl-${name} .maplibregl-ctrl-icon { background-image: url("data:image/svg+xml;charset=utf-8,${svg}"); }`)
		})
	}
}