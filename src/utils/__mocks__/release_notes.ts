import { vi, Mocked } from 'vitest';
import type { ReleaseNotes } from '../release_notes';

const instance = {
	add: vi.fn(),
	setVersion: vi.fn(),
	save: vi.fn(),
	labelList: [],
	labelMap: new Map(),
} as unknown as Mocked<ReleaseNotes>;

export default instance;

try {
	vi.mock('../release_notes', () => ({ default: instance }));
} catch (_) {
	/* */
}
try {
	vi.mock('./release_notes', () => ({ default: instance }));
} catch (_) {
	/* */
}
try {
	vi.mock('./utils/release_notes', () => ({ default: instance }));
} catch (_) {
	/* */
}
