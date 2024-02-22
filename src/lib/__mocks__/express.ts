/* eslint-disable @typescript-eslint/unbound-method */
import { jest } from '@jest/globals';

const originalExpress = await import('express');

const instance = {
	get: jest.fn(),
	listen: jest.fn((port, callback: () => void) => {
		callback();
	}),
};

jest.unstable_mockModule('express', () => ({
	default: jest.fn(() => instance),
}));

const express = (await import('express')) as jest.Mocked<typeof originalExpress>;

if (!jest.isMockFunction(express.default)) throw Error();
if (!jest.isMockFunction(express.default().get)) throw Error();
if (!jest.isMockFunction(express.default().listen)) throw Error();

export default express.default;
