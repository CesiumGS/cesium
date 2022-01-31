import arrayFill from "./arrayFill.js";
import arrayRemoveDuplicates from "./arrayRemoveDuplicates.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import CornerType from "./CornerType.js";
import CorridorGeometryLibrary from "./CorridorGeometryLibrary.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import GeometryOffsetAttribute from "./GeometryOffsetAttribute.js";
import IndexDatatype from "./IndexDatatype.js";
import CesiumMath from "./Math.js";
import PolygonPipeline from "./PolygonPipeline.js";
import PrimitiveType from "./PrimitiveType.js";

const cartesian1 = new Cartesian3();
const cartesian2 = new Cartesian3();
const cartesian3 = new Cartesian3();

function scaleToSurface(positions, ellipsoid) {
  for (let i = 0; i < positions.length; i++) {
    positions[i] = ellipsoid.scaleToGeodeticSurface(positions[i], positions[i]);
  }
  return positions;
}

function combine(computedPositions, cornerType) {
  const wallIndices = [];
  const positions = computedPositions.positions;
  const corners = computedPositions.corners;
  const endPositions = computedPositions.endPositions;
  const attributes = new GeometryAttributes();
  let corner;
  let leftCount = 0;
  let rightCount = 0;
  let i;
  let indicesLength = 0;
  let length;
  for (i = 0; i < positions.length; i += 2) {
    length = positions[i].length - 3;
    leftCount += length; //subtracting 3 to account for duplicate points at corners
    indicesLength += (length / 3) * 4;
    rightCount += positions[i + 1].length - 3;
  }
  leftCount += 3; //add back count for end positions
  rightCount += 3;
  for (i = 0; i < corners.length; i++) {
    corner = corners[i];
    const leftSide = corners[i].leftPositions;
    if (defined(leftSide)) {
      length = leftSide.length;
      leftCount += length;
      indicesLength += (length / 3) * 2;
    } else {
      length = corners[i].rightPositions.length;
      rightCount += length;
      indicesLength += (length / 3) * 2;
    }
  }

  const addEndPositions = defined(endPositions);
  let endPositionLength;
  if (addEndPositions) {
    endPositionLength = endPositions[0].length - 3;
    leftCount += endPositionLength;
    rightCount += endPositionLength;
    endPositionLength /= 3;
    indicesLength += endPositionLength * 4;
  }
  const size = leftCount + rightCount;
  const finalPositions = new Float64Array(size);
  let front = 0;
  let back = size - 1;
  let UL, LL, UR, LR;
  let rightPos, leftPos;
  const halfLength = endPositionLength / 2;

  const indices = IndexDatatype.createTypedArray(size / 3, indicesLength + 4);
  let index = 0;

  indices[index++] = front / 3;
  indices[index++] = (back - 2) / 3;
  if (addEndPositions) {
    // add rounded end
    wallIndices.push(front / 3);
    leftPos = cartesian1;
    rightPos = cartesian2;
    const firstEndPositions = endPositions[0];
    for (i = 0; i < halfLength; i++) {
      leftPos = Cartesian3.fromArray(
        firstEndPositions,
        (halfLength - 1 - i) * 3,
        leftPos
      );
      rightPos = Cartesian3.fromArray(
        firstEndPositions,
        (halfLength + i) * 3,
        rightPos
      );
      CorridorGeometryLibrary.addAttribute(finalPositions, rightPos, front);
      CorridorGeometryLibrary.addAttribute(
        finalPositions,
        leftPos,
        undefined,
        back
      );

      LL = front / 3;
      LR = LL + 1;
      UL = (back - 2) / 3;
      UR = UL - 1;
      indices[index++] = UL;
      indices[index++] = UR;
      indices[index++] = LL;
      indices[index++] = LR;

      front += 3;
      back -= 3;
    }
  }

  let posIndex = 0;
  let rightEdge = positions[posIndex++]; //add first two edges
  let leftEdge = positions[posIndex++];
  finalPositions.set(rightEdge, front);
  finalPositions.set(leftEdge, back - leftEdge.length + 1);

  length = leftEdge.length - 3;
  wallIndices.push(front / 3, (back - 2) / 3);
  for (i = 0; i < length; i += 3) {
    LL = front / 3;
    LR = LL + 1;
    UL = (back - 2) / 3;
    UR = UL - 1;
    indices[index++] = UL;
    indices[index++] = UR;
    indices[index++] = LL;
    indices[index++] = LR;

    front += 3;
    back -= 3;
  }

  for (i = 0; i < corners.length; i++) {
    let j;
    corner = corners[i];
    const l = corner.leftPositions;
    const r = corner.rightPositions;
    let start;
    let outsidePoint = cartesian3;
    if (defined(l)) {
      back -= 3;
      start = UR;
      wallIndices.push(LR);
      for (j = 0; j < l.length / 3; j++) {
        outsidePoint = Cartesian3.fromArray(l, j * 3, outsidePoint);
        indices[index++] = start - j - 1;
        indices[index++] = start - j;
        CorridorGeometryLibrary.addAttribute(
          finalPositions,
          outsidePoint,
          undefined,
          back
        );
        back -= 3;
      }
      wallIndices.push(start - Math.floor(l.length / 6));
      if (cornerType === CornerType.BEVELED) {
        wallIndices.push((back - 2) / 3 + 1);
      }
      front += 3;
    } else {
      front += 3;
      start = LR;
      wallIndices.push(UR);
      for (j = 0; j < r.length / 3; j++) {
        outsidePoint = Cartesian3.fromArray(r, j * 3, outsidePoint);
        indices[index++] = start + j;
        indices[index++] = start + j + 1;
        CorridorGeometryLibrary.addAttribute(
          finalPositions,
          outsidePoint,
          front
        );
        front += 3;
      }
      wallIndices.push(start + Math.floor(r.length / 6));
      if (cornerType === CornerType.BEVELED) {
        wallIndices.push(front / 3 - 1);
      }
      back -= 3;
    }
    rightEdge = positions[posIndex++];
    leftEdge = positions[posIndex++];
    rightEdge.splice(0, 3); //remove duplicate points added by corner
    leftEdge.splice(leftEdge.length - 3, 3);
    finalPositions.set(rightEdge, front);
    finalPositions.set(leftEdge, back - leftEdge.length + 1);
    length = leftEdge.length - 3;

    for (j = 0; j < leftEdge.length; j += 3) {
      LR = front / 3;
      LL = LR - 1;
      UR = (back - 2) / 3;
      UL = UR + 1;
      indices[index++] = UL;
      indices[index++] = UR;
      indices[index++] = LL;
      indices[index++] = LR;
      front += 3;
      back -= 3;
    }
    front -= 3;
    back += 3;
    wallIndices.push(front / 3, (back - 2) / 3);
  }

  if (addEndPositions) {
    // add rounded end
    front += 3;
    back -= 3;
    leftPos = cartesian1;
    rightPos = cartesian2;
    const lastEndPositions = endPositions[1];
    for (i = 0; i < halfLength; i++) {
      leftPos = Cartesian3.fromArray(
        lastEndPositions,
        (endPositionLength - i - 1) * 3,
        leftPos
      );
      rightPos = Cartesian3.fromArray(lastEndPositions, i * 3, rightPos);
      CorridorGeometryLibrary.addAttribute(
        finalPositions,
        leftPos,
        undefined,
        back
      );
      CorridorGeometryLibrary.addAttribute(finalPositions, rightPos, front);

      LR = front / 3;
      LL = LR - 1;
      UR = (back - 2) / 3;
      UL = UR + 1;
      indices[index++] = UL;
      indices[index++] = UR;
      indices[index++] = LL;
      indices[index++] = LR;

      front += 3;
      back -= 3;
    }

    wallIndices.push(front / 3);
  } else {
    wallIndices.push(front / 3, (back - 2) / 3);
  }
  indices[index++] = front / 3;
  indices[index++] = (back - 2) / 3;

  attributes.position = new GeometryAttribute({
    componentDatatype: ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: finalPositions,
  });

  return {
    attributes: attributes,
    indices: indices,
    wallIndices: wallIndices,
  };
}

function computePositionsExtruded(params) {
  const ellipsoid = params.ellipsoid;
  const computedPositions = CorridorGeometryLibrary.computePositions(params);
  const attr = combine(computedPositions, params.cornerType);
  const wallIndices = attr.wallIndices;
  const height = params.height;
  const extrudedHeight = params.extrudedHeight;
  const attributes = attr.attributes;
  const indices = attr.indices;
  let positions = attributes.position.values;
  let length = positions.length;
  let extrudedPositions = new Float64Array(length);
  extrudedPositions.set(positions);
  const newPositions = new Float64Array(length * 2);

  positions = PolygonPipeline.scaleToGeodeticHeight(
    positions,
    height,
    ellipsoid
  );
  extrudedPositions = PolygonPipeline.scaleToGeodeticHeight(
    extrudedPositions,
    extrudedHeight,
    ellipsoid
  );
  newPositions.set(positions);
  newPositions.set(extrudedPositions, length);
  attributes.position.values = newPositions;

  length /= 3;
  if (defined(params.offsetAttribute)) {
    let applyOffset = new Uint8Array(length * 2);
    if (params.offsetAttribute === GeometryOffsetAttribute.TOP) {
      applyOffset = arrayFill(applyOffset, 1, 0, length);
    } else {
      const applyOffsetValue =
        params.offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
      applyOffset = arrayFill(applyOffset, applyOffsetValue);
    }

    attributes.applyOffset = new GeometryAttribute({
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset,
    });
  }

  let i;
  const iLength = indices.length;
  const newIndices = IndexDatatype.createTypedArray(
    newPositions.length / 3,
    (iLength + wallIndices.length) * 2
  );
  newIndices.set(indices);
  let index = iLength;
  for (i = 0; i < iLength; i += 2) {
    // bottom indices
    const v0 = indices[i];
    const v1 = indices[i + 1];
    newIndices[index++] = v0 + length;
    newIndices[index++] = v1 + length;
  }

  let UL, LL;
  for (i = 0; i < wallIndices.length; i++) {
    //wall indices
    UL = wallIndices[i];
    LL = UL + length;
    newIndices[index++] = UL;
    newIndices[index++] = LL;
  }

  return {
    attributes: attributes,
    indices: newIndices,
  };
}

/**
 * A description of a corridor outline.
 *
 * @alias CorridorOutlineGeometry
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of positions that define the center of the corridor outline.
 * @param {Number} options.width The distance between the edges of the corridor outline.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
 * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
 * @param {Number} [options.height=0] The distance in meters between the positions and the ellipsoid surface.
 * @param {Number} [options.extrudedHeight] The distance in meters between the extruded face and the ellipsoid surface.
 * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
 *
 * @see CorridorOutlineGeometry.createGeometry
 *
 * @example
 * const corridor = new Cesium.CorridorOutlineGeometry({
 *   positions : Cesium.Cartesian3.fromDegreesArray([-72.0, 40.0, -70.0, 35.0]),
 *   width : 100000
 * });
 */
function CorridorOutlineGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const positions = options.positions;
  const width = options.width;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.positions", positions);
  Check.typeOf.number("options.width", width);
  //>>includeEnd('debug');

  const height = defaultValue(options.height, 0.0);
  const extrudedHeight = defaultValue(options.extrudedHeight, height);

  this._positions = positions;
  this._ellipsoid = Ellipsoid.clone(
    defaultValue(options.ellipsoid, Ellipsoid.WGS84)
  );
  this._width = width;
  this._height = Math.max(height, extrudedHeight);
  this._extrudedHeight = Math.min(height, extrudedHeight);
  this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
  this._granularity = defaultValue(
    options.granularity,
    CesiumMath.RADIANS_PER_DEGREE
  );
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createCorridorOutlineGeometry";

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  this.packedLength =
    1 + positions.length * Cartesian3.packedLength + Ellipsoid.packedLength + 6;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {CorridorOutlineGeometry} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
CorridorOutlineGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.typeOf.object("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const positions = value._positions;
  const length = positions.length;
  array[startingIndex++] = length;

  for (let i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    Cartesian3.pack(positions[i], array, startingIndex);
  }

  Ellipsoid.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid.packedLength;

  array[startingIndex++] = value._width;
  array[startingIndex++] = value._height;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._cornerType;
  array[startingIndex++] = value._granularity;
  array[startingIndex] = defaultValue(value._offsetAttribute, -1);

  return array;
};

const scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
const scratchOptions = {
  positions: undefined,
  ellipsoid: scratchEllipsoid,
  width: undefined,
  height: undefined,
  extrudedHeight: undefined,
  cornerType: undefined,
  granularity: undefined,
  offsetAttribute: undefined,
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {CorridorOutlineGeometry} [result] The object into which to store the result.
 * @returns {CorridorOutlineGeometry} The modified result parameter or a new CorridorOutlineGeometry instance if one was not provided.
 */
CorridorOutlineGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const length = array[startingIndex++];
  const positions = new Array(length);

  for (let i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    positions[i] = Cartesian3.unpack(array, startingIndex);
  }

  const ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid.packedLength;

  const width = array[startingIndex++];
  const height = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const cornerType = array[startingIndex++];
  const granularity = array[startingIndex++];
  const offsetAttribute = array[startingIndex];

  if (!defined(result)) {
    scratchOptions.positions = positions;
    scratchOptions.width = width;
    scratchOptions.height = height;
    scratchOptions.extrudedHeight = extrudedHeight;
    scratchOptions.cornerType = cornerType;
    scratchOptions.granularity = granularity;
    scratchOptions.offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;
    return new CorridorOutlineGeometry(scratchOptions);
  }

  result._positions = positions;
  result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
  result._width = width;
  result._height = height;
  result._extrudedHeight = extrudedHeight;
  result._cornerType = cornerType;
  result._granularity = granularity;
  result._offsetAttribute =
    offsetAttribute === -1 ? undefined : offsetAttribute;

  return result;
};

/**
 * Computes the geometric representation of a corridor, including its vertices, indices, and a bounding sphere.
 *
 * @param {CorridorOutlineGeometry} corridorOutlineGeometry A description of the corridor.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
CorridorOutlineGeometry.createGeometry = function (corridorOutlineGeometry) {
  let positions = corridorOutlineGeometry._positions;
  const width = corridorOutlineGeometry._width;
  const ellipsoid = corridorOutlineGeometry._ellipsoid;

  positions = scaleToSurface(positions, ellipsoid);
  const cleanPositions = arrayRemoveDuplicates(
    positions,
    Cartesian3.equalsEpsilon
  );

  if (cleanPositions.length < 2 || width <= 0) {
    return;
  }

  const height = corridorOutlineGeometry._height;
  const extrudedHeight = corridorOutlineGeometry._extrudedHeight;
  const extrude = !CesiumMath.equalsEpsilon(
    height,
    extrudedHeight,
    0,
    CesiumMath.EPSILON2
  );

  const params = {
    ellipsoid: ellipsoid,
    positions: cleanPositions,
    width: width,
    cornerType: corridorOutlineGeometry._cornerType,
    granularity: corridorOutlineGeometry._granularity,
    saveAttributes: false,
  };
  let attr;
  if (extrude) {
    params.height = height;
    params.extrudedHeight = extrudedHeight;
    params.offsetAttribute = corridorOutlineGeometry._offsetAttribute;
    attr = computePositionsExtruded(params);
  } else {
    const computedPositions = CorridorGeometryLibrary.computePositions(params);
    attr = combine(computedPositions, params.cornerType);
    attr.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(
      attr.attributes.position.values,
      height,
      ellipsoid
    );

    if (defined(corridorOutlineGeometry._offsetAttribute)) {
      const length = attr.attributes.position.values.length;
      const applyOffset = new Uint8Array(length / 3);
      const offsetValue =
        corridorOutlineGeometry._offsetAttribute ===
        GeometryOffsetAttribute.NONE
          ? 0
          : 1;
      arrayFill(applyOffset, offsetValue);
      attr.attributes.applyOffset = new GeometryAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset,
      });
    }
  }
  const attributes = attr.attributes;
  const boundingSphere = BoundingSphere.fromVertices(
    attributes.position.values,
    undefined,
    3
  );

  return new Geometry({
    attributes: attributes,
    indices: attr.indices,
    primitiveType: PrimitiveType.LINES,
    boundingSphere: boundingSphere,
    offsetAttribute: corridorOutlineGeometry._offsetAttribute,
  });
};
export default CorridorOutlineGeometry;
