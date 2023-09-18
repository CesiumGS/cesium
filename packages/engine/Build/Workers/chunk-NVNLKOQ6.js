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
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
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
import {
  Cartesian2_default
} from "./chunk-5G2JRFMX.js";
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
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/EllipsoidGeometry.js
var scratchPosition = new Cartesian3_default();
var scratchNormal = new Cartesian3_default();
var scratchTangent = new Cartesian3_default();
var scratchBitangent = new Cartesian3_default();
var scratchNormalST = new Cartesian3_default();
var defaultRadii = new Cartesian3_default(1, 1, 1);
var cos = Math.cos;
var sin = Math.sin;
function EllipsoidGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const radii = defaultValue_default(options.radii, defaultRadii);
  const innerRadii = defaultValue_default(options.innerRadii, radii);
  const minimumClock = defaultValue_default(options.minimumClock, 0);
  const maximumClock = defaultValue_default(options.maximumClock, Math_default.TWO_PI);
  const minimumCone = defaultValue_default(options.minimumCone, 0);
  const maximumCone = defaultValue_default(options.maximumCone, Math_default.PI);
  const stackPartitions = Math.round(defaultValue_default(options.stackPartitions, 64));
  const slicePartitions = Math.round(defaultValue_default(options.slicePartitions, 64));
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  if (slicePartitions < 3) {
    throw new DeveloperError_default(
      "options.slicePartitions cannot be less than three."
    );
  }
  if (stackPartitions < 3) {
    throw new DeveloperError_default(
      "options.stackPartitions cannot be less than three."
    );
  }
  this._radii = Cartesian3_default.clone(radii);
  this._innerRadii = Cartesian3_default.clone(innerRadii);
  this._minimumClock = minimumClock;
  this._maximumClock = maximumClock;
  this._minimumCone = minimumCone;
  this._maximumCone = maximumCone;
  this._stackPartitions = stackPartitions;
  this._slicePartitions = slicePartitions;
  this._vertexFormat = VertexFormat_default.clone(vertexFormat);
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createEllipsoidGeometry";
}
EllipsoidGeometry.packedLength = 2 * Cartesian3_default.packedLength + VertexFormat_default.packedLength + 7;
EllipsoidGeometry.pack = function(value, array, startingIndex) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required");
  }
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value._radii, array, startingIndex);
  startingIndex += Cartesian3_default.packedLength;
  Cartesian3_default.pack(value._innerRadii, array, startingIndex);
  startingIndex += Cartesian3_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._minimumClock;
  array[startingIndex++] = value._maximumClock;
  array[startingIndex++] = value._minimumCone;
  array[startingIndex++] = value._maximumCone;
  array[startingIndex++] = value._stackPartitions;
  array[startingIndex++] = value._slicePartitions;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchRadii = new Cartesian3_default();
var scratchInnerRadii = new Cartesian3_default();
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  radii: scratchRadii,
  innerRadii: scratchInnerRadii,
  vertexFormat: scratchVertexFormat,
  minimumClock: void 0,
  maximumClock: void 0,
  minimumCone: void 0,
  maximumCone: void 0,
  stackPartitions: void 0,
  slicePartitions: void 0,
  offsetAttribute: void 0
};
EllipsoidGeometry.unpack = function(array, startingIndex, result) {
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  const radii = Cartesian3_default.unpack(array, startingIndex, scratchRadii);
  startingIndex += Cartesian3_default.packedLength;
  const innerRadii = Cartesian3_default.unpack(array, startingIndex, scratchInnerRadii);
  startingIndex += Cartesian3_default.packedLength;
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const minimumClock = array[startingIndex++];
  const maximumClock = array[startingIndex++];
  const minimumCone = array[startingIndex++];
  const maximumCone = array[startingIndex++];
  const stackPartitions = array[startingIndex++];
  const slicePartitions = array[startingIndex++];
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.minimumClock = minimumClock;
    scratchOptions.maximumClock = maximumClock;
    scratchOptions.minimumCone = minimumCone;
    scratchOptions.maximumCone = maximumCone;
    scratchOptions.stackPartitions = stackPartitions;
    scratchOptions.slicePartitions = slicePartitions;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new EllipsoidGeometry(scratchOptions);
  }
  result._radii = Cartesian3_default.clone(radii, result._radii);
  result._innerRadii = Cartesian3_default.clone(innerRadii, result._innerRadii);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._minimumClock = minimumClock;
  result._maximumClock = maximumClock;
  result._minimumCone = minimumCone;
  result._maximumCone = maximumCone;
  result._stackPartitions = stackPartitions;
  result._slicePartitions = slicePartitions;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
EllipsoidGeometry.createGeometry = function(ellipsoidGeometry) {
  const radii = ellipsoidGeometry._radii;
  if (radii.x <= 0 || radii.y <= 0 || radii.z <= 0) {
    return;
  }
  const innerRadii = ellipsoidGeometry._innerRadii;
  if (innerRadii.x <= 0 || innerRadii.y <= 0 || innerRadii.z <= 0) {
    return;
  }
  const minimumClock = ellipsoidGeometry._minimumClock;
  const maximumClock = ellipsoidGeometry._maximumClock;
  const minimumCone = ellipsoidGeometry._minimumCone;
  const maximumCone = ellipsoidGeometry._maximumCone;
  const vertexFormat = ellipsoidGeometry._vertexFormat;
  let slicePartitions = ellipsoidGeometry._slicePartitions + 1;
  let stackPartitions = ellipsoidGeometry._stackPartitions + 1;
  slicePartitions = Math.round(
    slicePartitions * Math.abs(maximumClock - minimumClock) / Math_default.TWO_PI
  );
  stackPartitions = Math.round(
    stackPartitions * Math.abs(maximumCone - minimumCone) / Math_default.PI
  );
  if (slicePartitions < 2) {
    slicePartitions = 2;
  }
  if (stackPartitions < 2) {
    stackPartitions = 2;
  }
  let i;
  let j;
  let index = 0;
  const phis = [minimumCone];
  const thetas = [minimumClock];
  for (i = 0; i < stackPartitions; i++) {
    phis.push(
      minimumCone + i * (maximumCone - minimumCone) / (stackPartitions - 1)
    );
  }
  phis.push(maximumCone);
  for (j = 0; j < slicePartitions; j++) {
    thetas.push(
      minimumClock + j * (maximumClock - minimumClock) / (slicePartitions - 1)
    );
  }
  thetas.push(maximumClock);
  const numPhis = phis.length;
  const numThetas = thetas.length;
  let extraIndices = 0;
  let vertexMultiplier = 1;
  const hasInnerSurface = innerRadii.x !== radii.x || innerRadii.y !== radii.y || innerRadii.z !== radii.z;
  let isTopOpen = false;
  let isBotOpen = false;
  let isClockOpen = false;
  if (hasInnerSurface) {
    vertexMultiplier = 2;
    if (minimumCone > 0) {
      isTopOpen = true;
      extraIndices += slicePartitions - 1;
    }
    if (maximumCone < Math.PI) {
      isBotOpen = true;
      extraIndices += slicePartitions - 1;
    }
    if ((maximumClock - minimumClock) % Math_default.TWO_PI) {
      isClockOpen = true;
      extraIndices += (stackPartitions - 1) * 2 + 1;
    } else {
      extraIndices += 1;
    }
  }
  const vertexCount = numThetas * numPhis * vertexMultiplier;
  const positions = new Float64Array(vertexCount * 3);
  const isInner = new Array(vertexCount).fill(false);
  const negateNormal = new Array(vertexCount).fill(false);
  const indexCount = slicePartitions * stackPartitions * vertexMultiplier;
  const numIndices = 6 * (indexCount + extraIndices + 1 - (slicePartitions + stackPartitions) * vertexMultiplier);
  const indices = IndexDatatype_default.createTypedArray(indexCount, numIndices);
  const normals = vertexFormat.normal ? new Float32Array(vertexCount * 3) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(vertexCount * 3) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(vertexCount * 3) : void 0;
  const st = vertexFormat.st ? new Float32Array(vertexCount * 2) : void 0;
  const sinPhi = new Array(numPhis);
  const cosPhi = new Array(numPhis);
  for (i = 0; i < numPhis; i++) {
    sinPhi[i] = sin(phis[i]);
    cosPhi[i] = cos(phis[i]);
  }
  const sinTheta = new Array(numThetas);
  const cosTheta = new Array(numThetas);
  for (j = 0; j < numThetas; j++) {
    cosTheta[j] = cos(thetas[j]);
    sinTheta[j] = sin(thetas[j]);
  }
  for (i = 0; i < numPhis; i++) {
    for (j = 0; j < numThetas; j++) {
      positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
      positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
      positions[index++] = radii.z * cosPhi[i];
    }
  }
  let vertexIndex = vertexCount / 2;
  if (hasInnerSurface) {
    for (i = 0; i < numPhis; i++) {
      for (j = 0; j < numThetas; j++) {
        positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
        positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
        positions[index++] = innerRadii.z * cosPhi[i];
        isInner[vertexIndex] = true;
        if (i > 0 && i !== numPhis - 1 && j !== 0 && j !== numThetas - 1) {
          negateNormal[vertexIndex] = true;
        }
        vertexIndex++;
      }
    }
  }
  index = 0;
  let topOffset;
  let bottomOffset;
  for (i = 1; i < numPhis - 2; i++) {
    topOffset = i * numThetas;
    bottomOffset = (i + 1) * numThetas;
    for (j = 1; j < numThetas - 2; j++) {
      indices[index++] = bottomOffset + j;
      indices[index++] = bottomOffset + j + 1;
      indices[index++] = topOffset + j + 1;
      indices[index++] = bottomOffset + j;
      indices[index++] = topOffset + j + 1;
      indices[index++] = topOffset + j;
    }
  }
  if (hasInnerSurface) {
    const offset = numPhis * numThetas;
    for (i = 1; i < numPhis - 2; i++) {
      topOffset = offset + i * numThetas;
      bottomOffset = offset + (i + 1) * numThetas;
      for (j = 1; j < numThetas - 2; j++) {
        indices[index++] = bottomOffset + j;
        indices[index++] = topOffset + j;
        indices[index++] = topOffset + j + 1;
        indices[index++] = bottomOffset + j;
        indices[index++] = topOffset + j + 1;
        indices[index++] = bottomOffset + j + 1;
      }
    }
  }
  let outerOffset;
  let innerOffset;
  if (hasInnerSurface) {
    if (isTopOpen) {
      innerOffset = numPhis * numThetas;
      for (i = 1; i < numThetas - 2; i++) {
        indices[index++] = i;
        indices[index++] = i + 1;
        indices[index++] = innerOffset + i + 1;
        indices[index++] = i;
        indices[index++] = innerOffset + i + 1;
        indices[index++] = innerOffset + i;
      }
    }
    if (isBotOpen) {
      outerOffset = numPhis * numThetas - numThetas;
      innerOffset = numPhis * numThetas * vertexMultiplier - numThetas;
      for (i = 1; i < numThetas - 2; i++) {
        indices[index++] = outerOffset + i + 1;
        indices[index++] = outerOffset + i;
        indices[index++] = innerOffset + i;
        indices[index++] = outerOffset + i + 1;
        indices[index++] = innerOffset + i;
        indices[index++] = innerOffset + i + 1;
      }
    }
  }
  if (isClockOpen) {
    for (i = 1; i < numPhis - 2; i++) {
      innerOffset = numThetas * numPhis + numThetas * i;
      outerOffset = numThetas * i;
      indices[index++] = innerOffset;
      indices[index++] = outerOffset + numThetas;
      indices[index++] = outerOffset;
      indices[index++] = innerOffset;
      indices[index++] = innerOffset + numThetas;
      indices[index++] = outerOffset + numThetas;
    }
    for (i = 1; i < numPhis - 2; i++) {
      innerOffset = numThetas * numPhis + numThetas * (i + 1) - 1;
      outerOffset = numThetas * (i + 1) - 1;
      indices[index++] = outerOffset + numThetas;
      indices[index++] = innerOffset;
      indices[index++] = outerOffset;
      indices[index++] = outerOffset + numThetas;
      indices[index++] = innerOffset + numThetas;
      indices[index++] = innerOffset;
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
  let stIndex = 0;
  let normalIndex = 0;
  let tangentIndex = 0;
  let bitangentIndex = 0;
  const vertexCountHalf = vertexCount / 2;
  let ellipsoid;
  const ellipsoidOuter = Ellipsoid_default.fromCartesian3(radii);
  const ellipsoidInner = Ellipsoid_default.fromCartesian3(innerRadii);
  if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
    for (i = 0; i < vertexCount; i++) {
      ellipsoid = isInner[i] ? ellipsoidInner : ellipsoidOuter;
      const position = Cartesian3_default.fromArray(positions, i * 3, scratchPosition);
      const normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
      if (negateNormal[i]) {
        Cartesian3_default.negate(normal, normal);
      }
      if (vertexFormat.st) {
        const normalST = Cartesian2_default.negate(normal, scratchNormalST);
        st[stIndex++] = Math.atan2(normalST.y, normalST.x) / Math_default.TWO_PI + 0.5;
        st[stIndex++] = Math.asin(normal.z) / Math.PI + 0.5;
      }
      if (vertexFormat.normal) {
        normals[normalIndex++] = normal.x;
        normals[normalIndex++] = normal.y;
        normals[normalIndex++] = normal.z;
      }
      if (vertexFormat.tangent || vertexFormat.bitangent) {
        const tangent = scratchTangent;
        let tangetOffset = 0;
        let unit;
        if (isInner[i]) {
          tangetOffset = vertexCountHalf;
        }
        if (!isTopOpen && i >= tangetOffset && i < tangetOffset + numThetas * 2) {
          unit = Cartesian3_default.UNIT_X;
        } else {
          unit = Cartesian3_default.UNIT_Z;
        }
        Cartesian3_default.cross(unit, normal, tangent);
        Cartesian3_default.normalize(tangent, tangent);
        if (vertexFormat.tangent) {
          tangents[tangentIndex++] = tangent.x;
          tangents[tangentIndex++] = tangent.y;
          tangents[tangentIndex++] = tangent.z;
        }
        if (vertexFormat.bitangent) {
          const bitangent = Cartesian3_default.cross(normal, tangent, scratchBitangent);
          Cartesian3_default.normalize(bitangent, bitangent);
          bitangents[bitangentIndex++] = bitangent.x;
          bitangents[bitangentIndex++] = bitangent.y;
          bitangents[bitangentIndex++] = bitangent.z;
        }
      }
    }
    if (vertexFormat.st) {
      attributes.st = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 2,
        values: st
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
  }
  if (defined_default(ellipsoidGeometry._offsetAttribute)) {
    const length = positions.length;
    const offsetValue = ellipsoidGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
    const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset
    });
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere: BoundingSphere_default.fromEllipsoid(ellipsoidOuter),
    offsetAttribute: ellipsoidGeometry._offsetAttribute
  });
};
var unitEllipsoidGeometry;
EllipsoidGeometry.getUnitEllipsoid = function() {
  if (!defined_default(unitEllipsoidGeometry)) {
    unitEllipsoidGeometry = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        radii: new Cartesian3_default(1, 1, 1),
        vertexFormat: VertexFormat_default.POSITION_ONLY
      })
    );
  }
  return unitEllipsoidGeometry;
};
var EllipsoidGeometry_default = EllipsoidGeometry;

export {
  EllipsoidGeometry_default
};
