import defined from "../Core/defined.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import when from "../ThirdParty/when.js";
import ImplicitAvailabilityBitstream from "./ImplicitAvailabilityBitstream.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";

/**
 * An object representing a single subtree in an implicit tileset
 * including availability and metadata.
 * @private
 * @param {Resource} resource The resource for this subtree. This is used for fetching external buffers as needed.
 * @param {Uint8Array} subtreeView The contents of a subtree binary in a Uint8Array.
 * @param {implicitTIleset} implicitTileset The implicit tileset. This includes information about the size of subtrees
 */
export default function ImplicitSubtree(
  resource,
  subtreeView,
  implicitTileset
) {
  this._resource = undefined;
  this._subtreeJson = undefined;
  this._bufferViews = undefined;
  this._tileAvailability = undefined;
  this._contentAvailability = undefined;
  this._childSubtreeAvailability = undefined;
  this._subdivisionScheme = implicitTileset.subdivisionScheme;
  this._branchingFactor = implicitTileset.branchingFactor;
  this._readyPromise = when.defer();

  initialize(this, subtreeView, implicitTileset);
}

Object.defineProperties(ImplicitSubtree.prototype, {
  /**
   * A promise that resolves once all necessary availability buffers
   * are loaded.
   * @type {Promise}
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

/**
 * Get the i-th bit of the subtree's `tileAvailability` bitstream.
 * @param {Number} index the index of the desired tile
 * @return {Boolean} the value of the i-th bit
 */
ImplicitSubtree.prototype.getTileAvailabilityBit = function (index) {
  return this._tileAvailability.getBit(index);
};

/**
 * Get the i-th bit of the subtree's `contentAvailability` bitstream.
 * @param {Number} index the index of the desired tile
 * @return {Boolean} the value of the i-th bit
 */
ImplicitSubtree.prototype.getContentAvailabilityBit = function (index) {
  return this._contentAvailability.getBit(index);
};

/**
 * Get the i-th bit of the subtree's `childSubtreeAvailability` bitstream.
 * @param {Number} index the index of the desired child subtree
 * @return {Boolean} the value of the i-th bit
 */
ImplicitSubtree.prototype.getChildSubtreeAvailabilityBit = function (index) {
  return this._childSubtreeAvailability.getBit(index);
};

/**
 * Get the index of the first node at the given level within this subtree.
 * e.g. for a quadtree:
 * - Level 0 starts at index 0
 * - Level 1 starts at index 1
 * - Level 2 starts at index 5
 * @param {Number} level The 0-indexed level number relative to the root of the subtree
 * @return {Number} The first index at the desired level
 */
ImplicitSubtree.prototype.getLevelOffset = function (level) {
  var branchingFactor = this._branchingFactor;
  return (Math.pow(branchingFactor, level) - 1) / (branchingFactor - 1);
};

/**
 * Get the morton index of a tile's parent. This is equivalent to
 * chopping off the last 2 (quadtree) or 3 (octree) bits of the morton
 * index.
 * @param {Number} childIndex the index of the child within the subtree
 * @return {Number} The index of the child's parent node
 */
ImplicitSubtree.prototype.getParentMortonIndex = function (mortonIndex) {
  var bitsPerLevel = 2;
  if (this._subdivisionScheme === ImplicitSubdivisionScheme.OCTREE) {
    bitsPerLevel = 3;
  }

  return mortonIndex >> bitsPerLevel;
};

/**
 * Parse all relevant information out of the subtree. This fetches any
 * external buffers that are used by the implicit tileset. When finishes,
 * it resolves/rejects subtree.readyPromise.
 *
 * @private
 * @param {ImplicitSubtree} subtree The subtree
 * @param {Uint8Array} subtreeView The contents of the subtree binary
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree belongs to.
 */
function initialize(subtree, subtreeView, implicitTileset) {
  var chunks = parseSubtreeChunks(subtreeView);
  var subtreeJson = chunks.json;

  var bufferHeaders = preprocessBuffers(subtreeJson.buffers);
  var bufferViewHeaders = preprocessBufferViews(
    subtreeJson.bufferViews,
    bufferHeaders
  );

  // Buffers and buffer views are inactive until explicitly marked active.
  // This way we can avoid fetching buffers that will not be used.
  markActiveBufferViews(subtreeJson, bufferViewHeaders);

  requestActiveBuffers(bufferHeaders, chunks.binary)
    .then(function (bufferViewsU8) {
      var bufferViewsU8 = parseActiveBufferViews(
        bufferViewHeaders,
        bufferViewsU8
      );
      parseAvailability(subtree, subtreeJson, implicitTileset, bufferViewsU8);
      subtree._readyPromise.resolve(subtree);
    })
    .otherwise(function (error) {
      subtree._readyPromise.reject(error);
    });
}

/**
 * A helper object for storing the two parts of the subtree binary
 * @private
 * @typedef {Object} SubtreeChunks
 * @property {Object} json The json chunk of the subtree
 * @property {Uint8Array} binary The binary chunk of the subtree. This represents the internal buffer.
 */

/**
 * Given the binary contents of a subtree, split into JSON and binary chunks
 * @private
 * @param {Uint8Array} subtreeView The subtree binary
 * @return {SubtreeChunks} An object containing the JSON and binary chunks.
 */
function parseSubtreeChunks(subtreeView) {
  // Parse the header
  var littleEndian = true;
  var byteOffset = 0;
  var subtreeReader = new DataView(subtreeView.buffer);
  // Skip to the chunk lengths
  var byteOffset = 8;

  // Read the bottom 32 bits of the 64-bit byte length. This is ok for now because:
  // 1) not all browsers have native 64-bit operations
  // 2) the data is well under 4GB
  var jsonByteLength = subtreeReader.getUint32(byteOffset, littleEndian);
  byteOffset += 8;
  var binaryByteLength = subtreeReader.getUint32(byteOffset, littleEndian);
  byteOffset += 8;

  var subtreeJson = JSON.parse(
    getStringFromTypedArray(subtreeView, byteOffset, jsonByteLength)
  );
  byteOffset += jsonByteLength;
  var subtreeBinary = subtreeView.subarray(
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
 * @private
 * @typedef {Object} BufferHeader
 * @property {Boolean} isExternal True if this is an external buffer
 * @property {Boolean} isActive Whether this buffer is currently used.
 * @property {String} [uri] The URI of the buffer (external buffers only)
 * @property {Number} byteLength The byte length of the buffer, including any padding contained within.
 */

/**
 * Iterate over the list of buffers from the subtree JSON and add the
 * isExternal and isActive fields for easier parsing later. This modifies
 * the objects in place.
 *
 * @private
 * @param {Object[]} bufferHeaders The JSON from subtreeJson.buffers.
 * @return {BufferHeader[]} The same array of headers with additional fields.
 */
function preprocessBuffers(bufferHeaders) {
  for (var i = 0; i < bufferHeaders.length; i++) {
    var bufferHeader = bufferHeaders[i];
    bufferHeader.isExternal = defined(bufferHeader.uri);
    bufferHeader.isActive = false;
  }

  return bufferHeaders;
}

/**
 * A buffer header is the JSON header from the subtree JSON chunk plus
 * the isActive flag and a reference to the header for the underlying buffer
 * @private
 * @typedef {Object} BufferViewHeader
 * @property {BufferHeader} bufferHeader A reference to the header for the underlying buffer
 * @property {Boolean} isActive Whether this bufferView is currently used.
 * @property {Number} buffer The index of the underlying buffer.
 * @property {Number} byteOffset The start byte of the bufferView within the buffer.
 * @property {Number} byteLength The length of the bufferView. No padding is included in this length.
 */

/**
 * Iterate the list of buffer views from the subtree JSON and add the
 * isActive flag. Also save a reference to the bufferHeader
 * @private
 * @param {Object[]} bufferViewHeaders The JSON from subtree.bufferViews
 * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers
 * @return {BufferViewHeader[]} The same array of bufferView headers with additional fields
 */
function preprocessBufferViews(bufferViewHeaders, bufferHeaders) {
  for (var i = 0; i < bufferViewHeaders.length; i++) {
    var bufferViewHeader = bufferViewHeaders[i];
    var bufferHeader = bufferHeaders[bufferViewHeader.buffer];
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
 * <li>The content availability bitstream (if a bufferView is defined)</li>
 * <li>The child subtree availability bitstream (if a bufferView is defined)</li>
 * </ul>
 *
 * This function modifies the buffer view headers' isActive flags in place.
 * @private
 * @param {Object[]} subtreeJson The JSON chunk from the subtree
 * @param {BufferViewHeader[]} bufferViewHeaders The preprocessed buffer view headers
 */
function markActiveBufferViews(subtreeJson, bufferViewHeaders) {
  var header;
  var tileAvailabilityHeader = subtreeJson.tileAvailability;
  if (defined(tileAvailabilityHeader.bufferView)) {
    header = bufferViewHeaders[tileAvailabilityHeader.bufferView];
    header.isActive = true;
    header.bufferHeader.isActive = true;
  }

  var contentAvailabilityHeader = subtreeJson.contentAvailability;
  if (defined(contentAvailabilityHeader.bufferView)) {
    header = bufferViewHeaders[contentAvailabilityHeader.bufferView];
    header.isActive = true;
    header.bufferHeader.isActive = true;
  }

  var childSubtreeAvailabilityHeader = subtreeJson.childSubtreeAvailability;
  if (defined(childSubtreeAvailabilityHeader.bufferView)) {
    header = bufferViewHeaders[childSubtreeAvailabilityHeader.bufferView];
    header.isActive = true;
    header.bufferHeader.isActive = true;
  }
}

/**
 * Go through the list of buffers and gather all the active ones into a
 * a dictionary. Since external buffers are allowed, this sometimes involves
 * fetching separate binary files. Consequently, this method returns a promise.
 *
 * The results are put into a dictionary object. The keys are indices of
 * buffers, and the values are Uint8Arrays of the contents. Only buffers
 * marked with the isActive flag are fetched.
 *
 * The internal buffer (the subtree's binary chunk) is also stored in this
 * dictionary if it is marked active.
 * @private
 * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers
 * @param {Uint8Array} internalBuffer The binary chunk of the JSON file
 * @return {Promise<Object>} A promise resolving to the dictionary of active
 * buffers
 */
function requestActiveBuffers(bufferHeaders, internalBuffer) {
  var promises = [];
  var buffersU8 = {};
  for (var i = 0; i < bufferHeaders.length; i++) {
    var bufferHeader = bufferHeaders[i];
    if (!bufferHeader.isActive) {
      continue;
    }

    if (bufferHeader.isExternal) {
      var resource = this._resource.getDerivedResource({
        url: bufferHeader.uri,
      });
      var promise = resource.fetchArrayBuffer().then(function (arrayBuffer) {
        buffers[i] = new Uint8Array(arrayBuffer);
      });
      promises.push(promise);
    } else {
      buffersU8[i] = internalBuffer;
    }
  }
  return when.all(promises).then(function () {
    return buffersU8;
  });
}

/**
 * Go through the list of buffer views, and if they are marked as active,
 * extract a subarray from one of the active buffers.
 * @param {BufferViewHeader[]} bufferViewHeaders
 * @param {Object} buffersU8 A dictionary of buffer index to a Uint8Array
 * of its contents.
 * @return {Object} A dictionary of buffer view index to a Uint8Array of its
 * contents.
 */
function parseActiveBufferViews(bufferViewHeaders, buffersU8) {
  var bufferViewsU8 = {};
  for (var i = 0; i < bufferViewHeaders.length; i++) {
    var bufferViewHeader = bufferViewHeaders[i];

    if (!bufferViewHeader.isActive) {
      continue;
    }

    var start = bufferViewHeader.byteOffset;
    var end = start + bufferViewHeader.byteLength;
    var buffer = buffersU8[bufferViewHeader.buffer];
    var bufferView = buffer.subarray(start, end);
    bufferViewsU8[i] = bufferView;
  }
  return bufferViewsU8;
}

/**
 * Parse the three availability bitstreams and store them in the subtree
 * @private
 * @param {ImplicitSubtree} subtree The subtree to modify
 * @param {Object} subtreeJson The subtree JSON
 * @param {ImplicitTileset} implicitTileset The implicit tileset this subtree
 * belongs to
 * @param {Object} bufferViewsU8 A dictionary of buffer view index to a
 * Uint8Array of its contents.
 */
function parseAvailability(
  subtree,
  subtreeJson,
  implicitTileset,
  bufferViewsU8
) {
  var branchingFactor = implicitTileset.branchingFactor;
  var subtreeLevels = implicitTileset.subtreeLevels;
  var tileAvailabilityBits =
    (Math.pow(branchingFactor, subtreeLevels) - 1) / (branchingFactor - 1);
  var childSubtreeBits = Math.pow(branchingFactor, subtreeLevels);

  subtree._tileAvailability = parseAvailabilityBitstream(
    subtreeJson.tileAvailability,
    bufferViewsU8,
    tileAvailabilityBits
  );
  subtree._contentAvailability = parseAvailabilityBitstream(
    subtreeJson.contentAvailability,
    bufferViewsU8,
    // content availability has the same length as tile availability.
    tileAvailabilityBits
  );
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
 * @private
 * @param {Object} availabilityJson A JSON object representing the availability
 * @param {Object} bufferViewsU8 A dictionary of bufferView index to its
 * Uint8Array contents.
 * @param {Number} lengthBits The length of the availability bitstream in bits
 * @return {ImplicitAvailabilityBitstream} The parsed bitstream object
 */
function parseAvailabilityBitstream(
  availabilityJson,
  bufferViewsU8,
  lengthBits
) {
  if (defined(availabilityJson.constant)) {
    return new ImplicitAvailabilityBitstream({
      constant: Boolean(availabilityJson.constant),
      lengthBits: lengthBits,
    });
  }

  if (defined(availabilityJson.bufferView)) {
    var bufferView = bufferViewsU8[availabilityJson.bufferView];

    return new ImplicitAvailabilityBitstream({
      bitstream: bufferView,
      lengthBits: lengthBits,
    });
  }
}
