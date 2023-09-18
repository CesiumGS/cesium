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

// packages/engine/Source/Core/EllipsoidOutlineGeometry.js
var defaultRadii = new Cartesian3_default(1, 1, 1);
var cos = Math.cos;
var sin = Math.sin;
function EllipsoidOutlineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const radii = defaultValue_default(options.radii, defaultRadii);
  const innerRadii = defaultValue_default(options.innerRadii, radii);
  const minimumClock = defaultValue_default(options.minimumClock, 0);
  const maximumClock = defaultValue_default(options.maximumClock, Math_default.TWO_PI);
  const minimumCone = defaultValue_default(options.minimumCone, 0);
  const maximumCone = defaultValue_default(options.maximumCone, Math_default.PI);
  const stackPartitions = Math.round(defaultValue_default(options.stackPartitions, 10));
  const slicePartitions = Math.round(defaultValue_default(options.slicePartitions, 8));
  const subdivisions = Math.round(defaultValue_default(options.subdivisions, 128));
  if (stackPartitions < 1) {
    throw new DeveloperError_default("options.stackPartitions cannot be less than 1");
  }
  if (slicePartitions < 0) {
    throw new DeveloperError_default("options.slicePartitions cannot be less than 0");
  }
  if (subdivisions < 0) {
    throw new DeveloperError_default(
      "options.subdivisions must be greater than or equal to zero."
    );
  }
  if (defined_default(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
    throw new DeveloperError_default(
      "GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry."
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
  this._subdivisions = subdivisions;
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createEllipsoidOutlineGeometry";
}
EllipsoidOutlineGeometry.packedLength = 2 * Cartesian3_default.packedLength + 8;
EllipsoidOutlineGeometry.pack = function(value, array, startingIndex) {
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
  array[startingIndex++] = value._minimumClock;
  array[startingIndex++] = value._maximumClock;
  array[startingIndex++] = value._minimumCone;
  array[startingIndex++] = value._maximumCone;
  array[startingIndex++] = value._stackPartitions;
  array[startingIndex++] = value._slicePartitions;
  array[startingIndex++] = value._subdivisions;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchRadii = new Cartesian3_default();
var scratchInnerRadii = new Cartesian3_default();
var scratchOptions = {
  radii: scratchRadii,
  innerRadii: scratchInnerRadii,
  minimumClock: void 0,
  maximumClock: void 0,
  minimumCone: void 0,
  maximumCone: void 0,
  stackPartitions: void 0,
  slicePartitions: void 0,
  subdivisions: void 0,
  offsetAttribute: void 0
};
EllipsoidOutlineGeometry.unpack = function(array, startingIndex, result) {
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  const radii = Cartesian3_default.unpack(array, startingIndex, scratchRadii);
  startingIndex += Cartesian3_default.packedLength;
  const innerRadii = Cartesian3_default.unpack(array, startingIndex, scratchInnerRadii);
  startingIndex += Cartesian3_default.packedLength;
  const minimumClock = array[startingIndex++];
  const maximumClock = array[startingIndex++];
  const minimumCone = array[startingIndex++];
  const maximumCone = array[startingIndex++];
  const stackPartitions = array[startingIndex++];
  const slicePartitions = array[startingIndex++];
  const subdivisions = array[startingIndex++];
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.minimumClock = minimumClock;
    scratchOptions.maximumClock = maximumClock;
    scratchOptions.minimumCone = minimumCone;
    scratchOptions.maximumCone = maximumCone;
    scratchOptions.stackPartitions = stackPartitions;
    scratchOptions.slicePartitions = slicePartitions;
    scratchOptions.subdivisions = subdivisions;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new EllipsoidOutlineGeometry(scratchOptions);
  }
  result._radii = Cartesian3_default.clone(radii, result._radii);
  result._innerRadii = Cartesian3_default.clone(innerRadii, result._innerRadii);
  result._minimumClock = minimumClock;
  result._maximumClock = maximumClock;
  result._minimumCone = minimumCone;
  result._maximumCone = maximumCone;
  result._stackPartitions = stackPartitions;
  result._slicePartitions = slicePartitions;
  result._subdivisions = subdivisions;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
EllipsoidOutlineGeometry.createGeometry = function(ellipsoidGeometry) {
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
  const subdivisions = ellipsoidGeometry._subdivisions;
  const ellipsoid = Ellipsoid_default.fromCartesian3(radii);
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
  let extraIndices = 0;
  let vertexMultiplier = 1;
  const hasInnerSurface = innerRadii.x !== radii.x || innerRadii.y !== radii.y || innerRadii.z !== radii.z;
  let isTopOpen = false;
  let isBotOpen = false;
  if (hasInnerSurface) {
    vertexMultiplier = 2;
    if (minimumCone > 0) {
      isTopOpen = true;
      extraIndices += slicePartitions;
    }
    if (maximumCone < Math.PI) {
      isBotOpen = true;
      extraIndices += slicePartitions;
    }
  }
  const vertexCount = subdivisions * vertexMultiplier * (stackPartitions + slicePartitions);
  const positions = new Float64Array(vertexCount * 3);
  const numIndices = 2 * (vertexCount + extraIndices - (slicePartitions + stackPartitions) * vertexMultiplier);
  const indices = IndexDatatype_default.createTypedArray(vertexCount, numIndices);
  let i;
  let j;
  let theta;
  let phi;
  let index = 0;
  const sinPhi = new Array(stackPartitions);
  const cosPhi = new Array(stackPartitions);
  for (i = 0; i < stackPartitions; i++) {
    phi = minimumCone + i * (maximumCone - minimumCone) / (stackPartitions - 1);
    sinPhi[i] = sin(phi);
    cosPhi[i] = cos(phi);
  }
  const sinTheta = new Array(subdivisions);
  const cosTheta = new Array(subdivisions);
  for (i = 0; i < subdivisions; i++) {
    theta = minimumClock + i * (maximumClock - minimumClock) / (subdivisions - 1);
    sinTheta[i] = sin(theta);
    cosTheta[i] = cos(theta);
  }
  for (i = 0; i < stackPartitions; i++) {
    for (j = 0; j < subdivisions; j++) {
      positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
      positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
      positions[index++] = radii.z * cosPhi[i];
    }
  }
  if (hasInnerSurface) {
    for (i = 0; i < stackPartitions; i++) {
      for (j = 0; j < subdivisions; j++) {
        positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
        positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
        positions[index++] = innerRadii.z * cosPhi[i];
      }
    }
  }
  sinPhi.length = subdivisions;
  cosPhi.length = subdivisions;
  for (i = 0; i < subdivisions; i++) {
    phi = minimumCone + i * (maximumCone - minimumCone) / (subdivisions - 1);
    sinPhi[i] = sin(phi);
    cosPhi[i] = cos(phi);
  }
  sinTheta.length = slicePartitions;
  cosTheta.length = slicePartitions;
  for (i = 0; i < slicePartitions; i++) {
    theta = minimumClock + i * (maximumClock - minimumClock) / (slicePartitions - 1);
    sinTheta[i] = sin(theta);
    cosTheta[i] = cos(theta);
  }
  for (i = 0; i < subdivisions; i++) {
    for (j = 0; j < slicePartitions; j++) {
      positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
      positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
      positions[index++] = radii.z * cosPhi[i];
    }
  }
  if (hasInnerSurface) {
    for (i = 0; i < subdivisions; i++) {
      for (j = 0; j < slicePartitions; j++) {
        positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
        positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
        positions[index++] = innerRadii.z * cosPhi[i];
      }
    }
  }
  index = 0;
  for (i = 0; i < stackPartitions * vertexMultiplier; i++) {
    const topOffset = i * subdivisions;
    for (j = 0; j < subdivisions - 1; j++) {
      indices[index++] = topOffset + j;
      indices[index++] = topOffset + j + 1;
    }
  }
  let offset = stackPartitions * subdivisions * vertexMultiplier;
  for (i = 0; i < slicePartitions; i++) {
    for (j = 0; j < subdivisions - 1; j++) {
      indices[index++] = offset + i + j * slicePartitions;
      indices[index++] = offset + i + (j + 1) * slicePartitions;
    }
  }
  if (hasInnerSurface) {
    offset = stackPartitions * subdivisions * vertexMultiplier + slicePartitions * subdivisions;
    for (i = 0; i < slicePartitions; i++) {
      for (j = 0; j < subdivisions - 1; j++) {
        indices[index++] = offset + i + j * slicePartitions;
        indices[index++] = offset + i + (j + 1) * slicePartitions;
      }
    }
  }
  if (hasInnerSurface) {
    let outerOffset = stackPartitions * subdivisions * vertexMultiplier;
    let innerOffset = outerOffset + subdivisions * slicePartitions;
    if (isTopOpen) {
      for (i = 0; i < slicePartitions; i++) {
        indices[index++] = outerOffset + i;
        indices[index++] = innerOffset + i;
      }
    }
    if (isBotOpen) {
      outerOffset += subdivisions * slicePartitions - slicePartitions;
      innerOffset += subdivisions * slicePartitions - slicePartitions;
      for (i = 0; i < slicePartitions; i++) {
        indices[index++] = outerOffset + i;
        indices[index++] = innerOffset + i;
      }
    }
  }
  const attributes = new GeometryAttributes_default({
    position: new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: positions
    })
  });
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
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere: BoundingSphere_default.fromEllipsoid(ellipsoid),
    offsetAttribute: ellipsoidGeometry._offsetAttribute
  });
};
var EllipsoidOutlineGeometry_default = EllipsoidOutlineGeometry;

export {
  EllipsoidOutlineGeometry_default
};
