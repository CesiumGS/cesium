import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import DeveloperError from "../Core/DeveloperError.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import RuntimeError from "../Core/RuntimeError.js";
import hasExtension from "./hasExtension.js";
import ImplicitAvailabilityBitstream from "./ImplicitAvailabilityBitstream.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";
import ImplicitSubtreeMetadata from "./ImplicitSubtreeMetadata.js";
import MetadataTable from "./MetadataTable.js";
import ResourceCache from "./ResourceCache.js";
import when from "../ThirdParty/when.js";

/**
 * An object representing a single subtree in an implicit tileset
 * including availability.
 * <p>
 * Subtrees handle tile metadata from the <code>3DTILES_metadata</code> extension
 * </p>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata#implicit-tile-properties|Implicit Tile Properties in the 3DTILES_metadata specification}
 *
 * @alias ImplicitSubtree
 * @constructor
 *
 * @param {Resource} resource The resource for this subtree. This is used for fetching external buffers as needed.
 * @param {Object} [json] The JSON object for this subtree. Mutually exclusive with subtreeView.
 * @param {Uint8Array} [subtreeView] The contents of a subtree binary in a Uint8Array. Mutually exclusive with json.
 * @param {ImplicitTileset} implicitTileset The implicit tileset. This includes information about the size of subtrees
 * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the subtree's root tile.
 *
 * @exception {DeveloperError} One of json and subtreeView must be defined.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ImplicitSubtree(
  resource,
  json,
  subtreeView,
  implicitTileset,
  implicitCoordinates
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("resource", resource);
  if (defined(json) === defined(subtreeView)) {
    throw new DeveloperError("One of json and subtreeView must be defined.");
  }
  Check.typeOf.object("implicitTileset", implicitTileset);
  Check.typeOf.object("implicitCoordinates", implicitCoordinates);
  //>>includeEnd('debug');

  this._resource = resource;
  this._subtreeJson = undefined;
  this._bufferLoader = undefined;
  this._tileAvailability = undefined;
  this._implicitCoordinates = implicitCoordinates;
  this._contentAvailabilityBitstreams = [];
  this._childSubtreeAvailability = undefined;
  this._subtreeLevels = implicitTileset.subtreeLevels;
  this._subdivisionScheme = implicitTileset.subdivisionScheme;
  this._branchingFactor = implicitTileset.branchingFactor;
  this._readyPromise = when.defer();

  // properties for 3DTILES_metadata
  this._metadata = undefined;
  this._tileMetadataTable = undefined;
  this._tileMetadataExtension = undefined;
  // Map of availability bit index to entity ID
  this._jumpBuffer = undefined;

  initialize(this, json, subtreeView, implicitTileset);
}

Object.defineProperties(ImplicitSubtree.prototype, {
  /**
   * A promise that resolves once all necessary availability buffers
   * are loaded.
   *
   * @type {Promise}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * When the <code>3DTILES_metadata</code> extension is used, this property stores
   * an {@link ImplicitSubtreeMetadata} instance
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
   * When the <code>3DTILES_metadata</code> extension is used, this property stores
   * a {@link MetadataTable} instance for the tiles in the subtree.
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
   * When the <code>3DTILES_metadata</code> extension is used, this property
   * stores the JSON from the extension. This is used by {@link TileMetadata}
   * to get the extras and extensions for the tiles in the subtree.
   *
   * @type {Object}
   * @readonly
   * @private
   */
  tileMetadataExtension: {
    get: function () {
      return this._tileMetadataExtension;
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
 * @param {Number} index The index of the desired tile
 * @returns {Boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.tileIsAvailableAtIndex = function (index) {
  return this._tileAvailability.getBit(index);
};

/**
 * Check if a specific tile is available at an implicit tile coordinate
 *
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @returns {Boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.tileIsAvailableAtCoordinates = function (
  implicitCoordinates
) {
  const index = this.getTileIndex(implicitCoordinates);
  return this.tileIsAvailableAtIndex(index);
};

/**
 * Check if a specific tile's content is available at an index of the content availability bitstream
 *
 * @param {Number} index The index of the desired tile
 * @param {Number} [contentIndex=0] The index of the desired content when the <code>3DTILES_multiple_contents</code> extension is used.
 * @returns {Boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.contentIsAvailableAtIndex = function (
  index,
  contentIndex
) {
  contentIndex = defaultValue(contentIndex, 0);
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
 * @param {Number} [contentIndex=0] The index of the desired content when the <code>3DTILES_multiple_contents</code> extension is used.
 * @returns {Boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.contentIsAvailableAtCoordinates = function (
  implicitCoordinates,
  contentIndex
) {
  const index = this.getTileIndex(implicitCoordinates, contentIndex);
  return this.contentIsAvailableAtIndex(index);
};

/**
 * Check if a child subtree is available at an index of the child subtree availability bitstream
 *
 * @param {Number} index The index of the desired child subtree
 * @returns {Boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.childSubtreeIsAvailableAtIndex = function (index) {
  return this._childSubtreeAvailability.getBit(index);
};

/**
 * Check if a specific child subtree is available at an implicit tile coordinate
 *
 * @param {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a child subtree
 * @returns {Boolean} The value of the i-th bit
 * @private
 */
ImplicitSubtree.prototype.childSubtreeIsAvailableAtCoordinates = function (
  implicitCoordinates
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
 * @param {Number} level The 0-indexed level number relative to the root of the subtree
 * @returns {Number} The first index at the desired level
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
 * @param {Number} childIndex The morton index of the child tile relative to its parent
 * @returns {Number} The index of the child's parent node
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
 * external buffers that are used by the implicit tileset. When finished,
 * it resolves/rejects subtree.readyPromise.
 *
 * @param {ImplicitSubtree} subtree The subtree
 * @param {Object} [json] The JSON object for this subtree. If parsing from a binary subtree file, this will be undefined.
 * @param {Uint8Array} [subtreeView] The contents of the subtree binary
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to.
 * @private
 */
function initialize(subtree, json, subtreeView, implicitTileset) {
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

  let tileMetadataExtension;
  if (hasExtension(subtreeJson, "3DTILES_metadata")) {
    tileMetadataExtension = subtreeJson.extensions["3DTILES_metadata"];
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
  subtree._tileMetadataExtension = tileMetadataExtension;

  // if no contentAvailability is specified, no tile in the subtree has
  // content
  const defaultContentAvailability = {
    constant: 0,
  };

  // content availability is either in the subtree JSON or the multiple
  // contents extension. Either way, put the results in this new array
  // for consistent processing later
  subtreeJson.contentAvailabilityHeaders = [];
  if (hasExtension(subtreeJson, "3DTILES_multiple_contents")) {
    subtreeJson.contentAvailabilityHeaders =
      subtreeJson.extensions["3DTILES_multiple_contents"].contentAvailability;
  } else {
    subtreeJson.contentAvailabilityHeaders.push(
      defaultValue(subtreeJson.contentAvailability, defaultContentAvailability)
    );
  }

  const bufferHeaders = preprocessBuffers(subtreeJson.buffers);
  const bufferViewHeaders = preprocessBufferViews(
    subtreeJson.bufferViews,
    bufferHeaders
  );

  // Buffers and buffer views are inactive until explicitly marked active.
  // This way we can avoid fetching buffers that will not be used.
  markActiveBufferViews(subtreeJson, bufferViewHeaders);
  if (defined(tileMetadataExtension)) {
    markActiveMetadataBufferViews(tileMetadataExtension, bufferViewHeaders);
  }

  requestActiveBuffers(subtree, bufferHeaders, chunks.binary)
    .then(function (buffersU8) {
      const bufferViewsU8 = parseActiveBufferViews(
        bufferViewHeaders,
        buffersU8
      );
      parseAvailability(subtree, subtreeJson, implicitTileset, bufferViewsU8);

      if (defined(tileMetadataExtension)) {
        parseMetadataTable(subtree, implicitTileset, bufferViewsU8);
        makeJumpBuffer(subtree);
      }

      subtree._readyPromise.resolve(subtree);
    })
    .otherwise(function (error) {
      subtree._readyPromise.reject(error);
    });
}

/**
 * A helper object for storing the two parts of the subtree binary
 *
 * @typedef {Object} SubtreeChunks
 * @property {Object} json The json chunk of the subtree
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
    subtreeView.byteOffset
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
    jsonByteLength
  );
  byteOffset += jsonByteLength;
  const subtreeBinary = subtreeView.subarray(
    byteOffset,
    byteOffset + binaryByteLength
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
 * @typedef {Object} BufferHeader
 * @property {Boolean} isExternal True if this is an external buffer
 * @property {Boolean} isActive Whether this buffer is currently used.
 * @property {String} [uri] The URI of the buffer (external buffers only)
 * @property {Number} byteLength The byte length of the buffer, including any padding contained within.
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
 * @typedef {Object} BufferViewHeader
 * @property {BufferHeader} bufferHeader A reference to the header for the underlying buffer
 * @property {Boolean} isActive Whether this bufferView is currently used.
 * @property {Number} buffer The index of the underlying buffer.
 * @property {Number} byteOffset The start byte of the bufferView within the buffer.
 * @property {Number} byteLength The length of the bufferView. No padding is included in this length.
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
 * <li>The tile availability bitstream (if a bufferView is defined)</li>
 * <li>The content availability bitstream(s) (if a bufferView is defined)</li>
 * <li>The child subtree availability bitstream (if a bufferView is defined)</li>
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
  if (defined(tileAvailabilityHeader.bufferView)) {
    header = bufferViewHeaders[tileAvailabilityHeader.bufferView];
    header.isActive = true;
    header.bufferHeader.isActive = true;
  }

  const contentAvailabilityHeaders = subtreeJson.contentAvailabilityHeaders;
  for (let i = 0; i < contentAvailabilityHeaders.length; i++) {
    if (defined(contentAvailabilityHeaders[i].bufferView)) {
      header = bufferViewHeaders[contentAvailabilityHeaders[i].bufferView];
      header.isActive = true;
      header.bufferHeader.isActive = true;
    }
  }

  const childSubtreeAvailabilityHeader = subtreeJson.childSubtreeAvailability;
  if (defined(childSubtreeAvailabilityHeader.bufferView)) {
    header = bufferViewHeaders[childSubtreeAvailabilityHeader.bufferView];
    header.isActive = true;
    header.bufferHeader.isActive = true;
  }
}

/**
 * For <code>3DTILES_metadata</code>, look over the tile metadata buffers
 * <p>
 * This always loads all of the metadata immediately. Future iterations may
 * allow filtering this to avoid downloading unneeded buffers.
 * </p>
 * @param {Object} metadataExtension The 3DTILES_metadata extension
 * @param {BufferViewHeader[]} bufferViewHeaders The preprocessed buffer view headers
 * @private
 */
function markActiveMetadataBufferViews(metadataExtension, bufferViewHeaders) {
  const properties = metadataExtension.properties;
  let header;
  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      const metadataHeader = properties[key];
      header = bufferViewHeaders[metadataHeader.bufferView];
      header.isActive = true;
      header.bufferHeader.isActive = true;

      if (defined(metadataHeader.stringOffsetBufferView)) {
        header = bufferViewHeaders[metadataHeader.stringOffsetBufferView];
        header.isActive = true;
        header.bufferHeader.isActive = true;
      }

      if (defined(metadataHeader.arrayOffsetBufferView)) {
        header = bufferViewHeaders[metadataHeader.arrayOffsetBufferView];
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
 * @returns {Promise<Object>} A promise resolving to the dictionary of active buffers
 * @private
 */
function requestActiveBuffers(subtree, bufferHeaders, internalBuffer) {
  const promises = [];
  for (let i = 0; i < bufferHeaders.length; i++) {
    const bufferHeader = bufferHeaders[i];
    if (!bufferHeader.isActive) {
      promises.push(when.resolve(undefined));
    } else if (bufferHeader.isExternal) {
      const promise = requestExternalBuffer(subtree, bufferHeader);
      promises.push(promise);
    } else {
      promises.push(when.resolve(internalBuffer));
    }
  }
  return when.all(promises).then(function (bufferResults) {
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

function requestExternalBuffer(subtree, bufferHeader) {
  const baseResource = subtree._resource;
  const bufferResource = baseResource.getDerivedResource({
    url: bufferHeader.uri,
  });

  const bufferLoader = ResourceCache.loadExternalBuffer({
    resource: bufferResource,
  });
  subtree._bufferLoader = bufferLoader;

  return bufferLoader.promise.then(function (bufferLoader) {
    return bufferLoader.typedArray;
  });
}

/**
 * Go through the list of buffer views, and if they are marked as active,
 * extract a subarray from one of the active buffers.
 *
 * @param {BufferViewHeader[]} bufferViewHeaders
 * @param {Object} buffersU8 A dictionary of buffer index to a Uint8Array of its contents.
 * @returns {Object} A dictionary of buffer view index to a Uint8Array of its contents.
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
 * @param {Object} subtreeJson The subtree JSON
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to
 * @param {Object} bufferViewsU8 A dictionary of buffer view index to a Uint8Array of its contents.
 * @private
 */
function parseAvailability(
  subtree,
  subtreeJson,
  implicitTileset,
  bufferViewsU8
) {
  const branchingFactor = implicitTileset.branchingFactor;
  const subtreeLevels = implicitTileset.subtreeLevels;
  const tileAvailabilityBits =
    (Math.pow(branchingFactor, subtreeLevels) - 1) / (branchingFactor - 1);
  const childSubtreeBits = Math.pow(branchingFactor, subtreeLevels);

  // availableCount is only needed for the metadata jump buffer, which
  // corresponds to the tile availability bitstream.
  const computeAvailableCountEnabled = hasExtension(
    subtreeJson,
    "3DTILES_metadata"
  );
  subtree._tileAvailability = parseAvailabilityBitstream(
    subtreeJson.tileAvailability,
    bufferViewsU8,
    tileAvailabilityBits,
    computeAvailableCountEnabled
  );

  for (let i = 0; i < subtreeJson.contentAvailabilityHeaders.length; i++) {
    const bitstream = parseAvailabilityBitstream(
      subtreeJson.contentAvailabilityHeaders[i],
      bufferViewsU8,
      // content availability has the same length as tile availability.
      tileAvailabilityBits
    );
    subtree._contentAvailabilityBitstreams.push(bitstream);
  }

  subtree._childSubtreeAvailability = parseAvailabilityBitstream(
    subtreeJson.childSubtreeAvailability,
    bufferViewsU8,
    childSubtreeBits
  );
}

/**
 * Given the JSON describing an availability bitstream, turn it into an
 * in-memory representation using an {@link ImplicitAvailabilityBitstream}
 * object. This handles both constants and bitstreams from a bufferView.
 *
 * @param {Object} availabilityJson A JSON object representing the availability
 * @param {Object} bufferViewsU8 A dictionary of bufferView index to its Uint8Array contents.
 * @param {Number} lengthBits The length of the availability bitstream in bits
 * @param {Boolean} [computeAvailableCountEnabled] If true and availabilityJson.availableCount is undefined, the availableCount will be computed.
 * @returns {ImplicitAvailabilityBitstream} The parsed bitstream object
 * @private
 */
function parseAvailabilityBitstream(
  availabilityJson,
  bufferViewsU8,
  lengthBits,
  computeAvailableCountEnabled
) {
  if (defined(availabilityJson.constant)) {
    return new ImplicitAvailabilityBitstream({
      constant: Boolean(availabilityJson.constant),
      lengthBits: lengthBits,
      availableCount: availabilityJson.availableCount,
    });
  }

  const bufferView = bufferViewsU8[availabilityJson.bufferView];

  return new ImplicitAvailabilityBitstream({
    bitstream: bufferView,
    lengthBits: lengthBits,
    availableCount: availabilityJson.availableCount,
    computeAvailableCountEnabled: computeAvailableCountEnabled,
  });
}

/**
 * Parse the 3DTILES_metadata table, storing a {@link MetadataTable} in the
 * subtree.
 *
 * @param {ImplicitSubtree} subtree The subtree
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to.
 * @param {Object} bufferViewsU8 A dictionary of bufferView index to its Uint8Array contents.
 * @private
 */
function parseMetadataTable(subtree, implicitTileset, bufferViewsU8) {
  const metadataExtension = subtree._tileMetadataExtension;
  const tileCount = subtree._tileAvailability.availableCount;
  const metadataClassName = metadataExtension.class;
  const metadataSchema = implicitTileset.metadataSchema;
  const metadataClass = metadataSchema.classes[metadataClassName];

  subtree._tileMetadataTable = new MetadataTable({
    class: metadataClass,
    count: tileCount,
    properties: metadataExtension.properties,
    bufferViews: bufferViewsU8,
  });
}

/**
 * Make a jump buffer, i.e. a map of tile bit index to the metadata entity ID.
 * This is stored in the subtree.
 * <p>
 * For unavailable tiles, the jump buffer entry will be uninitialized. Use
 * the tile availability to determine whether a jump buffer value is valid.
 * </p>
 *
 * @param {ImplicitSubtree} subtree The subtree
 * @private
 */
function makeJumpBuffer(subtree) {
  const tileAvailability = subtree._tileAvailability;
  let entityId = 0;
  const bufferLength = tileAvailability.lengthBits;
  const availableCount = tileAvailability.availableCount;

  let jumpBuffer;
  if (availableCount < 256) {
    jumpBuffer = new Uint8Array(bufferLength);
  } else if (availableCount < 65536) {
    jumpBuffer = new Uint16Array(bufferLength);
  } else {
    jumpBuffer = new Uint32Array(bufferLength);
  }

  for (let i = 0; i < tileAvailability.lengthBits; i++) {
    if (tileAvailability.getBit(i)) {
      jumpBuffer[i] = entityId;
      entityId++;
    }
  }
  subtree._jumpBuffer = jumpBuffer;
}

/**
 * Given the implicit tiling coordinates for a tile, get the index within the
 * subtree's tile availability bitstream.
 * @property {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @return {Number} The tile's index within the subtree.
 * @private
 */
ImplicitSubtree.prototype.getTileIndex = function (implicitCoordinates) {
  const localLevel =
    implicitCoordinates.level - this._implicitCoordinates.level;
  if (localLevel < 0 || this._subtreeLevels <= localLevel) {
    throw new RuntimeError("level is out of bounds for this subtree");
  }

  const subtreeCoordinates = implicitCoordinates.getSubtreeCoordinates();
  const offsetCoordinates = subtreeCoordinates.getOffsetCoordinates(
    implicitCoordinates
  );
  const index = offsetCoordinates.tileIndex;
  return index;
};

/**
 * Given the implicit tiling coordinates for a child subtree, get the index within the
 * subtree's child subtree availability bitstream.
 * @property {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a child subtree
 * @return {Number} The child subtree's index within the subtree's child subtree availability bitstream.
 * @private
 */
ImplicitSubtree.prototype.getChildSubtreeIndex = function (
  implicitCoordinates
) {
  const localLevel =
    implicitCoordinates.level - this._implicitCoordinates.level;
  if (localLevel !== this._implicitCoordinates.subtreeLevels) {
    throw new RuntimeError("level is out of bounds for this subtree");
  }

  // Call getParentSubtreeCoordinates instead of getSubtreeCoordinates because the
  // child subtree is by definition the root of its own subtree, so we need to find
  // the parent subtree.
  const parentSubtreeCoordinates = implicitCoordinates.getParentSubtreeCoordinates();
  const offsetCoordinates = parentSubtreeCoordinates.getOffsetCoordinates(
    implicitCoordinates
  );
  const index = offsetCoordinates.mortonIndex;
  return index;
};

/**
 * Get the entity ID for a tile within this subtree.
 * @property {ImplicitTileCoordinates} implicitCoordinates The global coordinates of a tile
 * @return {Number} The entity ID for this tile for accessing tile metadata, or <code>undefined</code> if not applicable.
 *
 * @private
 */
ImplicitSubtree.prototype.getEntityId = function (implicitCoordinates) {
  if (!defined(this._tileMetadataTable)) {
    return undefined;
  }

  const tileIndex = this.getTileIndex(implicitCoordinates);
  if (this._tileAvailability.getBit(tileIndex)) {
    return this._jumpBuffer[tileIndex];
  }

  return undefined;
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
