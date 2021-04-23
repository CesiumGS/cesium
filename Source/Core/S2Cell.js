/* eslint-disable no-undef */
import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import FeatureDetection from "./FeatureDetection.js";
import RuntimeError from "./RuntimeError.js";

// The maximum level supported within an S2 cell ID. Each level is represented by two bits in the
// final cell ID
var S2MaxLevel = 30;

// The number of bits in a S2 cell ID used for specifying the base face
var S2FaceBits = 3;

// The number of bits in a S2 cell ID used for specifying the position along the Hilbert curve
var S2PositionBits = 2 * S2MaxLevel + 1;

// The number of bits per I and J in the lookup tables
var S2LookupBits = 4;

// Lookup table for mapping 10 bits of IJ + orientation to 10 bits of Hilbert curve position +
// orientation.
var S2LookupPositions;

// Lookup table for mapping 10 bits of IJ + orientation to 10 bits of Hilbert curve position +
// orientation.
var S2LookupIJ;

// Lookup table of two bits of IJ from two bits of curve position, based also on the current curve
// orientation from the swap and invert bits
var S2PosToIJ = [
  [0, 1, 3, 2], // 0: Normal order, no swap or invert
  [0, 2, 3, 1], // 1: Swap bit set, swap I and J bits
  [3, 2, 0, 1], // 2: Invert bit set, invert bits
  [3, 1, 0, 2], // 3: Swap and invert bits set
];

// Mask that specifies the swap orientation bit for the Hilbert curve
var S2SwapMask = 1;

// Mask that specifies the invert orientation bit for the Hilbert curve
var S2InvertMask = 2;

// Lookup for the orientation update mask of one of the four sub-cells within a higher level cell.
// This mask is XOR'ed with the current orientation to get the sub-cell orientation.
var S2PosToOrientationMask = [S2SwapMask, 0, 0, S2SwapMask | S2InvertMask];

/**
 * Represents a cell in the S2 geometry library.
 *
 * @alias S2Cell
 * @constructor
 *
 * @param {String} [token] The hexadecimal representation of an S2CellId. 0 must be represented using "X".
 */
function S2Cell(token) {
  if (!FeatureDetection.supportsBigInt()) {
    throw new RuntimeError("S2 required BigInt support");
  }
  //>>includeStart('debug', pragmas.debug);
  if (!defined(token)) {
    throw new DeveloperError("token is required.");
  }
  if (!S2Cell.isValidToken(token)) {
    throw new DeveloperError("token is invalid.");
  }
  //>>includeEnd('debug');

  /**
   * Gets or sets the cell token.
   */
  this._token = token;
}

/**
 * Validates an S2 cell ID.
 *
 * @param {BigInt} [cellId] The S2CellId.
 * @returns {Boolean} Returns true if the cell ID is valid, returns false otherwise.
 */
S2Cell.isValidId = function (cellId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("cellId", cellId);
  //>>includeEnd('debug');

  if (cellId <= 0) return false;

  // Check if face bits indicate a value <= 5.
  if (cellId >> BigInt(S2PositionBits) > 5) return false;

  // Check trailing 1 bit is in one of the even bit positions allowed for the 30 levels, using a bitmask.
  var lowestSetBit = cellId & (~cellId + BigInt(1));
  if (!(lowestSetBit & BigInt("0x1555555555555555"))) {
    return false;
  }

  return true;
};

/**
 * Validates an S2 cell token.
 *
 * @param {String} [token] The hexadecimal representation of an S2CellId. 0 must be represented using "X".
 * @returns {Boolean} Returns true if the token is valid, returns false otherwise.
 */
S2Cell.isValidToken = function (token) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("token", token);
  //>>includeEnd('debug');

  var regex = new RegExp("^[0-9a-fA-F]{1,16}$");
  if (!regex.test(token)) {
    return false;
  }

  return S2Cell.isValidId(S2Cell.getIdFromToken(token));
};

/**
 * Converts an S2 cell token to a 64-bit S2 cell ID.
 *
 * @param {String} [token] The hexadecimal representation of an S2CellId. 0 must be represented using "X". Expected to be a valid S2 token.
 * @returns {BigInt} Returns the S2 cell ID.
 */
S2Cell.getIdFromToken = function (token) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("token", token);
  //>>includeEnd('debug');

  // 'X' is a special case of the S2Token, representing the 0 cell.
  if (token === "X") {
    return BigInt(0);
  }

  try {
    return BigInt("0x" + token + "0".repeat(16 - token.length));
  } catch (e) {
    throw new RuntimeError(e);
  }
};

/**
 * Converts a 64-bit S2 cell ID to an S2 cell token.
 *
 * @param {BigInt} [cellId] The S2 cell ID.
 * @returns {BigInt} Returns hexadecimal representation of an S2CellId.
 */
S2Cell.getTokenFromId = function (cellId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("cellId", cellId);
  //>>includeEnd('debug');

  // 'X' is a special case of the S2Token, representing the 0 cell.
  if (cellId === BigInt(0)) {
    return "X";
  }

  try {
    return cellId.toString(16).replace(/0*$/, "");
  } catch (e) {
    throw new RuntimeError(e);
  }
};

/**
 * Gets the level of the cell from the cell ID.
 *
 * @param {BigInt} [cellId] The S2 cell ID.
 * @returns {number} Returns the level of the cell.
 */
S2Cell.prototype.getLevel = function (cellId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("cellId", cellId);
  if (!S2Cell.isValidId(cellId)) {
    throw new DeveloperError();
  }
  //>>includeEnd('debug');

  var lsbPosition = 0;
  while (cellId !== BigInt(0)) {
    if (cellId & BigInt(1)) {
      break;
    }
    lsbPosition++;
    cellId = cellId >> BigInt(1);
  }

  return lsbPosition;
};

/**
 * Gets the parent cell ID of an S2 cell ID.
 *
 * @param {BigInt} [cellId] The S2 cell ID.
 * @returns {BigInt} Returns the parent cell ID.
 */
S2Cell.getParentCellId = function (cellId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("cellId", cellId);
  //>>includeEnd('debug');
};

/**
 * Get center of the S2 cell.
 *
 * @param {S2Cell} [cell] The S2 cell to get a center of.
 * @returns {Cartesian} The center of the S2 cell.
 */
S2Cell.getCenter = function (cell) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cell)) {
    throw new DeveloperError("cell is required.");
  }
  //>>includeEnd('debug');
};

function generateLookupCell(
  level,
  i,
  j,
  originalOrientation,
  position,
  orientation
) {
  if (level === S2LookupBits) {
    var ij = (i << S2LookupBits) + j;
    S2LookupPositions[(ij << 2) + originalOrientation] =
      (position << 2) + orientation;
    S2LookupIJ[(position << 2) + originalOrientation] = (ij << 2) + orientation;
  } else {
    level++;
    i <<= 1;
    j <<= 1;
    position <<= 2;
    var r = S2PosToOrientationMask[orientation];
    generateLookupCell(
      level,
      i + (r[0] >> 1),
      j + (r[0] & 1),
      originalOrientation,
      position,
      orientation ^ S2PosToOrientationMask[0]
    );
    generateLookupCell(
      level,
      i + (r[1] >> 1),
      j + (r[1] & 1),
      originalOrientation,
      position + 1,
      orientation ^ S2PosToOrientationMask[1]
    );
    generateLookupCell(
      level,
      i + (r[2] >> 1),
      j + (r[2] & 1),
      originalOrientation,
      position + 2,
      orientation ^ S2PosToOrientationMask[2]
    );
    generateLookupCell(
      level,
      i + (r[3] >> 1),
      j + (r[3] & 1),
      originalOrientation,
      position + 3,
      orientation ^ S2PosToOrientationMask[3]
    );
  }
}

function generateLookupTable() {
  generateLookupCell(0, 0, 0, 0, 0, 0);
  generateLookupCell(0, 0, 0, S2SwapMask, 0, S2SwapMask);
  generateLookupCell(0, 0, 0, S2InvertMask, 0, S2InvertMask);
  generateLookupCell(
    0,
    0,
    0,
    S2SwapMask | S2InvertMask,
    0,
    S2SwapMask | S2InvertMask
  );
}

function toFaceIJOrientation(cellId, orientation) {
  if (S2LookupPositions.length === 0) {
    generateLookupTable();
  }

  var i,
    j = 0;
  var face = cellId >> kPosBits;
  var bits = face & S2SwapMask;

  for (var k = 7; k >= 0; k--) {
    var nBits = k === 7 ? S2MaxLevel - 7 * S2LookupBits : S2LookupBits;
    bits +=
      (cellId >> (k * 2 * S2LookupBits + 1)) & ((1 << (2 * nBits - 1)) << 2);
    bits += S2LookupIJ[bits];
    i += (bits >> (S2LookupBits + 2)) << (k * S2LookupBits);
    j += ((bits >> 2) & ((1 << S2LookupBits) - 1)) << (k * S2LookupBits);
    bits &= S2SwapMask | S2InvertMask;
  }

  // TODO: Handle orientation.

  return [i, j, face];
}

export default S2Cell;
