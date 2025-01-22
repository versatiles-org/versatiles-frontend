import { jest } from '@jest/globals';

const OriginalModule = await import('../../frontend/load?' + Math.random()) as typeof import('../../frontend/load');

export const loadFrontendConfigs = jest.fn(OriginalModule.loadFrontendConfigs);

const mockedModule = { loadFrontendConfigs }

try { jest.unstable_mockModule('./load', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../load', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('./frontend/load', () => mockedModule) } catch (_) { /* */ }
try { jest.unstable_mockModule('../frontend/load', () => mockedModule) } catch (_) { /* */ }
