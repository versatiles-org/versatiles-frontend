import { vi } from 'vitest';

// Stubbed parseDevConfig that tests can override with vi.mocked(...).mockResolvedValue(...)
export const parseDevConfig = vi.fn();

// A simple server instance with a mocked start method
export const serverInstance = {
	start: vi.fn().mockResolvedValue(undefined),
};

// Factory for creating (or returning) the mocked server instance
export const Server = vi.fn(() => serverInstance);

// Default export to roughly match the module shape if imported as default
export default {
	parseDevConfig,
	Server,
};
