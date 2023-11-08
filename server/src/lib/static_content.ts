import type { Compression } from '@versatiles/container';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const mimeTypes = new Map([
	['.avif', 'image/avif'],
	['.bin', 'application/octet-stream'],
	['.css', 'text/css'],
	['.geojson', 'application/geo+json'],
	['.htm', 'text/html'],
	['.html', 'text/html'],
	['.jpeg', 'image/jpeg'],
	['.jpg', 'image/jpeg'],
	['.js', 'text/javascript'],
	['.json', 'application/json'],
	['.pbf', 'application/x-protobuf'],
	['.png', 'image/png'],
	['.svg', 'image/svg+xml'],
	['.topojson', 'application/topo+json'],
	['.webp', 'image/webp'],
]);

/**
 * The `StaticContent` class provides a way to store and retrieve static content.
 * It allows adding content as a Buffer, object, or string, and retrieving it via a path.
 * It also supports adding the contents of an entire directory, automatically handling MIME types
 * and optional compression. This class is useful for serving static files in a web server context.
 */
export class StaticContent {
	readonly #map: Map<string, StaticResponse>;

	/**
	 * Constructs a new instance of the StaticContent class.
	 */
	public constructor() {
		this.#map = new Map();
	}

	/**
	 * Helper function to resolve a URL from a base URL and a relative path.
	 * @private
	 * @param from - The base URL.
	 * @param to - The relative path to resolve against the base URL.
	 * @returns The resolved URL path.
	 */
	private static urlResolve(from: string, to: string): string {
		if (!from.endsWith('/')) from += '/';
		const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
		return resolvedUrl.pathname;
	}

	/**
	 * Retrieves the static response associated with the given path.
	 * @param path - The path to retrieve the static response for.
	 * @returns The static response or undefined if not found.
	 */
	public get(path: string): StaticResponse | undefined {
		return this.#map.get(path);
	}

	/**
	 * Adds a new static response to the map.
	 * @param path - The path where the static response will be accessible.
	 * @param content - The content to serve, can be a Buffer, object, or string.
	 * @param mime - The MIME type of the content.
	 * @param compression - The compression method used, if any.
	 * @throws Will throw an error if the path already exists in the map.
	 */
	// eslint-disable-next-line @typescript-eslint/max-params
	public add(path: string, content: Buffer | object | string, mime: string, compression: Compression = null): void {
		let buffer: Buffer;
		if (Buffer.isBuffer(content)) {
			buffer = content;
		} else if (typeof content === 'string') {
			buffer = Buffer.from(content);
		} else {
			buffer = Buffer.from(JSON.stringify(content));
		}
		if (this.#map.has(path)) throw Error();
		this.#map.set(path, [buffer, mime, compression]);
	}

	/**
	 * Adds the contents of a directory to the map, recursively adding any subdirectories.
	 * @param url - The base URL that the directory contents will be accessible under.
	 * @param dir - The directory whose contents should be added.
	 */
	public addFolder(url: string, dir: string): void {
		if (!existsSync(dir)) return;

		readdirSync(dir).forEach(name => {
			if (name.startsWith('.')) return;

			const subDir = resolve(dir, name);
			const subUrl = StaticContent.urlResolve(url, name);

			if (statSync(subDir).isDirectory()) {
				this.addFolder(subUrl, subDir);
			} else {
				const ext = extname(subDir);
				const mime = mimeTypes.get(ext.toLowerCase());

				if (mime == null) {
					console.warn('unknown file extension: ' + ext);
				}

				this.add(subUrl, readFileSync(subDir), mime ?? 'application/octet-stream');
			}
		});
	}

	/**
	 * Gets a list of all content currently stored in the map.
	 * @returns A map of paths to their corresponding static responses.
	 */
	public getContentList(): Map<string, StaticResponse> {
		return this.#map;
	}
}

type StaticResponse = [Buffer, string, Compression];
