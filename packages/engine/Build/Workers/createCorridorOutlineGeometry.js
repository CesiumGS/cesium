/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  CorridorGeometryLibrary_default
} from "./chunk-TFO7BLQ3.js";
import {
  CornerType_default
} from "./chunk-OJGFPQQY.js";
import "./chunk-H6UV4PJF.js";
import "./chunk-DAY2RGWJ.js";
import {
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import "./chunk-LATQ4URD.js";
import "./chunk-IYKFKVQR.js";
import {
  PolygonPipeline_default
} from "./chunk-3DTYZXHQ.js";
import {
  arrayRemoveDuplicates_default
} from "./chunk-PZS6RNLR.js";
import "./chunk-RSJG3PFO.js";
import "./chunk-MKJM6R4K.js";
import "./chunk-PY3JQBWU.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  GeometryAttributes_default
} from "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/CorridorOutlineGeometry.js
var cartesian1 = new Cartesian3_default();
var cartesian2 = new Cartesian3_default();
var cartesian3 = new Cartesian3_default();
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
  const attributes = new GeometryAttributes_default();
  let corner;
  let leftCount = 0;
  let rightCount = 0;
  let i;
  let indicesLength = 0;
  let length;
  for (i = 0; i < positions.length; i += 2) {
    length = positions[i].length - 3;
    leftCount += length;
    indicesLength += length / 3 * 4;
    rightCount += positions[i + 1].length - 3;
  }
  leftCount += 3;
  rightCount += 3;
  for (i = 0; i < corners.length; i++) {
    corner = corners[i];
    const leftSide = corners[i].leftPositions;
    if (defined_default(leftSide)) {
      length = leftSide.length;
      leftCount += length;
      indicesLength += length / 3 * 2;
    } else {
      length = corners[i].rightPositions.length;
      rightCount += length;
      indicesLength += length / 3 * 2;
    }
  }
  const addEndPositions = defined_default(endPositions);
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
  const indices = IndexDatatype_default.createTypedArray(size / 3, indicesLength + 4);
  let index = 0;
  indices[index++] = front / 3;
  indices[index++] = (back - 2) / 3;
  if (addEndPositions) {
    wallIndices.push(front / 3);
    leftPos = cartesian1;
    rightPos = cartesian2;
    const firstEndPositions = endPositions[0];
    for (i = 0; i < halfLength; i++) {
      leftPos = Cartesian3_default.fromArray(
        firstEndPositions,
        (halfLength - 1 - i) * 3,
        leftPos
      );
      rightPos = Cartesian3_default.fromArray(
        firstEndPositions,
        (halfLength + i) * 3,
        rightPos
      );
      CorridorGeometryLibrary_default.addAttribute(finalPositions, rightPos, front);
      CorridorGeometryLibrary_default.addAttribute(
        finalPositions,
        leftPos,
        void 0,
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
  let rightEdge = positions[posIndex++];
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
    if (defined_default(l)) {
      back -= 3;
      start = UR;
      wallIndices.push(LR);
      for (j = 0; j < l.length / 3; j++) {
        outsidePoint = Cartesian3_default.fromArray(l, j * 3, outsidePoint);
        indices[index++] = start - j - 1;
        indices[index++] = start - j;
        CorridorGeometryLibrary_default.addAttribute(
          finalPositions,
          outsidePoint,
          void 0,
          back
        );
        back -= 3;
      }
      wallIndices.push(start - Math.floor(l.length / 6));
      if (cornerType === CornerType_default.BEVELED) {
        wallIndices.push((back - 2) / 3 + 1);
      }
      front += 3;
    } else {
      front += 3;
      start = LR;
      wallIndices.push(UR);
      for (j = 0; j < r.length / 3; j++) {
        outsidePoint = Cartesian3_default.fromArray(r, j * 3, outsidePoint);
        indices[index++] = start + j;
        indices[index++] = start + j + 1;
        CorridorGeometryLibrary_default.addAttribute(
          finalPositions,
          outsidePoint,
          front
        );
        front += 3;
      }
      wallIndices.push(start + Math.floor(r.length / 6));
      if (cornerType === CornerType_default.BEVELED) {
        wallIndices.push(front / 3 - 1);
      }
      back -= 3;
    }
    rightEdge = positions[posIndex++];
    leftEdge = positions[posIndex++];
    rightEdge.splice(0, 3);
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
    front += 3;
    back -= 3;
    leftPos = cartesian1;
    rightPos = cartesian2;
    const lastEndPositions = endPositions[1];
    for (i = 0; i < halfLength; i++) {
      leftPos = Cartesian3_default.fromArray(
        lastEndPositions,
        (endPositionLength - i - 1) * 3,
        leftPos
      );
      rightPos = Cartesian3_default.fromArray(lastEndPositions, i * 3, rightPos);
      CorridorGeometryLibrary_default.addAttribute(
        finalPositions,
        leftPos,
        void 0,
        back
      );
      CorridorGeometryLibrary_default.addAttribute(finalPositions, rightPos, front);
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
  attributes.position = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: finalPositions
  });
  return {
    attributes,
    indices,
    wallIndices
  };
}
function computePositionsExtruded(params) {
  const ellipsoid = params.ellipsoid;
  const computedPositions = CorridorGeometryLibrary_default.computePositions(params);
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
  positions = PolygonPipeline_default.scaleToGeodeticHeight(
    positions,
    height,
    ellipsoid
  );
  extrudedPositions = PolygonPipeline_default.scaleToGeodeticHeight(
    extrudedPositions,
    extrudedHeight,
    ellipsoid
  );
  newPositions.set(positions);
  newPositions.set(extrudedPositions, length);
  attributes.position.values = newPositions;
  length /= 3;
  if (defined_default(params.offsetAttribute)) {
    let applyOffset = new Uint8Array(length * 2);
    if (params.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
      applyOffset = applyOffset.fill(1, 0, length);
    } else {
      const applyOffsetValue = params.offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      applyOffset = applyOffset.fill(applyOffsetValue);
    }
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset
    });
  }
  let i;
  const iLength = indices.length;
  const newIndices = IndexDatatype_default.createTypedArray(
    newPositions.length / 3,
    (iLength + wallIndices.length) * 2
  );
  newIndices.set(indices);
  let index = iLength;
  for (i = 0; i < iLength; i += 2) {
    const v0 = indices[i];
    const v1 = indices[i + 1];
    newIndices[index++] = v0 + length;
    newIndices[index++] = v1 + length;
  }
  let UL, LL;
  for (i = 0; i < wallIndices.length; i++) {
    UL = wallIndices[i];
    LL = UL + length;
    newIndices[index++] = UL;
    newIndices[index++] = LL;
  }
  return {
    attributes,
    indices: newIndices
  };
}
function CorridorOutlineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const positions = options.positions;
  const width = options.width;
  Check_default.typeOf.object("options.positions", positions);
  Check_default.typeOf.number("options.width", width);
  const height = defaultValue_default(options.height, 0);
  const extrudedHeight = defaultValue_default(options.extrudedHeight, height);
  this._positions = positions;
  this._ellipsoid = Ellipsoid_default.clone(
    defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84)
  );
  this._width = width;
  this._height = Math.max(height, extrudedHeight);
  this._extrudedHeight = Math.min(height, extrudedHeight);
  this._cornerType = defaultValue_default(options.cornerType, CornerType_default.ROUNDED);
  this._granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createCorridorOutlineGeometry";
  this.packedLength = 1 + positions.length * Cartesian3_default.packedLength + Ellipsoid_default.packedLength + 6;
}
CorridorOutlineGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.typeOf.object("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const positions = value._positions;
  const length = positions.length;
  array[startingIndex++] = length;
  for (let i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    Cartesian3_default.pack(positions[i], array, startingIndex);
  }
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  array[startingIndex++] = value._width;
  array[startingIndex++] = value._height;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._cornerType;
  array[startingIndex++] = value._granularity;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchOptions = {
  positions: void 0,
  ellipsoid: scratchEllipsoid,
  width: void 0,
  height: void 0,
  extrudedHeight: void 0,
  cornerType: void 0,
  granularity: void 0,
  offsetAttribute: void 0
};
CorridorOutlineGeometry.unpack = function(array, startingIndex, result) {
  Check_default.typeOf.object("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const length = array[startingIndex++];
  const positions = new Array(length);
  for (let i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    positions[i] = Cartesian3_default.unpack(array, startingIndex);
  }
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const width = array[startingIndex++];
  const height = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const cornerType = array[startingIndex++];
  const granularity = array[startingIndex++];
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.positions = positions;
    scratchOptions.width = width;
    scratchOptions.height = height;
    scratchOptions.extrudedHeight = extrudedHeight;
    scratchOptions.cornerType = cornerType;
    scratchOptions.granularity = granularity;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new CorridorOutlineGeometry(scratchOptions);
  }
  result._positions = positions;
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._width = width;
  result._height = height;
  result._extrudedHeight = extrudedHeight;
  result._cornerType = cornerType;
  result._granularity = granularity;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
CorridorOutlineGeometry.createGeometry = function(corridorOutlineGeometry) {
  let positions = corridorOutlineGeometry._positions;
  const width = corridorOutlineGeometry._width;
  const ellipsoid = corridorOutlineGeometry._ellipsoid;
  positions = scaleToSurface(positions, ellipsoid);
  const cleanPositions = arrayRemoveDuplicates_default(
    positions,
    Cartesian3_default.equalsEpsilon
  );
  if (cleanPositions.length < 2 || width <= 0) {
    return;
  }
  const height = corridorOutlineGeometry._height;
  const extrudedHeight = corridorOutlineGeometry._extrudedHeight;
  const extrude = !Math_default.equalsEpsilon(
    height,
    extrudedHeight,
    0,
    Math_default.EPSILON2
  );
  const params = {
    ellipsoid,
    positions: cleanPositions,
    width,
    cornerType: corridorOutlineGeometry._cornerType,
    granularity: corridorOutlineGeometry._granularity,
    saveAttributes: false
  };
  let attr;
  if (extrude) {
    params.height = height;
    params.extrudedHeight = extrudedHeight;
    params.offsetAttribute = corridorOutlineGeometry._offsetAttribute;
    attr = computePositionsExtruded(params);
  } else {
    const computedPositions = CorridorGeometryLibrary_default.computePositions(params);
    attr = combine(computedPositions, params.cornerType);
    attr.attributes.position.values = PolygonPipeline_default.scaleToGeodeticHeight(
      attr.attributes.position.values,
      height,
      ellipsoid
    );
    if (defined_default(corridorOutlineGeometry._offsetAttribute)) {
      const length = attr.attributes.position.values.length;
      const offsetValue = corridorOutlineGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
      attr.attributes.applyOffset = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset
      });
    }
  }
  const attributes = attr.attributes;
  const boundingSphere = BoundingSphere_default.fromVertices(
    attributes.position.values,
    void 0,
    3
  );
  return new Geometry_default({
    attributes,
    indices: attr.indices,
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere,
    offsetAttribute: corridorOutlineGeometry._offsetAttribute
  });
};
var CorridorOutlineGeometry_default = CorridorOutlineGeometry;

// packages/engine/Source/Workers/createCorridorOutlineGeometry.js
function createCorridorOutlineGeometry(corridorOutlineGeometry, offset) {
  if (defined_default(offset)) {
    corridorOutlineGeometry = CorridorOutlineGeometry_default.unpack(
      corridorOutlineGeometry,
      offset
    );
  }
  corridorOutlineGeometry._ellipsoid = Ellipsoid_default.clone(
    corridorOutlineGeometry._ellipsoid
  );
  return CorridorOutlineGeometry_default.createGeometry(corridorOutlineGeometry);
}
var createCorridorOutlineGeometry_default = createCorridorOutlineGeometry;
export {
  createCorridorOutlineGeometry_default as default
};
