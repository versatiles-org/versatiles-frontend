
const progress = new Progress()
export default progress;

function Progress() {
	const labelList = [];
	const labelMap = new Map();

	process.stderr.write('\u001b[s')

	return { add }

	function add(name) {
		const label = { name, closed: false };
		labelList.push(label);
		if (labelMap.has(name)) throw Error();
		labelMap.set(name, label)
		redraw();

		return {
			close: () => {
				label.closed = true;
				redraw();
			}
		}
	}

	function redraw() {
		const status = '\u001b[u' + labelList.map(l => '\u001b[' + (l.closed ? 32 : 31) + 'm' + l.name + '\u001b[0m\n').join('');
		process.stderr.write(status);
	}
}
