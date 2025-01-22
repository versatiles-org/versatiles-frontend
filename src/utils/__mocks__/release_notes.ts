import { jest } from '@jest/globals';
import type { ReleaseNotes } from '../release_notes';

const instance = {
  add: jest.fn(),
  setVersion: jest.fn(),
  save: jest.fn(),
  labelList: [],
  labelMap: new Map(),
} as unknown as jest.Mocked<ReleaseNotes>;

export default instance;

try { jest.unstable_mockModule('../release_notes', () => ({ default: instance })) } catch (_) { /* */ }
try { jest.unstable_mockModule('./release_notes', () => ({ default: instance })) } catch (_) { /* */ }
try { jest.unstable_mockModule('./utils/release_notes', () => ({ default: instance })) } catch (_) { /* */ }
