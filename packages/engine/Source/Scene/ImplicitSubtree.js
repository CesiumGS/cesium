import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import RuntimeError from "../Core/RuntimeError.js";
import hasExtension from "./hasExtension.js";
import ImplicitAvailabilityBitstream from "./ImplicitAvailabilityBitstream.js";
import ImplicitMetadataView from "./ImplicitMetadataView.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";
import ImplicitSubtreeMetadata from "./ImplicitSubtreeMetadata.js";
import MetadataTable from "./MetadataTable.js";
import ResourceCache from "./ResourceCache.js";

/**
 * An object representing a single subtree in an implicit tileset
 * including availability.
 * <p>
 * Subtrees handle tile metadata, defined in the subtree JSON in either
 * tileMetadata (3D Tiles 1.1) or the <code>3DTILES_metadata</code> extension.
 * Subtrees also handle content metadata and metadata about the subtree itself.
 * </p>
 *
 * This object is normally not instantiated directly, use {@link ImplicitSubtree.fromSubtreeJson}.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata#implicit-tile-properties|Implicit Tile Properties in the 3DTILES_metadata specification}
 * @see ImplicitSubtree.fromSubtreeJson
 *
 * @alias ImplicitSubtree
 * @constructor
 *
 * @param {Resource} resource The resource for this subtree. This is used for fetching external buffers as needed.
 * @param {ImplicitTileset} implicitTileset The implicit tileset. This includes information about the size of subtrees
 * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the subtree's root tile.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function ImplicitSubtree(resource, implicitTileset, implicitCoordinates) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resource", resource);
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.object("implicitCoordinates", implicitCoordinates);
  //>>includeEnd('debug');

  this._resource = resource;
  this._subtreeJson = undefined;
  this._bufferLoader = undefined;
  this._tileAvailability = undefined;
  this._contentAvailabilityBitstreams = [];
  this._childSubtreeAvailability = undefined;
  this._implicitCoordinates = implicitCoordinates;
  this._subtreeLevels = implicitTileset.subtreeLevels;
  this._subdivisionScheme = implicitTileset.subdivisionScheme;
  this._branchingFactor = implicitTileset.branchingFactor;

  // properties for metadata
  this._metadata = undefined;
  this._tileMetadataTable = undefined;
  this._tilePropertyTableJson = undefined;

  this._contentMetadataTables = [];
  this._contentPropertyTableJsons = [];

  // Jump buffers are maps of availability bit index to entity ID
  this._tileJumpBuffer = undefined;
  this._contentJumpBuffers = [];

  this._ready = false;
}

Object.defineProperties(ImplicitSubtree.prototype, {
  /**
   * Returns true once all necessary availability buffers
   * are loaded.
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * When subtree metadata is present (3D Tiles 1.1), this property stores an {@link ImplicitSubtreeMetadata} instance
   *
   * @type {ImplicitSubtreeMetadata}
   * @readonly
   * @private
   */
  metadata: {
    get: function () {
      return this._metadata;
    },
  },

  /**
   * When tile metadata is present (3D Tiles 1.1) or the <code>3DTILES_metadata</code> extension is used,
   * this property stores a {@link MetadataTable} instance for the tiles in the subtree.
   *
   * @type {MetadataTable}
   * @readonly
   * @private
   */
  tileMetadataTable: {
    get: function () {
      return this._tileMetadataTable;
    },
  },

  /**
   * When tile metadata is present (3D Tiles 1.1) or the <code>3DTILES_metadata</code> extension is used,
   * this property stores the JSON from the extension. This is used by {@link TileMetadata}
   * to get the extras and extensions for the tiles in the subtree.
   *
   * @type {object}
   * @readonly
   * @private
   */
  tilePropertyTableJson: {
    get: function () {
      return this._tilePropertyTableJson;
    },
  },

  /**
   * When content metadata is present (3D Tiles 1.1), this property stores
   * an array of {@link MetadataTable} instances for the contents in the subtree.
   *
   * @type {Array}
   * @readonly
   * @private
   */
  contentMetadataTables: {
    get: function () {
      return this._contentMetadataTables;
    },
  },

  /**
   * When content metadata is present (3D Tiles 1.1), this property
   * an array of the JSONs from the extension. This is used to get the extras
   * and extensions for the contents in the subtree.
   *
   * @type {Array}
   * @readonly
   * @private
   */
  contentPropertyTableJsons: {
    get: function () {
      return this._contentPropertyTableJsons;
    },
  },

  /**
   * Gets the implicit tile coordinates for the root of the subtree.
   *
   * @type {ImplicitTileCoordinates}
   * @readonly
   * @private
   */
  implicitCoordinates: {
    get: function () {
      return this._implicitCoordinates;
    },
  },
});

/**
 * Check if a specific tile is available at an index of the tile availability bitstream
 *
 * @param {number} index The index of the desired tile
 * @returns {boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.tileIsAvailableAtIndex = function (index) {
  return this._tileAvailability.getBit(index);
};

/**
 * Check if a specific tile is available at an implicit tile coordinate
 * NOTE: only used for voxels.
 *
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @returns {boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.tileIsAvailableAtCoordinates = function (
  implicitCoordinates,
) {
  const index = this.getTileIndex(implicitCoordinates);
  return this.tileIsAvailableAtIndex(index);
};

/**
 * Check if a specific tile's content is available at an index of the content availability bitstream
 *
 * @param {number} index The index of the desired tile
 * @param {number} [contentIndex=0] The index of the desired content when multiple contents are used.
 * @returns {boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.contentIsAvailableAtIndex = function (
  index,
  contentIndex,
) {
  contentIndex = contentIndex ?? 0;
  //>>includeStart('debug', pragmas.debug);
  if (
    contentIndex < 0 ||
    contentIndex >= this._contentAvailabilityBitstreams.length
  ) {
    throw new DeveloperError("contentIndex out of bounds.");
  }
  //>>includeEnd('debug');

  return this._contentAvailabilityBitstreams[contentIndex].getBit(index);
};

/**
 * Check if a specific tile's content is available at an implicit tile coordinate
 *
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @param {number} [contentIndex=0] The index of the desired content when the <code>3DTILES_multiple_contents</code> extension is used.
 * @returns {boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.contentIsAvailableAtCoordinates = function (
  implicitCoordinates,
  contentIndex,
) {
  const index = this.getTileIndex(implicitCoordinates);
  return this.contentIsAvailableAtIndex(index, contentIndex);
};

/**
 * Check if a child subtree is available at an index of the child subtree availability bitstream
 *
 * @param {number} index The index of the desired child subtree
 * @returns {boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.childSubtreeIsAvailableAtIndex = function (index) {
  return this._childSubtreeAvailability.getBit(index);
};

/**
 * Check if a specific child subtree is available at an implicit tile coordinate
 * NOTE: only used for voxels.
 *
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a child subtree
 * @returns {boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.childSubtreeIsAvailableAtCoordinates = function (
  implicitCoordinates,
) {
  const index = this.getChildSubtreeIndex(implicitCoordinates);
  return this.childSubtreeIsAvailableAtIndex(index);
};

/**
 * Get the index of the first node at the given level within this subtree.
 * e.g. for a quadtree:
 * <ul>
 * <li>Level 0 starts at index 0</li>
 * <li>Level 1 starts at index 1</li>
 * <li>Level 2 starts at index 5</li>
 * </ul>
 *
 * @param {number} level The 0-indexed level number relative to the root of the subtree
 * @returns {number} The first index at the desired level
 * @private
 */
ImplicitSubtree.prototype.getLevelOffset = function (level) {
  const branchingFactor = this._branchingFactor;
  return (Math.pow(branchingFactor, level) - 1) / (branchingFactor - 1);
};

/**
 * Get the morton index of a tile's parent. This is equivalent to
 * chopping off the last 2 (quadtree) or 3 (octree) bits of the morton
 * index.
 *
 * @param {number} childIndex The morton index of the child tile relative to its parent
 * @returns {number} The index of the child's parent node
 * @private
 */
ImplicitSubtree.prototype.getParentMortonIndex = function (mortonIndex) {
  let bitsPerLevel = 2;
  if (this._subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    bitsPerLevel = 3;
  }

  return mortonIndex >> bitsPerLevel;
};

/**
 * Parse all relevant information out of the subtree. This fetches any
 * external buffers that are used by the implicit tileset.
 *
 * @param {Resource} resource The resource for this subtree. This is used for fetching external buffers as needed.
 * @param {object} [json] The JSON object for this subtree. If parsing from a binary subtree file, this will be undefined.
 * @param {Uint8Array} [subtreeView] The contents of the subtree binary
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to.
 * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the subtree's root tile.
 * @return {Promise<ImplicitSubtree>} The created subtree
 * @private
 *
 * @exception {DeveloperError} One of json and subtreeView must be defined.
 */
ImplicitSubtree.fromSubtreeJson = async function (
  resource,
  json,
  subtreeView,
  implicitTileset,
  implicitCoordinates,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resource", resource);
  if (defined(json) === defined(subtreeView)) {
    throw new DeveloperError("One of json and subtreeView must be defined.");
  }
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.object("implicitCoordinates", implicitCoordinates);
  //>>includeEnd('debug');

  const subtree = new ImplicitSubtree(
    resource,
    implicitTileset,
    implicitCoordinates,
  );

  let chunks;
  if (defined(json)) {
    chunks = {
      json: json,
      binary: undefined,
    };
  } else {
    chunks = parseSubtreeChunks(subtreeView);
  }

  const subtreeJson = chunks.json;
  subtree._subtreeJson = subtreeJson;

  let tilePropertyTableJson;
  if (hasExtension(subtreeJson, "3DTILES_metadata")) {
    tilePropertyTableJson = subtreeJson.extensions["3DTILES_metadata"];
  } else if (defined(subtreeJson.tileMetadata)) {
    const propertyTableIndex = subtreeJson.tileMetadata;
    tilePropertyTableJson = subtreeJson.propertyTables[propertyTableIndex];
  }

  const contentPropertyTableJsons = [];
  if (defined(subtreeJson.contentMetadata)) {
    const length = subtreeJson.contentMetadata.length;
    for (let i = 0; i < length; i++) {
      const propertyTableIndex = subtreeJson.contentMetadata[i];
      contentPropertyTableJsons.push(
        subtreeJson.propertyTables[propertyTableIndex],
      );
    }
  }

  let metadata;
  const schema = implicitTileset.metadataSchema;
  const subtreeMetadata = subtreeJson.subtreeMetadata;
  if (defined(subtreeMetadata)) {
    const metadataClass = subtreeMetadata.class;
    const subtreeMetadataClass = schema.classes[metadataClass];
    metadata = new ImplicitSubtreeMetadata({
      subtreeMetadata: subtreeMetadata,
      class: subtreeMetadataClass,
    });
  }

  subtree._metadata = metadata;
  subtree._tilePropertyTableJson = tilePropertyTableJson;
  subtree._contentPropertyTableJsons = contentPropertyTableJsons;

  // if no contentAvailability is specified, no tile in the subtree has
  // content
  const defaultContentAvailability = {
    constant: 0,
  };

  // In 3D Tiles 1.1, content availability is provided in an array in the subtree JSON
  // regardless of whether or not it contains multiple contents. This differs from previous
  // schemas, where content availability is either a single object in the subtree JSON or
  // as an array in the 3DTILES_multiple_contents extension.
  //
  // After identifying how availability is stored, put the results in this new array for consistent processing later
  subtreeJson.contentAvailabilityHeaders = [];
  if (hasExtension(subtreeJson, "3DTILES_multiple_contents")) {
    subtreeJson.contentAvailabilityHeaders =
      subtreeJson.extensions["3DTILES_multiple_contents"].contentAvailability;
  } else if (Array.isArray(subtreeJson.contentAvailability)) {
    subtreeJson.contentAvailabilityHeaders = subtreeJson.contentAvailability;
  } else {
    subtreeJson.contentAvailabilityHeaders.push(
      subtreeJson.contentAvailability ?? defaultContentAvailability,
    );
  }

  const bufferHeaders = preprocessBuffers(subtreeJson.buffers);
  const bufferViewHeaders = preprocessBufferViews(
    subtreeJson.bufferViews,
    bufferHeaders,
  );

  // Buffers and buffer views are inactive until explicitly marked active.
  // This way we can avoid fetching buffers that will not be used.
  markActiveBufferViews(subtreeJson, bufferViewHeaders);
  if (defined(tilePropertyTableJson)) {
    markActiveMetadataBufferViews(tilePropertyTableJson, bufferViewHeaders);
  }

  for (let i = 0; i < contentPropertyTableJsons.length; i++) {
    const contentPropertyTableJson = contentPropertyTableJsons[i];
    markActiveMetadataBufferViews(contentPropertyTableJson, bufferViewHeaders);
  }

  const buffersU8 = await requestActiveBuffers(
    subtree,
    bufferHeaders,
    chunks.binary,
  );
  const bufferViewsU8 = parseActiveBufferViews(bufferViewHeaders, buffersU8);
  parseAvailability(subtree, subtreeJson, implicitTileset, bufferViewsU8);

  if (defined(tilePropertyTableJson)) {
    parseTileMetadataTable(subtree, implicitTileset, bufferViewsU8);
    makeTileJumpBuffer(subtree);
  }

  parseContentMetadataTables(subtree, implicitTileset, bufferViewsU8);
  makeContentJumpBuffers(subtree);

  subtree._ready = true;
  return subtree;
};

/**
 * A helper object for storing the two parts of the subtree binary
 *
 * @typedef {object} SubtreeChunks
 * @property {object} json The json chunk of the subtree
 * @property {Uint8Array} binary The binary chunk of the subtree. This represents the internal buffer.
 * @private
 */

/**
 * Given the binary contents of a subtree, split into JSON and binary chunks
 *
 * @param {Uint8Array} subtreeView The subtree binary
 * @returns {SubtreeChunks} An object containing the JSON and binary chunks.
 * @private
 */
function parseSubtreeChunks(subtreeView) {
  // Parse the header
  const littleEndian = true;
  const subtreeReader = new DataView(
    subtreeView.buffer,
    subtreeView.byteOffset,
  );
  // Skip to the chunk lengths
  let byteOffset = 8;

  // Read the bottom 32 bits of the 64-bit byte length. This is ok for now because:
  // 1) not all browsers have native 64-bit operations
  // 2) the data is well under 4GB
  const jsonByteLength = subtreeReader.getUint32(byteOffset, littleEndian);
  byteOffset += 8;
  const binaryByteLength = subtreeReader.getUint32(byteOffset, littleEndian);
  byteOffset += 8;

  const subtreeJson = getJsonFromTypedArray(
    subtreeView,
    byteOffset,
    jsonByteLength,
  );
  byteOffset += jsonByteLength;
  const subtreeBinary = subtreeView.subarray(
    byteOffset,
    byteOffset + binaryByteLength,
  );

  return {
    json: subtreeJson,
    binary: subtreeBinary,
  };
}

/**
 * A buffer header is the JSON header from the subtree JSON chunk plus
 * a couple extra boolean flags for easy reference.
 *
 * Buffers are assumed inactive until explicitly marked active. This is used
 * to avoid fetching unneeded buffers.
 *
 * @typedef {object} BufferHeader
 * @property {boolean} isExternal True if this is an external buffer
 * @property {boolean} isActive Whether this buffer is currently used.
 * @property {string} [uri] The URI of the buffer (external buffers only)
 * @property {number} byteLength The byte length of the buffer, including any padding contained within.
 * @private
 */

/**
 * Iterate over the list of buffers from the subtree JSON and add the
 * isExternal and isActive fields for easier parsing later. This modifies
 * the objects in place.
 *
 * @param {Object[]} [bufferHeaders=[]] The JSON from subtreeJson.buffers.
 * @returns {BufferHeader[]} The same array of headers with additional fields.
 * @private
 */
function preprocessBuffers(bufferHeaders) {
  bufferHeaders = defined(bufferHeaders) ? bufferHeaders : [];
  for (let i = 0; i < bufferHeaders.length; i++) {
    const bufferHeader = bufferHeaders[i];
    bufferHeader.isExternal = defined(bufferHeader.uri);
    bufferHeader.isActive = false;
  }

  return bufferHeaders;
}

/**
 * A buffer header is the JSON header from the subtree JSON chunk plus
 * the isActive flag and a reference to the header for the underlying buffer
 *
 * @typedef {object} BufferViewHeader
 * @property {BufferHeader} bufferHeader A reference to the header for the underlying buffer
 * @property {boolean} isActive Whether this bufferView is currently used.
 * @property {number} buffer The index of the underlying buffer.
 * @property {number} byteOffset The start byte of the bufferView within the buffer.
 * @property {number} byteLength The length of the bufferView. No padding is included in this length.
 * @private
 */

/**
 * Iterate the list of buffer views from the subtree JSON and add the
 * isActive flag. Also save a reference to the bufferHeader
 *
 * @param {Object[]} [bufferViewHeaders=[]] The JSON from subtree.bufferViews
 * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers
 * @returns {BufferViewHeader[]} The same array of bufferView headers with additional fields
 * @private
 */
function preprocessBufferViews(bufferViewHeaders, bufferHeaders) {
  bufferViewHeaders = defined(bufferViewHeaders) ? bufferViewHeaders : [];
  for (let i = 0; i < bufferViewHeaders.length; i++) {
    const bufferViewHeader = bufferViewHeaders[i];
    const bufferHeader = bufferHeaders[bufferViewHeader.buffer];
    bufferViewHeader.bufferHeader = bufferHeader;
    bufferViewHeader.isActive = false;
  }
  return bufferViewHeaders;
}

/**
 * Determine which buffer views need to be loaded into memory. This includes:
 *
 * <ul>
 * <li>The tile availability bitstream (if a bitstream is defined)</li>
 * <li>The content availability bitstream(s) (if a bitstream is defined)</li>
 * <li>The child subtree availability bitstream (if a bitstream is defined)</li>
 * </ul>
 *
 * <p>
 * This function modifies the buffer view headers' isActive flags in place.
 * </p>
 *
 * @param {Object[]} subtreeJson The JSON chunk from the subtree
 * @param {BufferViewHeader[]} bufferViewHeaders The preprocessed buffer view headers
 * @private
 */
function markActiveBufferViews(subtreeJson, bufferViewHeaders) {
  let header;
  const tileAvailabilityHeader = subtreeJson.tileAvailability;

  // Check for bitstream first, which is part of the current schema.
  // bufferView is the name of the bitstream from an older schema.
  if (defined(tileAvailabilityHeader.bitstream)) {
    header = bufferViewHeaders[tileAvailabilityHeader.bitstream];
  } else if (defined(tileAvailabilityHeader.bufferView)) {
    header = bufferViewHeaders[tileAvailabilityHeader.bufferView];
  }

  if (defined(header)) {
    header.isActive = true;
    header.bufferHeader.isActive = true;
  }

  const contentAvailabilityHeaders = subtreeJson.contentAvailabilityHeaders;
  for (let i = 0; i < contentAvailabilityHeaders.length; i++) {
    header = undefined;
    if (defined(contentAvailabilityHeaders[i].bitstream)) {
      header = bufferViewHeaders[contentAvailabilityHeaders[i].bitstream];
    } else if (defined(contentAvailabilityHeaders[i].bufferView)) {
      header = bufferViewHeaders[contentAvailabilityHeaders[i].bufferView];
    }

    if (defined(header)) {
      header.isActive = true;
      header.bufferHeader.isActive = true;
    }
  }

  header = undefined;
  const childSubtreeAvailabilityHeader = subtreeJson.childSubtreeAvailability;
  if (defined(childSubtreeAvailabilityHeader.bitstream)) {
    header = bufferViewHeaders[childSubtreeAvailabilityHeader.bitstream];
  } else if (defined(childSubtreeAvailabilityHeader.bufferView)) {
    header = bufferViewHeaders[childSubtreeAvailabilityHeader.bufferView];
  }

  if (defined(header)) {
    header.isActive = true;
    header.bufferHeader.isActive = true;
  }
}

/**
 * For handling metadata, look over the tile and content metadata buffers
 * <p>
 * This always loads all of the metadata immediately. Future iterations may
 * allow filtering this to avoid downloading unneeded buffers.
 * </p>
 *
 * @param {object} propertyTableJson The property table JSON for either a tile or some content
 * @param {BufferViewHeader[]} bufferViewHeaders The preprocessed buffer view headers
 * @private
 */
function markActiveMetadataBufferViews(propertyTableJson, bufferViewHeaders) {
  const properties = propertyTableJson.properties;
  let header;
  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      const metadataHeader = properties[key];

      // An older spec used bufferView
      const valuesBufferView =
        metadataHeader.values ?? metadataHeader.bufferView;
      header = bufferViewHeaders[valuesBufferView];
      header.isActive = true;
      header.bufferHeader.isActive = true;

      // An older spec used stringOffsetBufferView
      const stringOffsetBufferView =
        metadataHeader.stringOffsets ?? metadataHeader.stringOffsetBufferView;
      if (defined(stringOffsetBufferView)) {
        header = bufferViewHeaders[stringOffsetBufferView];
        header.isActive = true;
        header.bufferHeader.isActive = true;
      }

      // an older spec used arrayOffsetBufferView
      const arrayOffsetBufferView =
        metadataHeader.arrayOffsets ?? metadataHeader.arrayOffsetBufferView;
      if (defined(arrayOffsetBufferView)) {
        header = bufferViewHeaders[arrayOffsetBufferView];
        header.isActive = true;
        header.bufferHeader.isActive = true;
      }
    }
  }
}

/**
 * Go through the list of buffers and gather all the active ones into a
 * a dictionary. Since external buffers are allowed, this sometimes involves
 * fetching separate binary files. Consequently, this method returns a promise.
 * <p>
 * The results are put into a dictionary object. The keys are indices of
 * buffers, and the values are Uint8Arrays of the contents. Only buffers
 * marked with the isActive flag are fetched.
 * </p>
 * <p>
 * The internal buffer (the subtree's binary chunk) is also stored in this
 * dictionary if it is marked active.
 * </p>
 * @param {ImplicitSubtree} subtree The subtree
 * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers
 * @param {Uint8Array} internalBuffer The binary chunk of the subtree file
 * @returns {Promise<object>} A promise resolving to the dictionary of active buffers
 * @private
 */
function requestActiveBuffers(subtree, bufferHeaders, internalBuffer) {
  const promises = [];
  for (let i = 0; i < bufferHeaders.length; i++) {
    const bufferHeader = bufferHeaders[i];
    if (!bufferHeader.isActive) {
      promises.push(Promise.resolve(undefined));
    } else if (bufferHeader.isExternal) {
      const promise = requestExternalBuffer(subtree, bufferHeader);
      promises.push(promise);
    } else {
      promises.push(Promise.resolve(internalBuffer));
    }
  }
  return Promise.all(promises).then(function (bufferResults) {
    const buffersU8 = {};
    for (let i = 0; i < bufferResults.length; i++) {
      const result = bufferResults[i];
      if (defined(result)) {
        buffersU8[i] = result;
      }
    }
    return buffersU8;
  });
}

async function requestExternalBuffer(subtree, bufferHeader) {
  const baseResource = subtree._resource;
  const bufferResource = baseResource.getDerivedResource({
    url: bufferHeader.uri,
  });

  const bufferLoader = ResourceCache.getExternalBufferLoader({
    resource: bufferResource,
  });
  subtree._bufferLoader = bufferLoader;

  try {
    await bufferLoader.load();
  } catch (error) {
    if (bufferLoader.isDestroyed()) {
      return;
    }

    throw error;
  }

  return bufferLoader.typedArray;
}

/**
 * Go through the list of buffer views, and if they are marked as active,
 * extract a subarray from one of the active buffers.
 *
 * @param {BufferViewHeader[]} bufferViewHeaders
 * @param {object} buffersU8 A dictionary of buffer index to a Uint8Array of its contents.
 * @returns {object} A dictionary of buffer view index to a Uint8Array of its contents.
 * @private
 */
function parseActiveBufferViews(bufferViewHeaders, buffersU8) {
  const bufferViewsU8 = {};
  for (let i = 0; i < bufferViewHeaders.length; i++) {
    const bufferViewHeader = bufferViewHeaders[i];

    if (!bufferViewHeader.isActive) {
      continue;
    }

    const start = bufferViewHeader.byteOffset;
    const end = start + bufferViewHeader.byteLength;
    const buffer = buffersU8[bufferViewHeader.buffer];
    const bufferView = buffer.subarray(start, end);
    bufferViewsU8[i] = bufferView;
  }
  return bufferViewsU8;
}

/**
 * Parse the three availability bitstreams and store them in the subtree
 *
 * @param {ImplicitSubtree} subtree The subtree to modify
 * @param {object} subtreeJson The subtree JSON
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to
 * @param {object} bufferViewsU8 A dictionary of buffer view index to a Uint8Array of its contents.
 * @private
 */
function parseAvailability(
  subtree,
  subtreeJson,
  implicitTileset,
  bufferViewsU8,
) {
  const branchingFactor = implicitTileset.branchingFactor;
  const subtreeLevels = implicitTileset.subtreeLevels;
  const tileAvailabilityBits =
    (Math.pow(branchingFactor, subtreeLevels) - 1) / (branchingFactor - 1);
  const childSubtreeBits = Math.pow(branchingFactor, subtreeLevels);

  // availableCount is only needed for the metadata jump buffer, which
  // corresponds to the tile availability bitstream.
  const hasMetadataExtension = hasExtension(subtreeJson, "3DTILES_metadata");
  const hasTileMetadata = defined(subtree._tilePropertyTableJson);
  let computeAvailableCountEnabled = hasMetadataExtension || hasTileMetadata;

  subtree._tileAvailability = parseAvailabilityBitstream(
    subtreeJson.tileAvailability,
    bufferViewsU8,
    tileAvailabilityBits,
    computeAvailableCountEnabled,
  );

  const hasContentMetadata = subtree._contentPropertyTableJsons.length > 0;
  computeAvailableCountEnabled =
    computeAvailableCountEnabled || hasContentMetadata;

  for (let i = 0; i < subtreeJson.contentAvailabilityHeaders.length; i++) {
    const bitstream = parseAvailabilityBitstream(
      subtreeJson.contentAvailabilityHeaders[i],
      bufferViewsU8,
      // content availability has the same length as tile availability.
      tileAvailabilityBits,
      computeAvailableCountEnabled,
    );
    subtree._contentAvailabilityBitstreams.push(bitstream);
  }

  subtree._childSubtreeAvailability = parseAvailabilityBitstream(
    subtreeJson.childSubtreeAvailability,
    bufferViewsU8,
    childSubtreeBits,
  );
}

/**
 * Given the JSON describing an availability bitstream, turn it into an
 * in-memory representation using an {@link ImplicitAvailabilityBitstream}
 * object. This handles both constants and bitstreams from a bufferView.
 *
 * @param {object} availabilityJson A JSON object representing the availability
 * @param {object} bufferViewsU8 A dictionary of bufferView index to its Uint8Array contents.
 * @param {number} lengthBits The length of the availability bitstream in bits
 * @param {boolean} [computeAvailableCountEnabled] If true and availabilityJson.availableCount is undefined, the availableCount will be computed.
 * @returns {ImplicitAvailabilityBitstream} The parsed bitstream object
 * @private
 */
function parseAvailabilityBitstream(
  availabilityJson,
  bufferViewsU8,
  lengthBits,
  computeAvailableCountEnabled,
) {
  if (defined(availabilityJson.constant)) {
    return new ImplicitAvailabilityBitstream({
      constant: Boolean(availabilityJson.constant),
      lengthBits: lengthBits,
      availableCount: availabilityJson.availableCount,
    });
  }

  let bufferView;

  // Check for bitstream first, which is part of the current schema.
  // bufferView is the name of the bitstream from an older schema.
  if (defined(availabilityJson.bitstream)) {
    bufferView = bufferViewsU8[availabilityJson.bitstream];
  } else if (defined(availabilityJson.bufferView)) {
    bufferView = bufferViewsU8[availabilityJson.bufferView];
  }

  return new ImplicitAvailabilityBitstream({
    bitstream: bufferView,
    lengthBits: lengthBits,
    availableCount: availabilityJson.availableCount,
    computeAvailableCountEnabled: computeAvailableCountEnabled,
  });
}

/**
 * Parse the metadata table for the tile metadata, storing a {@link MetadataTable}
 * in the subtree.
 *
 * @param {ImplicitSubtree} subtree The subtree
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to.
 * @param {object} bufferViewsU8 A dictionary of bufferView index to its Uint8Array contents.
 * @private
 */
function parseTileMetadataTable(subtree, implicitTileset, bufferViewsU8) {
  const tilePropertyTableJson = subtree._tilePropertyTableJson;
  const tileCount = subtree._tileAvailability.availableCount;
  const metadataSchema = implicitTileset.metadataSchema;

  const tileMetadataClassName = tilePropertyTableJson.class;
  const tileMetadataClass = metadataSchema.classes[tileMetadataClassName];

  subtree._tileMetadataTable = new MetadataTable({
    class: tileMetadataClass,
    count: tileCount,
    properties: tilePropertyTableJson.properties,
    bufferViews: bufferViewsU8,
  });
}

/**
 * Parse the metadata tables for the content metadata, storing an array of
 * {@link MetadataTable}s in the subtree.
 *
 * @param {ImplicitSubtree} subtree The subtree
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to.
 * @param {object} bufferViewsU8 A dictionary of bufferView index to its Uint8Array contents.
 * @private
 */
function parseContentMetadataTables(subtree, implicitTileset, bufferViewsU8) {
  const contentPropertyTableJsons = subtree._contentPropertyTableJsons;
  const contentAvailabilityBitstreams = subtree._contentAvailabilityBitstreams;
  const metadataSchema = implicitTileset.metadataSchema;

  const contentMetadataTables = subtree._contentMetadataTables;
  for (let i = 0; i < contentPropertyTableJsons.length; i++) {
    const contentPropertyTableJson = contentPropertyTableJsons[i];
    const contentAvailabilityBitsteam = contentAvailabilityBitstreams[i];

    const contentCount = contentAvailabilityBitsteam.availableCount;
    const contentMetadataClassName = contentPropertyTableJson.class;
    const contentMetadataClass =
      metadataSchema.classes[contentMetadataClassName];

    const metadataTable = new MetadataTable({
      class: contentMetadataClass,
      count: contentCount,
      properties: contentPropertyTableJson.properties,
      bufferViews: bufferViewsU8,
    });

    contentMetadataTables.push(metadataTable);
  }
}

/**
 * Make a jump buffer, i.e. a map of a bit index to the metadata entity ID.
 * <p>
 * For unavailable tiles and content, the jump buffer entries will be uninitialized.
 * Use the tile and content availability to determine whether a jump buffer value is valid.
 * </p>
 *
 * @param {ImplicitAvailabilityBitstream} availability The availability bitstream to create the jump buffer from.
 * @returns {Array} The resulting jump buffer.
 * @private
 */
function makeJumpBuffer(availability) {
  let entityId = 0;
  const bufferLength = availability.lengthBits;
  const availableCount = availability.availableCount;

  let jumpBuffer;
  if (availableCount < 256) {
    jumpBuffer = new Uint8Array(bufferLength);
  } else if (availableCount < 65536) {
    jumpBuffer = new Uint16Array(bufferLength);
  } else {
    jumpBuffer = new Uint32Array(bufferLength);
  }

  for (let i = 0; i < availability.lengthBits; i++) {
    if (availability.getBit(i)) {
      jumpBuffer[i] = entityId;
      entityId++;
    }
  }

  return jumpBuffer;
}

/**
 * Make the jump buffer, i.e. a map of a bit index to the metadata entity ID,
 * for the content metadata. This is stored in the subtree.
 *
 * @param {ImplicitSubtree} subtree The subtree
 * @private
 */
function makeTileJumpBuffer(subtree) {
  const tileJumpBuffer = makeJumpBuffer(subtree._tileAvailability);
  subtree._tileJumpBuffer = tileJumpBuffer;
}

/**
 * Make the jump buffers, i.e. maps of bit indices to the metadata entity IDs,
 * for the content metadata. This is stored in the subtree.
 *
 * @param {ImplicitSubtree} subtree The subtree
 * @private
 */
function makeContentJumpBuffers(subtree) {
  const contentJumpBuffers = subtree._contentJumpBuffers;
  const contentAvailabilityBitstreams = subtree._contentAvailabilityBitstreams;
  for (let i = 0; i < contentAvailabilityBitstreams.length; i++) {
    const contentAvailability = contentAvailabilityBitstreams[i];
    const contentJumpBuffer = makeJumpBuffer(contentAvailability);
    contentJumpBuffers.push(contentJumpBuffer);
  }
}

/**
 * Given the implicit tiling coordinates for a tile, get the index within the
 * subtree's tile availability bitstream.
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @return {number} The tile's index within the subtree.
 * @private
 */
ImplicitSubtree.prototype.getTileIndex = function (implicitCoordinates) {
  const localLevel =
    implicitCoordinates.level - this._implicitCoordinates.level;
  if (localLevel < 0 || this._subtreeLevels <= localLevel) {
    throw new RuntimeError("level is out of bounds for this subtree");
  }

  const subtreeCoordinates = implicitCoordinates.getSubtreeCoordinates();
  const offsetCoordinates =
    subtreeCoordinates.getOffsetCoordinates(implicitCoordinates);
  const index = offsetCoordinates.tileIndex;
  return index;
};

/**
 * Given the implicit tiling coordinates for a child subtree, get the index within the
 * subtree's child subtree availability bitstream.
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a child subtree
 * @return {number} The child subtree's index within the subtree's child subtree availability bitstream.
 * @private
 */
ImplicitSubtree.prototype.getChildSubtreeIndex = function (
  implicitCoordinates,
) {
  const localLevel =
    implicitCoordinates.level - this._implicitCoordinates.level;
  if (localLevel !== this._implicitCoordinates.subtreeLevels) {
    throw new RuntimeError("level is out of bounds for this subtree");
  }

  // Call getParentSubtreeCoordinates instead of getSubtreeCoordinates because the
  // child subtree is by definition the root of its own subtree, so we need to find
  // the parent subtree.
  const parentSubtreeCoordinates =
    implicitCoordinates.getParentSubtreeCoordinates();
  const offsetCoordinates =
    parentSubtreeCoordinates.getOffsetCoordinates(implicitCoordinates);
  const index = offsetCoordinates.mortonIndex;
  return index;
};

/**
 * Get the entity ID for a tile within this subtree.
 * @param {ImplicitSubtree} subtree The subtree
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @return {number} The entity ID for this tile for accessing tile metadata, or <code>undefined</code> if not applicable.
 *
 * @private
 */
function getTileEntityId(subtree, implicitCoordinates) {
  if (!defined(subtree._tileMetadataTable)) {
    return undefined;
  }

  const tileIndex = subtree.getTileIndex(implicitCoordinates);
  if (subtree._tileAvailability.getBit(tileIndex)) {
    return subtree._tileJumpBuffer[tileIndex];
  }

  return undefined;
}

/**
 * Get the entity ID for a content within this subtree.
 * @param {ImplicitSubtree} subtree The subtree
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a content
 * @param {number} contentIndex The content index, for distinguishing between multiple contents.
 * @return {number} The entity ID for this content for accessing content metadata, or <code>undefined</code> if not applicable.
 *
 * @private
 */
function getContentEntityId(subtree, implicitCoordinates, contentIndex) {
  const metadataTables = subtree._contentMetadataTables;
  if (!defined(metadataTables)) {
    return undefined;
  }

  const metadataTable = metadataTables[contentIndex];
  if (!defined(metadataTable)) {
    return undefined;
  }

  const availability = subtree._contentAvailabilityBitstreams[contentIndex];
  const tileIndex = subtree.getTileIndex(implicitCoordinates);
  if (availability.getBit(tileIndex)) {
    const contentJumpBuffer = subtree._contentJumpBuffers[contentIndex];
    return contentJumpBuffer[tileIndex];
  }

  return undefined;
}

/**
 * Create and return a metadata table view for a tile within this subtree.
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @return {ImplicitMetadataView} The metadata view for this tile, or <code>undefined</code> if not applicable.
 *
 * @private
 */
ImplicitSubtree.prototype.getTileMetadataView = function (implicitCoordinates) {
  const entityId = getTileEntityId(this, implicitCoordinates);
  if (!defined(entityId)) {
    return undefined;
  }

  const metadataTable = this._tileMetadataTable;
  return new ImplicitMetadataView({
    class: metadataTable.class,
    metadataTable: metadataTable,
    entityId: entityId,
    propertyTableJson: this._tilePropertyTableJson,
  });
};

/**
 * Create and return a metadata table view for a content within this subtree.
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a content
 * @param {number} contentIndex The index of the content used to distinguish between multiple contents
 * @return {ImplicitMetadataView} The metadata view for this content, or <code>undefined</code> if not applicable.
 *
 * @private
 */
ImplicitSubtree.prototype.getContentMetadataView = function (
  implicitCoordinates,
  contentIndex,
) {
  const entityId = getContentEntityId(this, implicitCoordinates, contentIndex);
  if (!defined(entityId)) {
    return undefined;
  }

  const metadataTable = this._contentMetadataTables[contentIndex];
  const propertyTableJson = this._contentPropertyTableJsons[contentIndex];
  return new ImplicitMetadataView({
    class: metadataTable.class,
    metadataTable: metadataTable,
    entityId: entityId,
    contentIndex: contentIndex,
    propertyTableJson: propertyTableJson,
  });
};

/**
 * @private
 */
ImplicitSubtree.prototype.isDestroyed = function () {
  return false;
};

/**
 * @private
 */
ImplicitSubtree.prototype.destroy = function () {
  if (defined(this._bufferLoader)) {
    ResourceCache.unload(this._bufferLoader);
  }

  return destroyObject(this);
};

export default ImplicitSubtree;
