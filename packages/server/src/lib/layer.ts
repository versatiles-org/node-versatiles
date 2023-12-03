import type { Compression, Reader } from '@versatiles/container';
import { Container } from '@versatiles/container';
import type { ContainerInfo, ContentResponse, ServerOptions } from './types.js';
import { generateStyle } from './style.js';


export class Layer {
	readonly #container: Container;

	#info?: ContainerInfo;

	#mime?: string;

	#compression?: Compression;

	public constructor(source: Reader | string, options?: ServerOptions) {
		this.#container = new Container(source, { tms: options?.tms ?? false });
	}

	public async init(): Promise<void> {
		if (this.#info) return;

		const header = await this.#container.getHeader();
		const metadata = await this.#container.getMetadata();
		this.#mime = header.tileMime;
		this.#compression = header.tileCompression;
		this.#info = { header, metadata };
	}

	public async getTileFunction(): Promise<(z: number, x: number, y: number) => Promise<ContentResponse | null>> {
		await this.init();

		const container = this.#container;
		const mime = this.#mime;
		const compression = this.#compression;

		return async (z: number, x: number, y: number): Promise<ContentResponse | null> => {
			const buffer = await container.getTile(z, x, y);
			if (!buffer) return null;
			return {
				buffer,
				mime: mime,
				compression: compression,
			};
		};
	}

	public async getInfo(): Promise<ContainerInfo> {
		await this.init();
		if (!this.#info) throw Error();
		return this.#info;
	}

	public async getStyle(options: ServerOptions): Promise<string> {
		await this.init();
		if (!this.#info) throw Error();
		return generateStyle(this.#info, options);
	}

	public async getMetadata(): Promise<string | undefined> {
		await this.init();
		if (!this.#info) throw Error();
		return this.#info.metadata;
	}
}
