#!/usr/bin/env node
'use strict'

import url from 'node:url';
import { createServer } from 'node:http';
import zlib from 'node:zlib';
import { basename, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Versatiles } from './index.js';

const __dirname = (new URL('../', import.meta.url)).pathname;
console.log({ __dirname });

const ENCODINGS = {
	gzip: 'gzip',
	brotli: 'br',
}

const MIMETYPES = {
	bin: 'application/octet-stream',
	png: 'image/png',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	avif: 'image/avif',
	svg: 'image/svg+xml',
	pbf: 'application/x-protobuf',
	geojson: 'application/geo+json',
	topojson: 'application/topo+json',
	json: 'application/json',
}

export class Server {
	opt = {
		recompress: false,
	};
	layers = {};
	server;
	constructor(sources, opt) {
		Object.assign(this.opt, opt)

		if (!Array.isArray(sources)) sources = [sources];

		sources.map(async src => {
			let container, name;

			if (src instanceof Versatiles) {
				container = src;
			} else {
				container = new Versatiles(src);
				name = basename(src).replace(/\..*?$/, '');
			}

			this.layers[name] = { container, name };
		})
	}
	async #prepareLayers() {
		await Promise.all(
			Array.from(Object.values(this.layers))
				.map(async layer => {
					let header;

					if (!layer.mime) {
						header ??= await container.getHeader();
						layer.mime = MIMETYPES[header.tile_format] || 'application/octet-stream';
					}

					if (!layer.precompression) {
						header ??= await container.getHeader();
						layer.precompression = header.precompression;
					}
				})
		)
		return this.layers;
	}
	async start() {
		const layers = await this.#prepareLayers();
		const recompress = this.opt.recompress || false;

		server = createServer(async (req, res) => {

			if (req.method !== 'GET') return respondWithError('Method not allowed', 405);
			const p = url.parse(req.url).pathname;

			// construct base url from request headers
			//const baseurl = this.opt.base || (req.headers["x-forwarded-proto"] || "http") + '://' + (req.headers["x-forwarded-host"] || req.headers.host);

			if ((p === '/') || (p === '/index.html')) {
				try {
					const html = readFile(resolve(__dirname, 'static/index.html'));
					return respondWithContent(html, 'text/html; charset=utf-8');
				} catch (err) {
					return respondWithError(err, 500);
				}
			}

			if (match = p.match(/^\/tiles\/(?<name>)\/(tile|meta)\.json/)) {
				let { name } = match.groups;
				const layer = layers[name];
				if (!layer) return respondWithError(`layer ${name} not found`, 404);
				try {
					return respondWithContent(await layer.container.getMeta(), 'application/json; charset=utf-8', 'br');
				} catch (err) {
					return respondWithError(err, 500);
				}
			}

			if (match = p.match(/^\/tiles\/(?<name>)\/(?<z>[0-9]+)\/(?<x>[0-9]+)\/(?<y>[0-9]+).*/)) {
				let { name, x, y, z } = match.groups;
				const layer = layers[name];
				if (!layer) return respondWithError(`layer ${name} not found`, 404);
				try {
					x = parseInt(x, 10);
					y = parseInt(y, 10);
					z = parseInt(z, 10);
					return respondWithContent(await layer.container.getTile(z, x, y), layer.mime, layer.precompression);
				} catch (err) {
					return respondWithError(err, 500);
				}
			}

			async function respondWithContent(content, mime, compression) {
				const accepted_encoding = req.headers['accept-encoding'] || '';
				const accept_gzip = accepted_encoding.includes('gzip');
				const accept_br = accepted_encoding.includes('br');

				switch (compression) {
					case 'br':
						if (accept_br) break;
						if (recompress && accept_gzip) {
							content = await gzip(await unbrotli(content));
							compression = 'gzip';
							break;
						}
						content = await unbrotli(content);
						compression = null;
						break;
					case 'gzip':
						if (accept_gzip) break;
						content = await ungzip(content);
						compression = null;
						break;
					default:
						if (recompress && accept_br) {
							content = await brotli(content);
							compression = 'br';
							break;
						}
						if (recompress && accept_gzip) {
							content = await gzip(content);
							compression = 'gzip';
							break;
						}
						compression = null;
						break;
				}

				if (compression) res.setHeader('content-encoding', compression);

				res.statusCode = 200;
				res.setHeader('content-type', mime);
				res.end(content);
			}

			function respondWithError(err, code = 500) {
				console.error(err);
				res.statusCode = code;
				res.setHeader('content-type', 'text/plain');
				res.end(err.toString());
			}
		});

		const port = arguments.port ?? 8080;
		server.listen(port);
		console.log(`listening on port ${port} `);

		return server;
	}
}

// executable magic
if (require.main === module) {
	if (process.argv.length < 3 || process.argv.includes("-h") || process.argv.includes("--help")) return console.error("Usage: versatiles <url|file>.versatiles [--tms] [--port <port>] [--host <hostname|ip>] [--base <http://baseurl/>] [--header-<header-key> <header-value>]"), process.exit(1);
	const src = /^https?:\/\//.test(process.argv[2]) ? process.argv[2] : path.resolve(process.cwd(), process.argv[2]);
	const port = process.argv.includes("--port") ? parseInt(process.argv[process.argv.lastIndexOf("--port") + 1], 10) : 8080;
	const host = process.argv.includes("--host") ? process.argv[process.argv.lastIndexOf("--host") + 1] : "localhost";
	const tms = process.argv.includes("--tms");
	const base = process.argv.includes("--base") ? process.argv[process.argv.lastIndexOf("--base") + 1] : null;
	const headers = process.argv.reduce((headers, arg, i) => {
		if (arg.slice(0, 9) === "--header-") headers[arg.slice(9)] = process.argv[i + 1];
		return headers;
	}, {});

	versatiles(src, {
		tms: tms,
		headers: headers,
		base: base,
	}).server(port, host, err => {
		if (err) return console.error(err.toString()), process.exit(1);
		console.error("Listening on http://%s:%d/", host, port);
	});
}

function gzip(dataIn) {
	return new Promise((res, rej) =>
		zlib.gzip(dataIn, { level: 9 }, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

function ungzip(dataIn) {
	return new Promise((res, rej) =>
		zlib.ungzip(dataIn, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

function brotli(dataIn) {
	return new Promise((res, rej) =>
		zlib.brotli(dataIn, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, } }, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}

function unbrotli(dataIn) {
	return new Promise((res, rej) =>
		zlib.unbrotli(dataIn, (err, dataOut) => {
			if (err) return rej(err); res(dataOut);
		})
	)
}
