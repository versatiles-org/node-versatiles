
import HttpReader from './reader_http.js';
import FileReader from './reader_file.js';
import { decompress } from './decompress.js';
import type { Block, Compression, Decompressor, Format, Header, Options, Reader, TileIndex } from './interfaces.js';
export type { Block, Compression, Format, Header, Options, Reader, TileIndex } from './interfaces.js';



const FORMATS: Record<string, Format[]> = {
	'c01': ['png', 'jpeg', 'webp', null, null, null, null, null, null, null, null, null, null, null, null, null, 'pbf'],
	'v01': ['png', 'jpeg', 'webp', 'pbf'],
	'v02': [
		'bin', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
		'png', 'jpeg', 'webp', 'avif', 'svg', null, null, null, null, null, null, null, null, null, null, null,
		'pbf', 'geojson', 'topojson', 'json',
	],
};
const COMPRESSIONS: Compression[] = [null, 'gzip', 'br'];



/**
 * VersaTiles class is a wrapper around a `*.versatiles` container that allows to access all tiles, metadata and other properties.
 */
export class VersaTiles {
	readonly #options: Options = {
		tms: false,
	};

	readonly #reader: Reader;

	readonly #decompress: Decompressor;

	#header?: Header;

	#metadata?: object | null;

	#blockIndex?: Map<string, Block>;

	/**
	 * Creates a new VersaTiles instance.
	 * @param {string|Reader} source - The data source, usually a `*.versatiles` container. Can be either a local filename, an URL, or a [Reader](#type_Reader) function.
	 * @param {Options=} [options] - Additional options.
	 * @throws {Error} Throws an error if the source type is invalid.
	 */
	public constructor(source: Reader | string, options?: Options) {
		if (options) Object.assign(this.#options, options);

		if (typeof source === 'string') {
			if (source.startsWith('https://') || source.startsWith('http://')) {
				this.#reader = HttpReader(source);
			} else {
				this.#reader = FileReader(source);
			}
		} else if (typeof source === 'function') {
			this.#reader = source;
		} else {
			throw new Error('source must be a string or a Reader');
		}

		this.#decompress = decompress;
	}

	/**
	 * Gets the header information of this container.
	 * This is used internally.
	 * @async
	 * @returns {Promise<Header>} The header object.
	 * @throws {Error} Throws an error if the container is invalid.
	 */
	public async getHeader(): Promise<Header> {
		// deliver if known
		if (this.#header) return this.#header;

		const data = await this.#read(0, 66);

		// check magic bytes
		if (!/^versatiles_v0[12]$/.test(data.toString('utf8', 0, 14))) {
			throw new Error('Invalid Container');
		}

		const version = data.toString('utf8', 11, 14);

		switch (version) {
			case 'v01':
				this.#header = {
					magic: data.toString('utf8', 0, 14),
					version: version,
					tileFormat: FORMATS[version][data.readUInt8(14)] ?? 'bin',
					tileCompression: COMPRESSIONS[data.readUInt8(15)] ?? null,
					zoomMin: data.readUInt8(16),
					zoomMax: data.readUInt8(17),
					bbox: [data.readFloatBE(18), data.readFloatBE(22), data.readFloatBE(26), data.readFloatBE(30)],
					metaOffset: Number(data.readBigUInt64BE(34)),
					metaLength: Number(data.readBigUInt64BE(42)),
					blockIndexOffset: Number(data.readBigUInt64BE(50)),
					blockIndexLength: Number(data.readBigUInt64BE(58)),
				};
				break;
			case 'v02':
				this.#header = {
					magic: data.toString('utf8', 0, 14),
					version: version,
					tileFormat: FORMATS[version][data.readUInt8(14)] ?? 'bin',
					tileCompression: COMPRESSIONS[data.readUInt8(15)] ?? null,
					zoomMin: data.readUInt8(16),
					zoomMax: data.readUInt8(17),
					bbox: [data.readInt32BE(18) / 1e7, data.readInt32BE(22) / 1e7, data.readInt32BE(26) / 1e7, data.readInt32BE(30) / 1e7],
					metaOffset: Number(data.readBigUInt64BE(34)),
					metaLength: Number(data.readBigUInt64BE(42)),
					blockIndexOffset: Number(data.readBigUInt64BE(50)),
					blockIndexLength: Number(data.readBigUInt64BE(58)),
				};
				break;
			default:
				throw new Error('Invalid Container');
		}

		return this.#header;
	}

	/**
	 * Gets the metadata describing the tiles.
	 * For vector tiles metadata is usually a Buffer containing a JSON, describing `vector_layers`.
	 * If there is no metadata in the container, this function returns `null`.
	 * @async
	 * @returns {Promise<object | null>} The metadata object, or null.
	 */
	public async getMetadata(): Promise<object | null> {
		if (this.#metadata !== undefined) return this.#metadata;

		const header = await this.getHeader();

		if (header.metaLength === 0) {
			this.#metadata = null;
		} else {
			let buffer: Buffer = await this.#read(header.metaOffset, header.metaLength);
			buffer = await this.#decompress(buffer, header.tileCompression);
			this.#metadata = JSON.parse(buffer.toString()) as object;
		}
		return this.#metadata;
	}

	/**
	 * Gets the format of the tiles, like "png" or "pbf"
	 * @async
	 * @returns {Promise<Format>} The tile format.
	 */
	public async getTileFormat(): Promise<Format | null> {
		return (await this.getHeader()).tileFormat;
	}


	/**
	 * Gets the block index.
	 * This is used internally to keep a lookup of every tile block in the container.
	 * The keys of this `map` have the form "{z},{x},{y}".
	 * @async
	 * @internal
	 * @returns {Promise<Map<string, Block>>} The block index map.
	 */
	public async getBlockIndex(): Promise<Map<string, Block>> {
		if (this.#blockIndex) return this.#blockIndex;

		const header = await this.getHeader();

		// read block_index buffer
		let data = await this.#read(header.blockIndexOffset, header.blockIndexLength);
		data = await this.#decompress(data, 'br');

		// read index from buffer
		const blocks: Block[] = [];

		switch (header.version) {
			case 'c01':
			case 'v01':

				// check blog index length
				if (data.length % 29 !== 0) throw new Error('invalid block index');

				for (let i = 0; i < data.length; i += 29) {
					const slice = data.subarray(i, i + 29);
					addBlock(
						slice,
						0n,
						slice.readBigUInt64BE(13),
						slice.readBigUInt64BE(21),
					);
				}
				break;
			case 'v02':

				// check blog index length
				if (data.length % 33 !== 0) throw new Error('invalid block index');

				for (let i = 0; i < data.length; i += 33) {
					const slice = data.subarray(i, i + 33);
					addBlock(
						slice,
						slice.readBigUInt64BE(13),
						slice.readBigUInt64BE(13) + slice.readBigUInt64BE(21), // block_offset + tile_blobs_length
						slice.readUInt32BE(29),
					);
				}
				break;
		}

		// build map
		this.#blockIndex = new Map(blocks.map(b => [`${b.level},${b.column},${b.row}`, b]));

		return this.#blockIndex;

		// eslint-disable-next-line @typescript-eslint/max-params
		function addBlock(buffer: Buffer, blockOffset: bigint, tileIndexOffset: bigint, tileIndexLength: bigint | number): void {
			const block = {
				level: buffer.readUInt8(0),
				column: buffer.readUInt32BE(1),
				row: buffer.readUInt32BE(5),
				colMin: buffer.readUInt8(9),
				rowMin: buffer.readUInt8(10),
				colMax: buffer.readUInt8(11),
				rowMax: buffer.readUInt8(12),
				blockOffset: Number(blockOffset),
				tileIndexOffset: Number(tileIndexOffset),
				tileIndexLength: Number(tileIndexLength),
				tileCount: 0,
			};
			block.tileCount = (block.colMax - block.colMin + 1) * (block.rowMax - block.rowMin + 1);
			blocks.push(block);
		}
	}

	/**
	 * Gets the tile index for given block.
	 * This is used internally to keep a lookup of every tile in the block.
	 * @async
	 * @internal
	 * @param {Block} block - The block to get the tile index for.
	 * @returns {Promise<TileIndex>} The tile index buffer.
	 */
	public async getTileIndex(block: Block): Promise<TileIndex> {
		if (block.tileIndex) return block.tileIndex;

		let buffer = await this.#read(block.tileIndexOffset, block.tileIndexLength);
		buffer = await this.#decompress(buffer, 'br');

		const offsets = new Float64Array(block.tileCount);
		const lengths = new Float64Array(block.tileCount);

		for (let i = 0; i < block.tileCount; i++) {
			offsets[i] = Number(buffer.readBigUInt64BE(12 * i)) + block.blockOffset;
			lengths[i] = buffer.readUInt32BE(12 * i + 8);
		}

		block.tileIndex = { offsets, lengths };

		return block.tileIndex;
	}

	/**
	 * Returns a tile as Buffer.
	 * If the container header has defined a tile_compression, the returned Buffer contains compressed tile data. Use the method `getTileUncompressed` to get uncompressed tile data.
	 * If the tile cannot be found, `null` is returned.
	 * @async
	 * @param {number} z - Zoom level.
	 * @param {number} x - X coordinate.
	 * @param {number} y - Y coordinate.
	 * @returns {Promise<Buffer|null>} The tile data.
	 */
	public async getTile(z: number, x: number, y: number): Promise<Buffer | null> {
		// when y index is inverted
		if (this.#options.tms) y = Math.pow(2, z) - y - 1;

		// ensure block index is loaded
		const blockIndex = await this.getBlockIndex();

		// block xy
		const bx = x >> 8;
		const by = y >> 8;

		// tile xy (within block)
		const tx = x & 0xFF;
		const ty = y & 0xFF;

		// check if block containing tile is within bounds
		const blockKey = `${z},${bx},${by}`;
		const block = blockIndex.get(blockKey);
		if (!block) return null;

		// check if block contains tile
		if (tx < block.colMin || tx > block.colMax) return null;
		if (ty < block.rowMin || ty > block.rowMax) return null;

		// calculate sequential tile number
		const j = (ty - block.rowMin) * (block.colMax - block.colMin + 1) + (tx - block.colMin);

		// get tile index
		const tileIndex = await this.getTileIndex(block);
		const offset = tileIndex.offsets[j];
		const length = tileIndex.lengths[j];

		if (length === 0) return null;

		return this.#read(offset, length);
	}

	/**
	 * Returns an uncompressed tile as Buffer.
	 * Use the method `getTile` to get pre-compressed tile data.
	 * If the tile cannot be found, `null` is returned.
	 * @async
	 * @param {number} z - Zoom level.
	 * @param {number} x - X coordinate.
	 * @param {number} y - Y coordinate.
	 * @returns {Promise<Buffer|null>} The uncompressed tile data.
	 */
	public async getTileUncompressed(z: number, x: number, y: number): Promise<Buffer | null> {
		const tile = await this.getTile(z, x, y);
		if (!tile) return null;
		const header = await this.getHeader();
		return this.#decompress(tile, header.tileCompression);
	}

	async #read(offset: number, length: number): Promise<Buffer> {
		if (length === 0) return Buffer.allocUnsafe(0);
		return this.#reader(offset, length);
	}
}
