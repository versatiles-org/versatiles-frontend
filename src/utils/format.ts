/** Groups the digits of a number for readability, e.g. 49075 -> 49'075. */
export function groupDigits(value: number): string {
	return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}
