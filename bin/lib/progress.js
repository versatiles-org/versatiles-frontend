
export default function Progress() {
	const labelList = [];
	const labelMap = new Map();

	process.stderr.write('\u001b[s')

	return { add }

	function add(name) {
		const label = { name, closed: false, time: getTime() };
		labelList.push(label);
		if (labelMap.has(name)) throw Error();
		labelMap.set(name, label)
		redraw();

		return {
			close: () => {
				label.closed = true;
				label.time = getTime();
				redraw();
			},
			open: () => {
				label.closed = false;
				label.time = getTime();
				redraw();
			}
		}
	}

	function redraw() {
		labelList.sort((a, b) => a.name < b.name ? -1 : 1)
		const status = '\u001b[u' + labelList.map(l =>
			' - \u001b[' + (l.closed ? 32 : 31) + 'm' + l.name + '\u001b[39;2m ' + l.time + '\u001b[0m\n'
		).join('');
		process.stderr.write(status);
	}

	function getTime() {
		return (new Date()).toLocaleTimeString('de-DE');
	}
}
