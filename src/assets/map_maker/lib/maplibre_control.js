export default function MaplibreControl(controller, callback) {
	let map;

	addIconStyles(
		{ name: 'stylemaker', svg: "<svg width='23' height='23' fill='#fff' viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'><path d='m224,482c-34,-7 -55,-36 -55,-76 -0,-43 -17,-60 -62,-62C-24,338 12,121 156,50 350,-45 557,162 461,355 418,442 309,500 224,482Zm67,-36C444,416 503,229 394,119 272,-4 64,82 64,258c-0,40 7,48 46,50 60,2 93,36 93,95 0,41 25,53 87,43zm9,-32c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm70,-105c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm-246,-70c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zm211,-35c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10zM231,166c-39,-10 -32,-68 8,-68 30,0 46,34 25,58 -6,7 -23,13 -34,10z' /></svg>" },
		{ name: 'inspector-mode', svg: "<svg width='23' height='23' fill='#fff' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'><path d='M16 8C7.66 8 1.25 15.34 1.25 15.34L0.65 16L1.25 16.65C1.25 16.65 7.09 23.32 14.87 23.93C15.24 23.98 15.61 24 16 24C16.38 24 16.75 23.98 17.12 23.93C24.90 23.32 30.75 16.65 30.75 16.65L31.34 16L30.75 15.34C30.75 15.34 24.33 8 16 8ZM16 10C18.20 10 20.23 10.60 22 11.40C22.63 12.46 23 13.67 23 15C23 18.61 20.28 21.58 16.78 21.96C16.76 21.97 16.73 21.96 16.71 21.96C16.48 21.98 16.24 22 16 22C15.73 22 15.47 21.98 15.21 21.96C11.71 21.58 9 18.61 9 15C9 13.69 9.35 12.48 9.96 11.43L9.93 11.43C11.71 10.61 13.77 10 16 10ZM16 12C14.34 12 13 13.34 13 15C13 16.65 14.34 18 16 18C17.65 18 19 16.65 19 15C19 13.34 17.65 12 16 12ZM7.25 12.93C7.09 13.60 7 14.28 7 15C7 16.75 7.5 18.39 8.37 19.78C5.85 18.32 4.10 16.58 3.53 16C4.01 15.50 5.35 14.20 7.25 12.93ZM24.75 12.93C26.64 14.20 27.98 15.50 28.46 16C27.89 16.58 26.14 18.32 23.62 19.78C24.5 18.39 25 16.75 25 15C25 14.28 24.90 13.60 24.75 12.93Z'/></svg>" },
		{ name: 'background-map', svg: "<svg width='21' height='21' fill='#fff' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'><path d='M15.817.113A.5.5 0 0 1 16 .5v14a.5.5 0 0 1-.402.49l-5 1a.502.502 0 0 1-.196 0L5.5 15.01l-4.902.98A.5.5 0 0 1 0 15.5v-14a.5.5 0 0 1 .402-.49l5-1a.5.5 0 0 1 .196 0L10.5.99l4.902-.98a.5.5 0 0 1 .415.103zM10 1.91l-4-.8v12.98l4 .8V1.91zm1 12.98 4-.8V1.11l-4 .8v12.98zm-6-.8V1.11l-4 .8v12.98l4-.8z' fill-rule='evenodd'/></svg>" },
		{ name: 'bounding-box', svg: "<svg width='21' height='21' style='stroke:#fff;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;fill:none;' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'><path d='M13,1h4M20,1h4M6,1h4M1,3v-2h2M29,13v4M29,20v4M29,6v4M27,1h2v2M17,29h-4M10,29h-4M24,29h-4M29,27v2h-2M1,17v-4M1,10v-4M1,24v-4M3,29h-2v-2'/></svg>" },
	)

	const options = controller.options || {};
	const container = createDOM('div', 'maplibregl-ctrl maplibregl-ctrl-group');

	const btnStylemaker = createButton('stylemaker', 'Stylemaker', e => map.zoomIn({}, { originalEvent: e }));
	const btnInspectorMode = createButton('inspector-mode', 'Inspector Mode', () => { toggleInspectorMode(); updateStyle() });
	const btnBackgroundMap = createButton('background-map', 'Add Background Map', () => { toggleBackgroundMap(); updateStyle() });
	const btnBoundingBox = createButton('bounding-box', 'Add Bounding Box', () => { toggleBoundingBox(); updateStyle() });
	const btnZoomIn = createButton('zoom-in', 'Zoom in', e => map.zoomIn({}, { originalEvent: e }));
	const btnZoomOut = createButton('zoom-out', 'Zoom out', e => map.zoomOut({}, { originalEvent: e }));
	
	if (options.disableInspectorMode) btnInspectorMode.disabled = true;

	toggleInspectorMode(options.inspectorMode || false);
	toggleBackgroundMap(options.addBackgroundMap || false);
	toggleBoundingBox(options.addBoundingBox || false);

	function toggleInspectorMode(value) {
		options.inspectorMode = value ?? !options.inspectorMode;
		btnInspectorMode.classList.toggle('depressed', options.inspectorMode);
	}

	function toggleBackgroundMap(value) {
		options.addBackgroundMap = value ?? !options.addBackgroundMap;
		btnBackgroundMap.classList.toggle('depressed', options.addBackgroundMap);
	}

	function toggleBoundingBox(value) {
		options.addBoundingBox = value ?? !options.addBoundingBox;
		btnBoundingBox.classList.toggle('depressed', options.addBoundingBox);
	}


	function updateStyle() {
		callback(options)
	}


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
		button.setAttribute('aria-label', label.replaceAll(' ', '\u00A0'));
		button.addEventListener('click', fn);
		createDOM('span', 'maplibregl-ctrl-icon', button).setAttribute('aria-hidden', 'true');
		return button;
	}

	function updateZoomButtons() {
		const zoom = map.getZoom();
		toggleButton(btnZoomIn, zoom >= map.getMaxZoom());
		toggleButton(btnZoomOut, zoom <= map.getMinZoom());
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
			styleSheet.insertRule(`button.maplibregl-ctrl-${name} .maplibregl-ctrl-icon { background-image: url("data:image/svg+xml;charset=utf-8,${svg}"); background-blend-mode: difference; background-color: #fff }`)
		})
		styleSheet.insertRule('button[aria-label] { position: relative; }');
		styleSheet.insertRule([
			'button[aria-label]:hover:after {',
			'position: absolute;',
			'z-index: 1;',
			'top: 0;',
			'right: 30px;',
			'display: block;',
			'overflow: hidden;',
			'height: 2em;',
			'border-radius: .2em;',
			'padding: 0 .7em;',
			'content: attr(aria-label);',
			'color: #fff;',
			'background: #000;',
			'font-size: 1em;',
			'line-height: 2em;',
			'text-align: left;',
			'white-space: no-wrap;',
			'}'].join('')
		)
		styleSheet.insertRule([
			'button[aria-label][disabled]:hover:after {',
			'opacity: 0.3;',
			'}'].join('')
		)
		styleSheet.insertRule([
			'button.depressed .maplibregl-ctrl-icon {',
			'background-color: #000 !important;',
			'}'].join('')
		)

	}
}

function Inspector() {

}