A client library for [VersaTiles containers](https://github.com/versatiles-org/versatiles-spec).

# Install

`npm i versatiles`

# Usage Example

```js
import VersaTiles from 'versatiles';
import fs from 'fs';

const container = new VersaTiles('https://example.org/planet.versatiles');
const header = await container.getHeader();
const tile = await container.getTileUncompressed(z,x,y);
fs.writeFileSync('tile.' + header.tile_format, tile);
```

# API

<!--- This chapter is generated automatically --->

<details>

<summary><h2>Class: <code>VersaTiles</code><a id="class_versatiles"></a></h2></summary>

The `VersaTiles` class is a wrapper around a `.versatiles` container file. It provides methods\
to access tile data, metadata, and other properties within the container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L27">\[src]</a></sup>

<details>

<summary><h3>Constructor: <code>new VersaTiles&#40;source, options&#41;</code></h3></summary>

Constructs a new instance of the VersaTiles class. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L50">\[src]</a></sup>

**Parameters:**

* `source: string | `[`Reader`](#type_reader)\
  The data source for the tiles. This can be a URL starting with `http://` or `https://`,
  a path to a local file, or a custom `Reader` function that reads data chunks based on offset and length.
* `options: `[`Options`](#interface_options) (optional)\
  Optional settings that configure tile handling.

**Returns:** [`VersaTiles`](#class_versatiles)
**Methods**

</details>

<details>

<summary><h3>Method: <code>getHeader&#40;&#41;</code></h3></summary>

Asynchronously retrieves the header information from the `.versatiles` container.\
This method is primarily for internal use. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L75">\[src]</a></sup>

**Returns:** `Promise<`[`Header`](#interface_header)`>`

</details>

<details>

<summary><h3>Method: <code>getMetadata&#40;&#41;</code></h3></summary>

Asynchronously retrieves the metadata associated with the `.versatiles` container.\
Metadata typically includes information about `vector_layers` for vector tiles.
If the container does not include metadata, this method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L133">\[src]</a></sup>

**Returns:** `Promise<null | object>`

</details>

<details>

<summary><h3>Method: <code>getTileFormat&#40;&#41;</code></h3></summary>

Asynchronously determines the tile format, such as "png" or "pbf", based on the header information. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L153">\[src]</a></sup>

**Returns:** `Promise<`[`Format`](#type_format)`>`

</details>

<details>

<summary><h3>Method: <code>getBlockIndex&#40;&#41;</code></h3></summary>

Asynchronously retrieves a mapping of tile block indices. The map's keys are formatted as "{z},{x},{y}".\
This method is for internal use to manage tile lookup within the container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L165">\[src]</a></sup>

**Returns:** `Promise<Map<string,`[`Block`](#interface_block)`>>`

</details>

<details>

<summary><h3>Method: <code>getTileIndex&#40;block&#41;</code></h3></summary>

Asynchronously retrieves the tile index for a specified block. This is an internal method used to\
maintain a lookup for every tile within a block. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L244">\[src]</a></sup>

**Parameters:**

* `block: `[`Block`](#interface_block)\
  The block for which to retrieve the tile index.

**Returns:** `Promise<`[`TileIndex`](#interface_tileindex)`>`

</details>

<details>

<summary><h3>Method: <code>getTile&#40;z, x, y&#41;</code></h3></summary>

Asynchronously retrieves a specific tile's data as a Buffer. If the tile data is compressed as\
defined in the container header, the returned Buffer will contain the compressed data.
To obtain uncompressed data, use the `getTileUncompressed` method.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L274">\[src]</a></sup>

**Parameters:**

* `z: number`\
  The zoom level of the tile.
* `x: number`\
  The x coordinate of the tile within its zoom level.
* `y: number`\
  The y coordinate of the tile within its zoom level.

**Returns:** `Promise<null | Buffer>`

</details>

<details>

<summary><h3>Method: <code>getTileUncompressed&#40;z, x, y&#41;</code></h3></summary>

Asynchronously retrieves a specific tile's uncompressed data as a Buffer. This method first\
retrieves the compressed tile data using `getTile` and then decompresses it based on the
compression setting in the container header.
If the specified tile does not exist, the method returns `null`. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/index.ts#L322">\[src]</a></sup>

**Parameters:**

* `z: number`\
  The zoom level of the tile.
* `x: number`\
  The x coordinate of the tile within its zoom level.
* `y: number`\
  The y coordinate of the tile within its zoom level.

**Returns:** `Promise<null | Buffer>`

</details>

</details>

<details>

<summary><h2>Interface: <code>Block</code><a id="interface_block"></a></h2></summary>

Interface for a block of tiles including necessary metadata.\
For more details, refer to [spec v02](https://github.com/versatiles-org/versatiles-spec/blob/main/v02/readme.md#block_index). <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/interfaces.ts#L89">\[src]</a></sup>

**Properties**

* `level: number`\
  The zoom level for this block.
* `column: number`\
  The column position of this block at the current zoom level.
* `row: number`\
  The row position of this block at the current zoom level.
* `colMin: number`\
  Minimum column index for tiles stored in this block (range: 0-255).
* `rowMin: number`\
  Minimum row index for tiles stored in this block (range: 0-255).
* `colMax: number`\
  Maximum column index for tiles stored in this block (range: 0-255).
* `rowMax: number`\
  Maximum row index for tiles stored in this block (range: 0-255).
* `blockOffset: number`\
  Byte position where this block starts in the file container.
* `tileIndexOffset: number`\
  Byte position where the tile index starts within the container.
* `tileIndexLength: number`\
  Length of the tile index in bytes.
* `tileCount: number`\
  The number of tiles contained in this block.
* `tileIndex: `[`TileIndex`](#interface_tileindex) (optional)\
  Optional tile index if it has been fetched.

</details>

<details>

<summary><h2>Interface: <code>Header</code><a id="interface_header"></a></h2></summary>

Interface for the metadata header of a `*.Versatiles` container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/interfaces.ts#L56">\[src]</a></sup>

**Properties**

* `magic: string`\
  Identifier for the container format, usually "versatiles\_v02".
* `version: string`\
  Version of the container format, typically "v02".
* `tileFormat: `[`Format`](#type_format)\
  The format used for storing tiles.
* `tileCompression: `[`Compression`](#type_compression)\
  The type of compression applied to tiles.
* `zoomMin: number`\
  The minimum zoom level.
* `zoomMax: number`\
  The maximum zoom level.
* `bbox: [number, number, number, number]`\
  Bounding box coordinates as \[lon\_min, lat\_min, lon\_max, lat\_max].
* `metaOffset: number`\
  The byte offset for metadata within the container.
* `metaLength: number`\
  The byte size of the metadata. A value of 0 means no metadata.
* `blockIndexOffset: number`\
  The byte offset for the block index within the container.
* `blockIndexLength: number`\
  The byte size of the block index. A value of 0 indicates no tiles in the container.

</details>

<details>

<summary><h2>Interface: <code>Options</code><a id="interface_options"></a></h2></summary>

Interface for defining the options available for reading a container. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/interfaces.ts#L123">\[src]</a></sup>

**Properties**

* `tms: boolean`\
  If set to true, uses the [TMS (Tile Map Service) tile ordering](https://wiki.openstreetmap.org/wiki/TMS) where y=0 is the southernmost point.

</details>

<details>

<summary><h2>Interface: <code>TileIndex</code><a id="interface_tileindex"></a></h2></summary>

Interface for the index structure used for tiles within a block. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/interfaces.ts#L112">\[src]</a></sup>

**Properties**

* `offsets: Float64Array`\
  Array indicating the start byte positions of tiles within the block.
* `lengths: Float64Array`\
  Array specifying the byte lengths of the tiles. A length of 0 means the tile is not stored.

</details>

<details>

<summary><h2>Type: <code>Compression</code><a id="type_compression"></a></h2></summary>

Supported compression.\
`null` signifies that the data is uncompressed. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/interfaces.ts#L5">\[src]</a></sup>

**Type:** `"br" | "gzip" | null`

</details>

<details>

<summary><h2>Type: <code>Format</code><a id="type_format"></a></h2></summary>

Supported tile formats. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/interfaces.ts#L11">\[src]</a></sup>

**Type:** `"avif" | "bin" | "geojson" | "jpeg" | "json" | "pbf" | "png" | "svg" | "topojson" | "webp" | null`

</details>

<details>

<summary><h2>Type: <code>Reader</code><a id="type_reader"></a></h2></summary>

Type definition for an asynchronous function to read content from a VersaTiles container.

This can be useful for accessing a container data over any transport protocol. <sup><a href="https://github.com/versatiles-org/node-versatiles/blob/3090c62/versatiles-container/src/interfaces.ts#L37">\[src]</a></sup>

**Type:** `(position: number, length: number) => Promise<Buffer>`

</details>

# License

[Unlicense](./LICENSE.md)

# Future work

This library could be extended to run in a web browser to read VersaTiles containers via `fetch`.