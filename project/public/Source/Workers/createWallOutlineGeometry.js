/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.120
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
  WallGeometryLibrary_default
} from "./chunk-PANIHELG.js";
import "./chunk-4URY7XKQ.js";
import "./chunk-T2YMMXXZ.js";
import "./chunk-5QVD5ACU.js";
import "./chunk-755LKIZH.js";
import "./chunk-BV4EB65S.js";
import "./chunk-P7OMCKJ5.js";
import {
  IndexDatatype_default
} from "./chunk-QWYE75PG.js";
import {
  GeometryAttributes_default
} from "./chunk-EQPKKCOB.js";
import {
  GeometryAttribute_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-YMBYIWRS.js";
import {
  BoundingSphere_default
} from "./chunk-JFRY2XUS.js";
import "./chunk-IKEVZXU4.js";
import {
  ComponentDatatype_default
} from "./chunk-RQMS6UV3.js";
import {
  Cartesian3_default,
  Ellipsoid_default
} from "./chunk-FIBS72KH.js";
import {
  Math_default
} from "./chunk-HOXR7V6R.js";
import "./chunk-ZYWSMCFH.js";
import "./chunk-I3VEM5YN.js";
import {
  defaultValue_default
} from "./chunk-SWIXUPD2.js";
import {
  DeveloperError_default
} from "./chunk-L7PKE5VE.js";
import {
  defined_default
} from "./chunk-D3NRMS7O.js";

// packages/engine/Source/Core/WallOutlineGeometry.js
var scratchCartesian3Position1 = new Cartesian3_default();
var scratchCartesian3Position2 = new Cartesian3_default();
function WallOutlineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const wallPositions = options.positions;
  const maximumHeights = options.maximumHeights;
  const minimumHeights = options.minimumHeights;
  if (!defined_default(wallPositions)) {
    throw new DeveloperError_default("options.positions is required.");
  }
  if (defined_default(maximumHeights) && maximumHeights.length !== wallPositions.length) {
    throw new DeveloperError_default(
      "options.positions and options.maximumHeights must have the same length."
    );
  }
  if (defined_default(minimumHeights) && minimumHeights.length !== wallPositions.length) {
    throw new DeveloperError_default(
      "options.positions and options.minimumHeights must have the same length."
    );
  }
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.default);
  this._positions = wallPositions;
  this._minimumHeights = minimumHeights;
  this._maximumHeights = maximumHeights;
  this._granularity = granularity;
  this._ellipsoid = Ellipsoid_default.clone(ellipsoid);
  this._workerName = "createWallOutlineGeometry";
  let numComponents = 1 + wallPositions.length * Cartesian3_default.packedLength + 2;
  if (defined_default(minimumHeights)) {
    numComponents += minimumHeights.length;
  }
  if (defined_default(maximumHeights)) {
    numComponents += maximumHeights.length;
  }
  this.packedLength = numComponents + Ellipsoid_default.packedLength + 1;
}
WallOutlineGeometry.pack = function(value, array, startingIndex) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required");
  }
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  let i;
  const positions = value._positions;
  let length = positions.length;
  array[startingIndex++] = length;
  for (i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    Cartesian3_default.pack(positions[i], array, startingIndex);
  }
  const minimumHeights = value._minimumHeights;
  length = defined_default(minimumHeights) ? minimumHeights.length : 0;
  array[startingIndex++] = length;
  if (defined_default(minimumHeights)) {
    for (i = 0; i < length; ++i) {
      array[startingIndex++] = minimumHeights[i];
    }
  }
  const maximumHeights = value._maximumHeights;
  length = defined_default(maximumHeights) ? maximumHeights.length : 0;
  array[startingIndex++] = length;
  if (defined_default(maximumHeights)) {
    for (i = 0; i < length; ++i) {
      array[startingIndex++] = maximumHeights[i];
    }
  }
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  array[startingIndex] = value._granularity;
  return array;
};
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchOptions = {
  positions: void 0,
  minimumHeights: void 0,
  maximumHeights: void 0,
  ellipsoid: scratchEllipsoid,
  granularity: void 0
};
WallOutlineGeometry.unpack = function(array, startingIndex, result) {
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  let i;
  let length = array[startingIndex++];
  const positions = new Array(length);
  for (i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    positions[i] = Cartesian3_default.unpack(array, startingIndex);
  }
  length = array[startingIndex++];
  let minimumHeights;
  if (length > 0) {
    minimumHeights = new Array(length);
    for (i = 0; i < length; ++i) {
      minimumHeights[i] = array[startingIndex++];
    }
  }
  length = array[startingIndex++];
  let maximumHeights;
  if (length > 0) {
    maximumHeights = new Array(length);
    for (i = 0; i < length; ++i) {
      maximumHeights[i] = array[startingIndex++];
    }
  }
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const granularity = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.positions = positions;
    scratchOptions.minimumHeights = minimumHeights;
    scratchOptions.maximumHeights = maximumHeights;
    scratchOptions.granularity = granularity;
    return new WallOutlineGeometry(scratchOptions);
  }
  result._positions = positions;
  result._minimumHeights = minimumHeights;
  result._maximumHeights = maximumHeights;
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._granularity = granularity;
  return result;
};
WallOutlineGeometry.fromConstantHeights = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const positions = options.positions;
  if (!defined_default(positions)) {
    throw new DeveloperError_default("options.positions is required.");
  }
  let minHeights;
  let maxHeights;
  const min = options.minimumHeight;
  const max = options.maximumHeight;
  const doMin = defined_default(min);
  const doMax = defined_default(max);
  if (doMin || doMax) {
    const length = positions.length;
    minHeights = doMin ? new Array(length) : void 0;
    maxHeights = doMax ? new Array(length) : void 0;
    for (let i = 0; i < length; ++i) {
      if (doMin) {
        minHeights[i] = min;
      }
      if (doMax) {
        maxHeights[i] = max;
      }
    }
  }
  const newOptions = {
    positions,
    maximumHeights: maxHeights,
    minimumHeights: minHeights,
    ellipsoid: options.ellipsoid
  };
  return new WallOutlineGeometry(newOptions);
};
WallOutlineGeometry.createGeometry = function(wallGeometry) {
  const wallPositions = wallGeometry._positions;
  const minimumHeights = wallGeometry._minimumHeights;
  const maximumHeights = wallGeometry._maximumHeights;
  const granularity = wallGeometry._granularity;
  const ellipsoid = wallGeometry._ellipsoid;
  const pos = WallGeometryLibrary_default.computePositions(
    ellipsoid,
    wallPositions,
    maximumHeights,
    minimumHeights,
    granularity,
    false
  );
  if (!defined_default(pos)) {
    return;
  }
  const bottomPositions = pos.bottomPositions;
  const topPositions = pos.topPositions;
  let length = topPositions.length;
  let size = length * 2;
  const positions = new Float64Array(size);
  let positionIndex = 0;
  length /= 3;
  let i;
  for (i = 0; i < length; ++i) {
    const i3 = i * 3;
    const topPosition = Cartesian3_default.fromArray(
      topPositions,
      i3,
      scratchCartesian3Position1
    );
    const bottomPosition = Cartesian3_default.fromArray(
      bottomPositions,
      i3,
      scratchCartesian3Position2
    );
    positions[positionIndex++] = bottomPosition.x;
    positions[positionIndex++] = bottomPosition.y;
    positions[positionIndex++] = bottomPosition.z;
    positions[positionIndex++] = topPosition.x;
    positions[positionIndex++] = topPosition.y;
    positions[positionIndex++] = topPosition.z;
  }
  const attributes = new GeometryAttributes_default({
    position: new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: positions
    })
  });
  const numVertices = size / 3;
  size = 2 * numVertices - 4 + numVertices;
  const indices = IndexDatatype_default.createTypedArray(numVertices, size);
  let edgeIndex = 0;
  for (i = 0; i < numVertices - 2; i += 2) {
    const LL = i;
    const LR = i + 2;
    const pl = Cartesian3_default.fromArray(
      positions,
      LL * 3,
      scratchCartesian3Position1
    );
    const pr = Cartesian3_default.fromArray(
      positions,
      LR * 3,
      scratchCartesian3Position2
    );
    if (Cartesian3_default.equalsEpsilon(pl, pr, Math_default.EPSILON10)) {
      continue;
    }
    const UL = i + 1;
    const UR = i + 3;
    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = LR;
  }
  indices[edgeIndex++] = numVertices - 2;
  indices[edgeIndex++] = numVertices - 1;
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere: new BoundingSphere_default.fromVertices(positions)
  });
};
var WallOutlineGeometry_default = WallOutlineGeometry;

// packages/engine/Source/Workers/createWallOutlineGeometry.js
function createWallOutlineGeometry(wallGeometry, offset) {
  if (defined_default(offset)) {
    wallGeometry = WallOutlineGeometry_default.unpack(wallGeometry, offset);
  }
  wallGeometry._ellipsoid = Ellipsoid_default.clone(wallGeometry._ellipsoid);
  return WallOutlineGeometry_default.createGeometry(wallGeometry);
}
var createWallOutlineGeometry_default = createWallOutlineGeometry;
export {
  createWallOutlineGeometry_default as default
};
