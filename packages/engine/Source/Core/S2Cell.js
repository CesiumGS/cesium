/* eslint-disable new-cap */
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import FeatureDetection from "./FeatureDetection.js";
import RuntimeError from "./RuntimeError.js";

/**
 * S2
 * --
 *
 * This implementation is based on the S2 C++ reference implementation: https://github.com/google/s2geometry
 *
 *
 * Overview:
 * ---------
 * The S2 library decomposes the unit sphere into a hierarchy of cells. A cell is a quadrilateral bounded by 4 geodesics.
 * The 6 root cells are obtained by projecting the six faces of a cube on a unit sphere. Each root cell follows a quadtree
 * subdivision scheme, i.e. each cell subdivides into 4 smaller cells that cover the same area as the parent cell. The S2 cell
 * hierarchy extends from level 0 (root cells) to level 30 (leaf cells). The root cells are rotated to enable a continuous Hilbert
 * curve to map all 6 faces of the cube.
 *
 *
 * Cell ID:
 * --------
 * Each cell in S2 can be uniquely identified using a 64-bit unsigned integer, its cell ID. The first 3 bits of the cell ID are the face bits, i.e.
 * they indicate which of the 6 faces of the cube a cell lies on. After the face bits are the position bits, i.e. they indicate the position
 * of the cell along the Hilbert curve. After the positions bits is the sentinel bit, which is always set to 1, and it indicates the level of the
 * cell. Again, the level can be between 0 and 30 in S2.
 *
 *   Note: In the illustration below, the face bits are marked with 'f', the position bits are marked with 'p', the zero bits are marked with '-'.
 *
 *   Cell ID (base 10): 3170534137668829184
 *   Cell ID (base 2) : 0010110000000000000000000000000000000000000000000000000000000000
 *
 *   001 0110000000000000000000000000000000000000000000000000000000000
 *   fff pps----------------------------------------------------------
 *
 * For the cell above, we can see that it lies on face 1 (01), with a Hilbert index of 1 (1).
 *
 *
 * Cell Subdivision:
 * ------------------
 * Cells in S2 subdivide recursively using quadtree subdivision. For each cell, you can get a child of index [0-3]. To compute the child at index i,
 * insert the base 2 representation of i to the right of the parent's position bits. Ensure that the sentinel bit is also shifted two places to the right.
 *
 *   Parent Cell ID (base 10) : 3170534137668829184
 *   Parent Cell ID (base 2)  : 0010110000000000000000000000000000000000000000000000000000000000
 *
 *   001 0110000000000000000000000000000000000000000000000000000000000
 *   fff pps----------------------------------------------------------
 *
 *   To get the 3rd child of the cell above, we insert the binary representation of 3 to the right of the parent's position bits:
 *
 *   Note: In the illustration below, the bits to be added are highlighted with '^'.
 *
 *   001 0111100000000000000000000000000000000000000000000000000000000
 *   fff pppps--------------------------------------------------------
 *         ^^
 *
 *   Child(3) Cell ID (base 10) : 3386706919782612992
 *   Child(3) Cell ID (base 2)  : 0010111100000000000000000000000000000000000000000000000000000000
 *
 * Cell Token:
 * -----------
 * To provide a more concise representation of the S2 cell ID, we can use their hexadecimal representation.
 *
 *   Cell ID (base 10): 3170534137668829184
 *   Cell ID (base 2) : 0010110000000000000000000000000000000000000000000000000000000000
 *
 *   We remove all trailing zero bits, until we reach the nybble (4 bits) that contains the sentinel bit.
 *
 *   Note: In the illustration below, the bits to be removed are highlighted with 'X'.
 *
 *   0010110000000000000000000000000000000000000000000000000000000000
 *   fffpps--XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 *
 *   We convert the remaining bits to their hexadecimal representation.
 *
 *   Base 2: 0010 1100
 *   Base 16: "2"  "c"
 *
 *   Cell Token: "2c"
 *
 * To compute the cell ID from the token, we simply add enough zeros to the right to make the ID span 64 bits.
 *
 * Coordinate Transforms:
 * ----------------------
 *
 * To go from a cell in S2 to a point on the ellipsoid, the following order of transforms is applied:
 *
 *   1. (Cell ID): S2 cell ID
 *   2. (Face, I, J): Leaf cell coordinates, where i and j are in range [0, 2^30 - 1]
 *   3. (Face, S, T): Cell space coordinates, where s and t are in range [0, 1].
 *   4. (Face, Si, Ti): Discrete cell space coordinates, where si and ti are in range [0, 2^31]
 *   5. (Face, U, V): Cube space coordinates, where u and v are in range [-1, 1]. We apply the non-linear quadratic transform here.
 *   6. (X, Y, Z): Direction vector, where vector may not be unit length. Can be normalized to obtain point on unit sphere
 *   7. (Latitude, Longitude): Direction vector, where latitude is in range [-90, 90] and longitude is in range [-180, 180]
 *
 * @ignore
 */

// The maximum level supported within an S2 cell ID. Each level is represented by two bits in the final cell ID
const S2_MAX_LEVEL = 30;

// The maximum index of a valid leaf cell plus one.  The range of valid leaf cell indices is [0..S2_LIMIT_IJ-1].
const S2_LIMIT_IJ = 1 << S2_MAX_LEVEL;

// The maximum value of an si- or ti-coordinate.  The range of valid (si,ti) values is [0..S2_MAX_SITI].  Use `>>>` to convert to unsigned.
const S2_MAX_SITI = (1 << (S2_MAX_LEVEL + 1)) >>> 0;

// The number of bits in a S2 cell ID used for specifying the position along the Hilbert curve
const S2_POSITION_BITS = 2 * S2_MAX_LEVEL + 1;

// The number of bits per I and J in the lookup tables
const S2_LOOKUP_BITS = 4;

// Lookup table for mapping 10 bits of IJ + orientation to 10 bits of Hilbert curve position + orientation.
const S2_LOOKUP_POSITIONS = [];

// Lookup table for mapping 10 bits of IJ + orientation to 10 bits of Hilbert curve position + orientation.
const S2_LOOKUP_IJ = [];

// Lookup table of two bits of IJ from two bits of curve position, based also on the current curve orientation from the swap and invert bits
const S2_POSITION_TO_IJ = [
  [0, 1, 3, 2], // 0: Normal order, no swap or invert
  [0, 2, 3, 1], // 1: Swap bit set, swap I and J bits
  [3, 2, 0, 1], // 2: Invert bit set, invert bits
  [3, 1, 0, 2], // 3: Swap and invert bits set
];

// Mask that specifies the swap orientation bit for the Hilbert curve
const S2_SWAP_MASK = 1;

// Mask that specifies the invert orientation bit for the Hilbert curve
const S2_INVERT_MASK = 2;

// Lookup for the orientation update mask of one of the four sub-cells within a higher level cell.
// This mask is XOR'ed with the current orientation to get the sub-cell orientation.
const S2_POSITION_TO_ORIENTATION_MASK = [
  S2_SWAP_MASK,
  0,
  0,
  S2_SWAP_MASK | S2_INVERT_MASK,
];

/**
 * Represents a cell in the S2 geometry library.
 *
 * @alias S2Cell
 * @constructor
 *
 * @param {bigint} [cellId] The 64-bit S2CellId.
 * @private
 */
function S2Cell(cellId) {
  if (!FeatureDetection.supportsBigInt()) {
    throw new RuntimeError("S2 required BigInt support");
  }
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cellId)) {
    throw new DeveloperError("cell ID is required.");
  }
  if (!S2Cell.isValidId(cellId)) {
    throw new DeveloperError("cell ID is invalid.");
  }
  //>>includeEnd('debug');

  this._cellId = cellId;
  this._level = S2Cell.getLevel(cellId);
}

/**
 * Creates a new S2Cell from a token. A token is a hexadecimal representation of the 64-bit S2CellId.
 *
 * @param {string} token The token for the S2 Cell.
 * @returns {S2Cell} Returns a new S2Cell.
 * @private
 */
S2Cell.fromToken = function (token) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("token", token);
  if (!S2Cell.isValidToken(token)) {
    throw new DeveloperError("token is invalid.");
  }
  //>>includeEnd('debug');

  return new S2Cell(S2Cell.getIdFromToken(token));
};

/**
 * Validates an S2 cell ID.
 *
 * @param {bigint} [cellId] The S2CellId.
 * @returns {boolean} Returns true if the cell ID is valid, returns false otherwise.
 * @private
 */
S2Cell.isValidId = function (cellId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("cellId", cellId);
  //>>includeEnd('debug');

  // Check if sentinel bit is missing.
  if (cellId <= 0) {
    return false;
  }

  // Check if face bits indicate a valid value, in range [0-5].
  // eslint-disable-next-line
  if (cellId >> BigInt(S2_POSITION_BITS) > 5) {
    return false;
  }

  // Check trailing 1 bit is in one of the even bit positions allowed for the 30 levels, using a bitmask.
  // eslint-disable-next-line no-undef
  const lowestSetBit = cellId & (~cellId + BigInt(1));
  // eslint-disable-next-line
  if (!(lowestSetBit & BigInt("0x1555555555555555"))) {
    return false;
  }

  return true;
};

/**
 * Validates an S2 cell token.
 *
 * @param {string} [token] The hexadecimal representation of an S2CellId.
 * @returns {boolean} Returns true if the token is valid, returns false otherwise.
 * @private
 */
S2Cell.isValidToken = function (token) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("token", token);
  //>>includeEnd('debug');

  if (!/^[0-9a-fA-F]{1,16}$/.test(token)) {
    return false;
  }

  return S2Cell.isValidId(S2Cell.getIdFromToken(token));
};

/**
 * Converts an S2 cell token to a 64-bit S2 cell ID.
 *
 * @param {string} [token] The hexadecimal representation of an S2CellId. Expected to be a valid S2 token.
 * @returns {bigint} Returns the S2 cell ID.
 * @private
 */
S2Cell.getIdFromToken = function (token) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("token", token);
  //>>includeEnd('debug');

  return BigInt("0x" + token + "0".repeat(16 - token.length)); // eslint-disable-line
};

/**
 * Converts a 64-bit S2 cell ID to an S2 cell token.
 *
 * @param {bigint} [cellId] The S2 cell ID.
 * @returns {string} Returns hexadecimal representation of an S2CellId.
 * @private
 */
S2Cell.getTokenFromId = function (cellId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("cellId", cellId);
  //>>includeEnd('debug');

  const trailingZeroHexChars = Math.floor(countTrailingZeroBits(cellId) / 4);
  const hexString = cellId.toString(16).replace(/0*$/, "");

  const zeroString = Array(17 - trailingZeroHexChars - hexString.length).join(
    "0"
  );
  return zeroString + hexString;
};

/**
 * Gets the level of the cell from the cell ID.
 *
 * @param {bigint} [cellId] The S2 cell ID.
 * @returns {number} Returns the level of the cell.
 * @private
 */
S2Cell.getLevel = function (cellId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("cellId", cellId);
  if (!S2Cell.isValidId(cellId)) {
    throw new DeveloperError();
  }
  //>>includeEnd('debug');

  let lsbPosition = 0;
  // eslint-disable-next-line
  while (cellId !== BigInt(0)) {
    // eslint-disable-next-line
    if (cellId & BigInt(1)) {
      break;
    }
    lsbPosition++;
    cellId = cellId >> BigInt(1); // eslint-disable-line
  }

  // We use (>> 1) because there are 2 bits per level.
  return S2_MAX_LEVEL - (lsbPosition >> 1);
};

/**
 * Gets the child cell of the cell at the given index.
 *
 * @param {number} index An integer index of the child.
 * @returns {S2Cell} The child of the S2Cell.
 * @private
 */
S2Cell.prototype.getChild = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  if (index < 0 || index > 3) {
    throw new DeveloperError("child index must be in the range [0-3].");
  }
  if (this._level === 30) {
    throw new DeveloperError("cannot get child of leaf cell.");
  }
  //>>includeEnd('debug');

  // Shift sentinel bit 2 positions to the right.
  // eslint-disable-next-line no-undef
  const newLsb = lsb(this._cellId) >> BigInt(2);
  // Insert child index before the sentinel bit.
  // eslint-disable-next-line no-undef
  const childCellId = this._cellId + BigInt(2 * index + 1 - 4) * newLsb;
  return new S2Cell(childCellId);
};

/**
 * Gets the parent cell of an S2Cell.
 *
 * @returns {S2Cell} Returns the parent of the S2Cell.
 * @private
 */
S2Cell.prototype.getParent = function () {
  //>>includeStart('debug', pragmas.debug);
  if (this._level === 0) {
    throw new DeveloperError("cannot get parent of root cell.");
  }
  //>>includeEnd('debug');
  // Shift the sentinel bit 2 positions to the left.
  // eslint-disable-next-line no-undef
  const newLsb = lsb(this._cellId) << BigInt(2);
  // Erase the left over bits to the right of the sentinel bit.
  // eslint-disable-next-line no-undef
  return new S2Cell((this._cellId & (~newLsb + BigInt(1))) | newLsb);
};

/**
 * Gets the parent cell at the given level.
 *
 * @returns {S2Cell} Returns the parent of the S2Cell.
 * @private
 */
S2Cell.prototype.getParentAtLevel = function (level) {
  //>>includeStart('debug', pragmas.debug);
  if (this._level === 0 || level < 0 || this._level < level) {
    throw new DeveloperError("cannot get parent at invalid level.");
  }
  //>>includeEnd('debug');
  const newLsb = lsbForLevel(level);
  return new S2Cell((this._cellId & -newLsb) | newLsb);
};

/**
 * Get center of the S2 cell.
 *
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
 * @returns {Cartesian3} The position of center of the S2 cell.
 * @private
 */
S2Cell.prototype.getCenter = function (ellipsoid) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  let center = getS2Center(this._cellId, this._level);
  // Normalize XYZ.
  center = Cartesian3.normalize(center, center);
  const cartographic = new Cartographic.fromCartesian(
    center,
    Ellipsoid.UNIT_SPHERE
  );
  // Interpret as geodetic coordinates on the ellipsoid.
  return Cartographic.toCartesian(cartographic, ellipsoid, new Cartesian3());
};

/**
 * Get vertex of the S2 cell. Vertices are indexed in CCW order.
 *
 * @param {number} index An integer index of the vertex. Must be in the range [0-3].
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
 * @returns {Cartesian3} The position of the vertex of the S2 cell.
 * @private
 */
S2Cell.prototype.getVertex = function (index, ellipsoid) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  if (index < 0 || index > 3) {
    throw new DeveloperError("vertex index must be in the range [0-3].");
  }
  //>>includeEnd('debug');

  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  let vertex = getS2Vertex(this._cellId, this._level, index);
  // Normalize XYZ.
  vertex = Cartesian3.normalize(vertex, vertex);
  const cartographic = new Cartographic.fromCartesian(
    vertex,
    Ellipsoid.UNIT_SPHERE
  );
  // Interpret as geodetic coordinates on the ellipsoid.
  return Cartographic.toCartesian(cartographic, ellipsoid, new Cartesian3());
};

/**
 * Creates an S2Cell from its face, position along the Hilbert curve for a given level.
 *
 * @param {number} face The root face of S2 this cell is on. Must be in the range [0-5].
 * @param {bigint} position The position along the Hilbert curve. Must be in the range [0-4**level).
 * @param {number} level The level of the S2 curve. Must be in the range [0-30].
 * @returns {S2Cell} A new S2Cell from the given parameters.
 * @private
 */
S2Cell.fromFacePositionLevel = function (face, position, level) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bigint("position", position);
  if (face < 0 || face > 5) {
    throw new DeveloperError("Invalid S2 Face (must be within 0-5)");
  }

  if (level < 0 || level > S2_MAX_LEVEL) {
    throw new DeveloperError("Invalid level (must be within 0-30)");
  }
  if (position < 0 || position >= Math.pow(4, level)) {
    throw new DeveloperError("Invalid Hilbert position for level");
  }
  //>>includeEnd('debug');

  const faceBitString =
    (face < 4 ? "0" : "") + (face < 2 ? "0" : "") + face.toString(2);
  const positionBitString = position.toString(2);
  const positionPrefixPadding = Array(
    2 * level - positionBitString.length + 1
  ).join("0");
  const positionSuffixPadding = Array(S2_POSITION_BITS - 2 * level).join("0");

  // eslint-disable-next-line no-undef
  const cellId = BigInt(
    `0b${faceBitString}${positionPrefixPadding}${positionBitString}1${
      // Adding the sentinel bit that always follows the position bits.
      positionSuffixPadding
    }`
  );
  return new S2Cell(cellId);
};

/**
 * @private
 */
function getS2Center(cellId, level) {
  const faceSiTi = convertCellIdToFaceSiTi(cellId, level);
  return convertFaceSiTitoXYZ(faceSiTi[0], faceSiTi[1], faceSiTi[2]);
}
/**
 * @private
 */
function getS2Vertex(cellId, level, index) {
  const faceIJ = convertCellIdToFaceIJ(cellId, level);
  const uv = convertIJLeveltoBoundUV([faceIJ[1], faceIJ[2]], level);
  // Handles CCW ordering of the vertices.
  const y = (index >> 1) & 1;
  return convertFaceUVtoXYZ(faceIJ[0], uv[0][y ^ (index & 1)], uv[1][y]);
}

// S2 Coordinate Conversions

/**
 * @private
 */
function convertCellIdToFaceSiTi(cellId, level) {
  const faceIJ = convertCellIdToFaceIJ(cellId);
  const face = faceIJ[0];
  const i = faceIJ[1];
  const j = faceIJ[2];

  // We're resolving the center when we do the coordinate transform here. For the leaf cells, we're adding half the cell size
  // (remember that this space has 31 levels - which allows us to pick center and edges of the leaf cells). For non leaf cells,
  // we get one of either two cells diagonal to the cell center. The correction is used to make sure we pick the leaf cell edges
  // that represent the parent cell center.
  const isLeaf = level === 30;
  const shouldCorrect =
    !isLeaf && (BigInt(i) ^ (cellId >> BigInt(2))) & BigInt(1); // eslint-disable-line
  const correction = isLeaf ? 1 : shouldCorrect ? 2 : 0;
  const si = (i << 1) + correction;
  const ti = (j << 1) + correction;
  return [face, si, ti];
}

/**
 * @private
 */
function convertCellIdToFaceIJ(cellId) {
  if (S2_LOOKUP_POSITIONS.length === 0) {
    generateLookupTable();
  }

  // eslint-disable-next-line no-undef
  const face = Number(cellId >> BigInt(S2_POSITION_BITS));
  let bits = face & S2_SWAP_MASK;
  const lookupMask = (1 << S2_LOOKUP_BITS) - 1;

  let i = 0;
  let j = 0;

  for (let k = 7; k >= 0; k--) {
    const numberOfBits =
      k === 7 ? S2_MAX_LEVEL - 7 * S2_LOOKUP_BITS : S2_LOOKUP_BITS;
    const extractMask = (1 << (2 * numberOfBits)) - 1;
    bits +=
      Number(
        (cellId >> BigInt(k * 2 * S2_LOOKUP_BITS + 1)) & BigInt(extractMask) // eslint-disable-line
      ) << 2;

    bits = S2_LOOKUP_IJ[bits];

    const offset = k * S2_LOOKUP_BITS;
    i += (bits >> (S2_LOOKUP_BITS + 2)) << offset;
    j += ((bits >> 2) & lookupMask) << offset;

    bits &= S2_SWAP_MASK | S2_INVERT_MASK;
  }

  return [face, i, j];
}

/**
 * @private
 */
function convertFaceSiTitoXYZ(face, si, ti) {
  const s = convertSiTitoST(si);
  const t = convertSiTitoST(ti);

  const u = convertSTtoUV(s);
  const v = convertSTtoUV(t);
  return convertFaceUVtoXYZ(face, u, v);
}

/**
 * @private
 */
function convertFaceUVtoXYZ(face, u, v) {
  switch (face) {
    case 0:
      return new Cartesian3(1, u, v);
    case 1:
      return new Cartesian3(-u, 1, v);
    case 2:
      return new Cartesian3(-u, -v, 1);
    case 3:
      return new Cartesian3(-1, -v, -u);
    case 4:
      return new Cartesian3(v, -1, -u);
    default:
      return new Cartesian3(v, u, -1);
  }
}

/**
 * S2 provides 3 methods for the non-linear transform: linear, quadratic and tangential.
 * This implementation uses the quadratic method because it provides a good balance of
 * accuracy and speed.
 *
 * For a more detailed comparison of these transform methods, see
 * {@link https://github.com/google/s2geometry/blob/0c4c460bdfe696da303641771f9def900b3e440f/src/s2/s2metrics.cc}
 * @private
 */
function convertSTtoUV(s) {
  if (s >= 0.5) {
    return (1 / 3) * (4 * s * s - 1);
  }
  return (1 / 3) * (1 - 4 * (1 - s) * (1 - s));
}

/**
 * @private
 */
function convertSiTitoST(si) {
  return (1.0 / S2_MAX_SITI) * si;
}

/**
 * @private
 */
function convertIJLeveltoBoundUV(ij, level) {
  const result = [[], []];
  const cellSize = getSizeIJ(level);
  for (let d = 0; d < 2; ++d) {
    const ijLow = ij[d] & -cellSize;
    const ijHigh = ijLow + cellSize;
    result[d][0] = convertSTtoUV(convertIJtoSTMinimum(ijLow));
    result[d][1] = convertSTtoUV(convertIJtoSTMinimum(ijHigh));
  }
  return result;
}

/**
 * @private
 */
function getSizeIJ(level) {
  return (1 << (S2_MAX_LEVEL - level)) >>> 0;
}

/**
 * @private
 */
function convertIJtoSTMinimum(i) {
  return (1.0 / S2_LIMIT_IJ) * i;
}

// Utility Functions

/**
 * This function generates 4 variations of a Hilbert curve of level 4, based on the S2_POSITION_TO_IJ table, for fast lookups of (i, j)
 * to position along Hilbert curve. The reference C++ implementation uses an iterative approach, however, this function is implemented
 * recursively.
 *
 * See {@link https://github.com/google/s2geometry/blob/c59d0ca01ae3976db7f8abdc83fcc871a3a95186/src/s2/s2cell_id.cc#L75-L109}
 * @private
 */
function generateLookupCell(
  level,
  i,
  j,
  originalOrientation,
  position,
  orientation
) {
  if (level === S2_LOOKUP_BITS) {
    const ij = (i << S2_LOOKUP_BITS) + j;
    S2_LOOKUP_POSITIONS[(ij << 2) + originalOrientation] =
      (position << 2) + orientation;
    S2_LOOKUP_IJ[(position << 2) + originalOrientation] =
      (ij << 2) + orientation;
  } else {
    level++;
    i <<= 1;
    j <<= 1;
    position <<= 2;
    const r = S2_POSITION_TO_IJ[orientation];
    generateLookupCell(
      level,
      i + (r[0] >> 1),
      j + (r[0] & 1),
      originalOrientation,
      position,
      orientation ^ S2_POSITION_TO_ORIENTATION_MASK[0]
    );
    generateLookupCell(
      level,
      i + (r[1] >> 1),
      j + (r[1] & 1),
      originalOrientation,
      position + 1,
      orientation ^ S2_POSITION_TO_ORIENTATION_MASK[1]
    );
    generateLookupCell(
      level,
      i + (r[2] >> 1),
      j + (r[2] & 1),
      originalOrientation,
      position + 2,
      orientation ^ S2_POSITION_TO_ORIENTATION_MASK[2]
    );
    generateLookupCell(
      level,
      i + (r[3] >> 1),
      j + (r[3] & 1),
      originalOrientation,
      position + 3,
      orientation ^ S2_POSITION_TO_ORIENTATION_MASK[3]
    );
  }
}

/**
 * @private
 */
function generateLookupTable() {
  generateLookupCell(0, 0, 0, 0, 0, 0);
  generateLookupCell(0, 0, 0, S2_SWAP_MASK, 0, S2_SWAP_MASK);
  generateLookupCell(0, 0, 0, S2_INVERT_MASK, 0, S2_INVERT_MASK);
  generateLookupCell(
    0,
    0,
    0,
    S2_SWAP_MASK | S2_INVERT_MASK,
    0,
    S2_SWAP_MASK | S2_INVERT_MASK
  );
}

/**
 * Return the lowest-numbered bit that is on for this cell id
 * @private
 */
function lsb(cellId) {
  return cellId & (~cellId + BigInt(1)); // eslint-disable-line
}

/**
 * Return the lowest-numbered bit that is on for cells at the given level.
 * @private
 */
function lsbForLevel(level) {
  return BigInt(1) << BigInt(2 * (S2_MAX_LEVEL - level)); // eslint-disable-line
}

// Lookup table for getting trailing zero bits.
// https://graphics.stanford.edu/~seander/bithacks.html
const Mod67BitPosition = [
  64,
  0,
  1,
  39,
  2,
  15,
  40,
  23,
  3,
  12,
  16,
  59,
  41,
  19,
  24,
  54,
  4,
  64,
  13,
  10,
  17,
  62,
  60,
  28,
  42,
  30,
  20,
  51,
  25,
  44,
  55,
  47,
  5,
  32,
  65,
  38,
  14,
  22,
  11,
  58,
  18,
  53,
  63,
  9,
  61,
  27,
  29,
  50,
  43,
  46,
  31,
  37,
  21,
  57,
  52,
  8,
  26,
  49,
  45,
  36,
  56,
  7,
  48,
  35,
  6,
  34,
  33,
  0,
];

/**
 * Return the number of trailing zeros in number.
 * @private
 */
function countTrailingZeroBits(x) {
  return Mod67BitPosition[(-x & x) % BigInt(67)]; // eslint-disable-line
}

export default S2Cell;
