/* eslint-disable @typescript-eslint/consistent-type-imports */

import { jest } from '@jest/globals';

export const mockReleaseNotes = {
	default: {
		save: jest.fn(),
	},
} as unknown as jest.Mocked<typeof import('../release_notes')>;
