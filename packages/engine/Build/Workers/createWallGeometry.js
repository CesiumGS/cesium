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
  WallGeometryLibrary_default
} from "./chunk-MWL6RXC2.js";
import "./chunk-H6UV4PJF.js";
import "./chunk-DAY2RGWJ.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
import "./chunk-PZS6RNLR.js";
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
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/WallGeometry.js
var scratchCartesian3Position1 = new Cartesian3_default();
var scratchCartesian3Position2 = new Cartesian3_default();
var scratchCartesian3Position4 = new Cartesian3_default();
var scratchCartesian3Position5 = new Cartesian3_default();
var scratchBitangent = new Cartesian3_default();
var scratchTangent = new Cartesian3_default();
var scratchNormal = new Cartesian3_default();
function WallGeometry(options) {
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
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  this._positions = wallPositions;
  this._minimumHeights = minimumHeights;
  this._maximumHeights = maximumHeights;
  this._vertexFormat = VertexFormat_default.clone(vertexFormat);
  this._granularity = granularity;
  this._ellipsoid = Ellipsoid_default.clone(ellipsoid);
  this._workerName = "createWallGeometry";
  let numComponents = 1 + wallPositions.length * Cartesian3_default.packedLength + 2;
  if (defined_default(minimumHeights)) {
    numComponents += minimumHeights.length;
  }
  if (defined_default(maximumHeights)) {
    numComponents += maximumHeights.length;
  }
  this.packedLength = numComponents + Ellipsoid_default.packedLength + VertexFormat_default.packedLength + 1;
}
WallGeometry.pack = function(value, array, startingIndex) {
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
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex] = value._granularity;
  return array;
};
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  positions: void 0,
  minimumHeights: void 0,
  maximumHeights: void 0,
  ellipsoid: scratchEllipsoid,
  vertexFormat: scratchVertexFormat,
  granularity: void 0
};
WallGeometry.unpack = function(array, startingIndex, result) {
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
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const granularity = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.positions = positions;
    scratchOptions.minimumHeights = minimumHeights;
    scratchOptions.maximumHeights = maximumHeights;
    scratchOptions.granularity = granularity;
    return new WallGeometry(scratchOptions);
  }
  result._positions = positions;
  result._minimumHeights = minimumHeights;
  result._maximumHeights = maximumHeights;
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._granularity = granularity;
  return result;
};
WallGeometry.fromConstantHeights = function(options) {
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
    ellipsoid: options.ellipsoid,
    vertexFormat: options.vertexFormat
  };
  return new WallGeometry(newOptions);
};
WallGeometry.createGeometry = function(wallGeometry) {
  const wallPositions = wallGeometry._positions;
  const minimumHeights = wallGeometry._minimumHeights;
  const maximumHeights = wallGeometry._maximumHeights;
  const vertexFormat = wallGeometry._vertexFormat;
  const granularity = wallGeometry._granularity;
  const ellipsoid = wallGeometry._ellipsoid;
  const pos = WallGeometryLibrary_default.computePositions(
    ellipsoid,
    wallPositions,
    maximumHeights,
    minimumHeights,
    granularity,
    true
  );
  if (!defined_default(pos)) {
    return;
  }
  const bottomPositions = pos.bottomPositions;
  const topPositions = pos.topPositions;
  const numCorners = pos.numCorners;
  let length = topPositions.length;
  let size = length * 2;
  const positions = vertexFormat.position ? new Float64Array(size) : void 0;
  const normals = vertexFormat.normal ? new Float32Array(size) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(size) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(size) : void 0;
  const textureCoordinates = vertexFormat.st ? new Float32Array(size / 3 * 2) : void 0;
  let positionIndex = 0;
  let normalIndex = 0;
  let bitangentIndex = 0;
  let tangentIndex = 0;
  let stIndex = 0;
  let normal = scratchNormal;
  let tangent = scratchTangent;
  let bitangent = scratchBitangent;
  let recomputeNormal = true;
  length /= 3;
  let i;
  let s = 0;
  const ds = 1 / (length - numCorners - 1);
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
    if (vertexFormat.position) {
      positions[positionIndex++] = bottomPosition.x;
      positions[positionIndex++] = bottomPosition.y;
      positions[positionIndex++] = bottomPosition.z;
      positions[positionIndex++] = topPosition.x;
      positions[positionIndex++] = topPosition.y;
      positions[positionIndex++] = topPosition.z;
    }
    if (vertexFormat.st) {
      textureCoordinates[stIndex++] = s;
      textureCoordinates[stIndex++] = 0;
      textureCoordinates[stIndex++] = s;
      textureCoordinates[stIndex++] = 1;
    }
    if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
      let nextTop = Cartesian3_default.clone(
        Cartesian3_default.ZERO,
        scratchCartesian3Position5
      );
      const groundPosition = Cartesian3_default.subtract(
        topPosition,
        ellipsoid.geodeticSurfaceNormal(
          topPosition,
          scratchCartesian3Position2
        ),
        scratchCartesian3Position2
      );
      if (i + 1 < length) {
        nextTop = Cartesian3_default.fromArray(
          topPositions,
          i3 + 3,
          scratchCartesian3Position5
        );
      }
      if (recomputeNormal) {
        const scalednextPosition = Cartesian3_default.subtract(
          nextTop,
          topPosition,
          scratchCartesian3Position4
        );
        const scaledGroundPosition = Cartesian3_default.subtract(
          groundPosition,
          topPosition,
          scratchCartesian3Position1
        );
        normal = Cartesian3_default.normalize(
          Cartesian3_default.cross(scaledGroundPosition, scalednextPosition, normal),
          normal
        );
        recomputeNormal = false;
      }
      if (Cartesian3_default.equalsEpsilon(topPosition, nextTop, Math_default.EPSILON10)) {
        recomputeNormal = true;
      } else {
        s += ds;
        if (vertexFormat.tangent) {
          tangent = Cartesian3_default.normalize(
            Cartesian3_default.subtract(nextTop, topPosition, tangent),
            tangent
          );
        }
        if (vertexFormat.bitangent) {
          bitangent = Cartesian3_default.normalize(
            Cartesian3_default.cross(normal, tangent, bitangent),
            bitangent
          );
        }
      }
      if (vertexFormat.normal) {
        normals[normalIndex++] = normal.x;
        normals[normalIndex++] = normal.y;
        normals[normalIndex++] = normal.z;
        normals[normalIndex++] = normal.x;
        normals[normalIndex++] = normal.y;
        normals[normalIndex++] = normal.z;
      }
      if (vertexFormat.tangent) {
        tangents[tangentIndex++] = tangent.x;
        tangents[tangentIndex++] = tangent.y;
        tangents[tangentIndex++] = tangent.z;
        tangents[tangentIndex++] = tangent.x;
        tangents[tangentIndex++] = tangent.y;
        tangents[tangentIndex++] = tangent.z;
      }
      if (vertexFormat.bitangent) {
        bitangents[bitangentIndex++] = bitangent.x;
        bitangents[bitangentIndex++] = bitangent.y;
        bitangents[bitangentIndex++] = bitangent.z;
        bitangents[bitangentIndex++] = bitangent.x;
        bitangents[bitangentIndex++] = bitangent.y;
        bitangents[bitangentIndex++] = bitangent.z;
      }
    }
  }
  const attributes = new GeometryAttributes_default();
  if (vertexFormat.position) {
    attributes.position = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: positions
    });
  }
  if (vertexFormat.normal) {
    attributes.normal = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: normals
    });
  }
  if (vertexFormat.tangent) {
    attributes.tangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: tangents
    });
  }
  if (vertexFormat.bitangent) {
    attributes.bitangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: bitangents
    });
  }
  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: textureCoordinates
    });
  }
  const numVertices = size / 3;
  size -= 6 * (numCorners + 1);
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
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = LR;
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere: new BoundingSphere_default.fromVertices(positions)
  });
};
var WallGeometry_default = WallGeometry;

// packages/engine/Source/Workers/createWallGeometry.js
function createWallGeometry(wallGeometry, offset) {
  if (defined_default(offset)) {
    wallGeometry = WallGeometry_default.unpack(wallGeometry, offset);
  }
  wallGeometry._ellipsoid = Ellipsoid_default.clone(wallGeometry._ellipsoid);
  return WallGeometry_default.createGeometry(wallGeometry);
}
var createWallGeometry_default = createWallGeometry;
export {
  createWallGeometry_default as default
};
