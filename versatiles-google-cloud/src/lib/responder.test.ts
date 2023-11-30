/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */
import type { Response } from 'express';
import type { ResponderInterface } from './responder.js';
import { Responder } from './responder.js';
import { jest } from '@jest/globals';
import { brotliCompressSync, brotliDecompressSync, gunzipSync, gzipSync } from 'zlib';

describe('Responder', () => {
	let responder: ResponderInterface;

	beforeEach(() => {
		responder = Responder({
			fastRecompression: true,
			requestHeaders: {
				'accept-encoding': 'gzip, br',
				'content-type': 'application/json',
			},
			response: {
				emit: jest.fn().mockReturnThis(),
				end: jest.fn().mockReturnThis(),
				on: jest.fn().mockReturnThis(),
				once: jest.fn().mockReturnThis(),
				pipe: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				status: jest.fn().mockReturnThis(),
				type: jest.fn().mockReturnThis(),
			} as unknown as Response,
			requestNo: 5,
			verbose: false,
		});
	});

	it('should set and get response headers correctly', () => {
		responder.set('test-header', 'test-value');
		expect(responder.responseHeaders['test-header']).toBe('test-value');

		responder.del('test-header');
		expect(responder.responseHeaders['test-header']).toBeUndefined();
	});

	it('should get request number', () => {
		expect(responder.requestNo).toBe(5);
	});

	it('should get verbose', () => {
		expect(responder.verbose).toBe(false);
	});

	it('should handle error responses correctly', () => {
		const errorCode = 404;
		const errorMessage = 'Not Found';
		responder.error(errorCode, errorMessage);

		expect(responder.response.status).toHaveBeenCalledWith(errorCode);
		expect(responder.response.type).toHaveBeenCalledWith('text');
		expect(responder.response.send).toHaveBeenCalledWith(errorMessage);
	});

	it('should respond correctly with raw text content', async () => {
		await responder.respond('content', 'text/plain', 'raw');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-length': '7',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});
		expect(responder.response.end).toHaveBeenCalledWith(Buffer.from('content'));
	});

	it('should respond correctly with raw image content', async () => {
		await responder.respond('imagedata', 'image/png', 'raw');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-length': '9',
			'content-type': 'image/png',
			'vary': 'accept-encoding',
		});
		expect(responder.response.end).toHaveBeenCalledWith(Buffer.from('imagedata'));
	});

	it('should respond correctly with gzip compressed text content', async () => {
		const content = Buffer.from('gzip compressed text content');
		await responder.respond(gzipSync(content), 'text/plain', 'gzip');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-encoding': 'gzip',
			'content-length': '46',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});

		expect(responder.response.end).toHaveBeenCalledTimes(1);
		const mockFunction = responder.response.end as unknown as jest.MockedFunction<(chunk: Buffer) => Response>;
		const buffer = mockFunction.mock.calls.pop();
		if (buffer == null) throw Error();
		expect(gunzipSync(buffer[0])).toStrictEqual(content);
	});

	it('should respond correctly with brotli compressed text content', async () => {
		const content = Buffer.from('brotli compressed text content');
		await responder.respond(brotliCompressSync(content), 'text/plain', 'br');

		expect(responder.response.set).toHaveBeenCalledTimes(1);
		expect(responder.response.set).toHaveBeenCalledWith({
			'cache-control': 'max-age=86400',
			'content-encoding': 'br',
			'content-length': '30',
			'content-type': 'text/plain',
			'vary': 'accept-encoding',
		});

		expect(responder.response.end).toHaveBeenCalledTimes(1);
		const mockFunction = responder.response.end as unknown as jest.MockedFunction<(chunk: Buffer) => Response>;
		const buffer = mockFunction.mock.calls.pop();
		if (buffer == null) throw Error();
		expect(brotliDecompressSync(buffer[0])).toStrictEqual(content);
	});
});

