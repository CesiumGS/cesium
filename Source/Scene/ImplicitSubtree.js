import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import ImplicitAvailabilityBitstream from "./ImplicitAvailabilityBitstream.js";

var subtreeMagic = 0x74627573;

/**
 * An object representing a single subtree in an implicit tileset
 * including availability and metadata.
 * @param {Uint8Array} subtreeView The contents of a subtree file in a Uint8Array.
 * @param {ImplicitTileset} implicitTileset the implicit tileset for retrieving information such as subdivision scheme
 */
export default function ImplicitSubtree(subtreeView, implicitTileset) {
  this._subtreeJson = undefined;
  this._bufferViews = undefined;
  this._jumpBuffer = undefined;
  this._tileAvailability = undefined;
  this._contentAvailability = undefined;
  this._childSubtreeAvailability = undefined;

  parseSubtreeBinary(this, subtreeView, implicitTileset);

  throw new Error("Not implemented yet!");
  //this._tileAvailability = new ImplicitAvailabilityBitstream(???);
  //this._contentAvailability = new ImplicitAvailabilityBitstream(???);
  //this._childSubtreeAvailability = new ImplicitAvailabilityBitstream(???);
}

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

// Not sure if these should go here or elsewhere ==============================

/**
 * Get the index of the first node at the given level within this subtree.
 * e.g. for a quadtree:
 * - Level 0 starts at index 0
 * - Level 1 starts at index 1
 * - Level 2 starts at index 5
 * @param {Number} level The 0-indexed level number relative to the root of the subtree
 * @return {Number} The first index at the desired level
 */
ImplicitSubtree.prototype.getStartOfLevel = function (level) {
  throw new Error("Not implemented yet!");
};

/**
 * Get the index of the child's parent within this subtree.
 * e.g. for a quadtree, node 3's parent is node 0.
 * @param {Number} childIndex the index of the child within the subtree
 * @return {Number|undefined} The index of the child's parent node or undefined if childIndex was 0
 */
ImplicitSubtree.prototype.getParentIndex = function (childIndex) {
  throw new Error("Not implemented yet!");
};

function parseSubtreeBinary(subtree, subtreeView, implicitTileset) {
  // Parse the header
  var littleEndian = true;
  var byteOffset = 0;
  var subtreeReader = new DataView(subtreeBuffer);
  var magic = subtreeReader.getUint32(byteOffset, littleEndian);
  byteOffset += 4;
  var version = subtreeReader.getUint32(byteOffset, littleEndian);
  byteOffset += 4;

  //>>includeStart('debug', pragmas.debug);
  if (magic !== subtreeMagic) {
    throw new DeveloperError('Subtree magic must be "subt" (0x74627573 in LE)');
  }

  if (version !== 1) {
    throw new DeveloperError("Only subtree version 1 is supported");
    s;
  }
  //>>includeEnd('debug');

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
  var subtreeBinary = subtreeView.subarray(byteOffset, binaryByteLength);

  var bufferViews = parseBufferViews(subtreeJson, subtreeBinary);
  subtree._bufferViews = bufferViews;

  subtree._tileAvailability = parseAvailability(
    subtreeJson.tileAvailability,
    bufferViews
  );
  subtree._contentAvailability = parseAvailability(
    subtreeJson.contentAvailability,
    bufferViews
  );
  subtree._childSubtreeAvailability = parseAvailability(
    subtreeJson.childSubtreeAvailability,
    bufferViews
  );
}

function parseBufferViews(subtreeJson, subtreeBinary) {
  var internalBufferIndex = undefined;
  for (var i = 0; i < subtreeJson.buffers.length; i++) {
    var bufferHeader = subtreeJson.buffers[i];
    if (defined(bufferHeader.uri)) {
      throw new DeveloperError("External buffers not yet supported");
    }

    //>>includeStart('debug', pragmas.debug);
    if (bufferHeader.byteLength !== subtreeBinary.length) {
      throw new DeveloperError(
        "buffer JSON does not match length of binary chunk"
      );
    }

    if (defined(internalBufferIndex)) {
      throw new DeveloperError(
        "Subtree files may only have a single internal buffer"
      );
    }
    //>>includeEnd('debug');
    internalBufferIndex = i;
  }

  var bufferViews = [];
  // TODO: How to handle external buffers?
  for (var i = 0; i < subtreeJson.bufferViews.length; i++) {
    var bufferViewHeader = subtreeJson.bufferViews[i];

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("bufferViewHeader.buffer", bufferViewHeader.buffer);
    Check.typeOf.number(
      "bufferViewHeader.byteOffset",
      bufferViewHeader.byteOffset
    );
    Check.typeOf.number(
      "bufferViewHeader.byteLength",
      bufferViewHeader.byteLength
    );
    //>>includeEnd('debug');

    if (bufferViewHeader.buffer !== internalBufferIndex) {
      throw new DeveloperError("external bufferViews not yet supported");
    }

    var start = bufferViewHeader.byteOffset;
    var end = start + bufferViewHeader.byteLength;

    var bufferView = subtreeBinary.subarray(start, end);
    bufferViews.push(bufferView);
  }
}

function parseAvailability(availabilityJson, bufferViews) {
  if (defined(availabilityJson.constant)) {
    //>>includeStart('debug', pragmas.debug);
    if (availabilityJson.constant < 0 || availabilityJson.constant > 1) {
      throw new DeveloperError("availabilityJson.constant must be 0 or 1");
    }
    //>>includeEnd('debug');

    return new ImplicitAvailabilityBitstream({
      constant: Boolean(availabilityJson.constant),
    });
  }

  if (defined(availabilityJson.bufferView)) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number(availabilityJson.bufferView);
    //>>includeEnd('debug');

    var bufferView = bufferViews[availabilityJson.bufferView];

    //>>includeStart('debug', pragmas.debug);
    if (!defined(bufferView)) {
      throw new DeveloperError("invalid bufferView index");
    }
    //>>includeEnd('debug');

    return new ImplicitAvailabilityBitstream({
      bitstream: bufferView,
    });
  }

  throw new DeveloperError(
    "Either availabilityJson.constant or availabilityJson.bufferView must be defined"
  );
}
