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
  EllipseGeometryLibrary_default
} from "./chunk-H52V5EP5.js";
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

// packages/engine/Source/Core/EllipseOutlineGeometry.js
var scratchCartesian1 = new Cartesian3_default();
var boundingSphereCenter = new Cartesian3_default();
function computeEllipse(options) {
  const center = options.center;
  boundingSphereCenter = Cartesian3_default.multiplyByScalar(
    options.ellipsoid.geodeticSurfaceNormal(center, boundingSphereCenter),
    options.height,
    boundingSphereCenter
  );
  boundingSphereCenter = Cartesian3_default.add(
    center,
    boundingSphereCenter,
    boundingSphereCenter
  );
  const boundingSphere = new BoundingSphere_default(
    boundingSphereCenter,
    options.semiMajorAxis
  );
  const positions = EllipseGeometryLibrary_default.computeEllipsePositions(
    options,
    false,
    true
  ).outerPositions;
  const attributes = new GeometryAttributes_default({
    position: new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: EllipseGeometryLibrary_default.raisePositionsToHeight(
        positions,
        options,
        false
      )
    })
  });
  const length = positions.length / 3;
  const indices = IndexDatatype_default.createTypedArray(length, length * 2);
  let index = 0;
  for (let i = 0; i < length; ++i) {
    indices[index++] = i;
    indices[index++] = (i + 1) % length;
  }
  return {
    boundingSphere,
    attributes,
    indices
  };
}
var topBoundingSphere = new BoundingSphere_default();
var bottomBoundingSphere = new BoundingSphere_default();
function computeExtrudedEllipse(options) {
  const center = options.center;
  const ellipsoid = options.ellipsoid;
  const semiMajorAxis = options.semiMajorAxis;
  let scaledNormal = Cartesian3_default.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center, scratchCartesian1),
    options.height,
    scratchCartesian1
  );
  topBoundingSphere.center = Cartesian3_default.add(
    center,
    scaledNormal,
    topBoundingSphere.center
  );
  topBoundingSphere.radius = semiMajorAxis;
  scaledNormal = Cartesian3_default.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center, scaledNormal),
    options.extrudedHeight,
    scaledNormal
  );
  bottomBoundingSphere.center = Cartesian3_default.add(
    center,
    scaledNormal,
    bottomBoundingSphere.center
  );
  bottomBoundingSphere.radius = semiMajorAxis;
  let positions = EllipseGeometryLibrary_default.computeEllipsePositions(
    options,
    false,
    true
  ).outerPositions;
  const attributes = new GeometryAttributes_default({
    position: new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: EllipseGeometryLibrary_default.raisePositionsToHeight(
        positions,
        options,
        true
      )
    })
  });
  positions = attributes.position.values;
  const boundingSphere = BoundingSphere_default.union(
    topBoundingSphere,
    bottomBoundingSphere
  );
  let length = positions.length / 3;
  if (defined_default(options.offsetAttribute)) {
    let applyOffset = new Uint8Array(length);
    if (options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
      applyOffset = applyOffset.fill(1, 0, length / 2);
    } else {
      const offsetValue = options.offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      applyOffset = applyOffset.fill(offsetValue);
    }
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset
    });
  }
  let numberOfVerticalLines = defaultValue_default(options.numberOfVerticalLines, 16);
  numberOfVerticalLines = Math_default.clamp(
    numberOfVerticalLines,
    0,
    length / 2
  );
  const indices = IndexDatatype_default.createTypedArray(
    length,
    length * 2 + numberOfVerticalLines * 2
  );
  length /= 2;
  let index = 0;
  let i;
  for (i = 0; i < length; ++i) {
    indices[index++] = i;
    indices[index++] = (i + 1) % length;
    indices[index++] = i + length;
    indices[index++] = (i + 1) % length + length;
  }
  let numSide;
  if (numberOfVerticalLines > 0) {
    const numSideLines = Math.min(numberOfVerticalLines, length);
    numSide = Math.round(length / numSideLines);
    const maxI = Math.min(numSide * numberOfVerticalLines, length);
    for (i = 0; i < maxI; i += numSide) {
      indices[index++] = i;
      indices[index++] = i + length;
    }
  }
  return {
    boundingSphere,
    attributes,
    indices
  };
}
function EllipseOutlineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const center = options.center;
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  const semiMajorAxis = options.semiMajorAxis;
  const semiMinorAxis = options.semiMinorAxis;
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  if (!defined_default(center)) {
    throw new DeveloperError_default("center is required.");
  }
  if (!defined_default(semiMajorAxis)) {
    throw new DeveloperError_default("semiMajorAxis is required.");
  }
  if (!defined_default(semiMinorAxis)) {
    throw new DeveloperError_default("semiMinorAxis is required.");
  }
  if (semiMajorAxis < semiMinorAxis) {
    throw new DeveloperError_default(
      "semiMajorAxis must be greater than or equal to the semiMinorAxis."
    );
  }
  if (granularity <= 0) {
    throw new DeveloperError_default("granularity must be greater than zero.");
  }
  const height = defaultValue_default(options.height, 0);
  const extrudedHeight = defaultValue_default(options.extrudedHeight, height);
  this._center = Cartesian3_default.clone(center);
  this._semiMajorAxis = semiMajorAxis;
  this._semiMinorAxis = semiMinorAxis;
  this._ellipsoid = Ellipsoid_default.clone(ellipsoid);
  this._rotation = defaultValue_default(options.rotation, 0);
  this._height = Math.max(extrudedHeight, height);
  this._granularity = granularity;
  this._extrudedHeight = Math.min(extrudedHeight, height);
  this._numberOfVerticalLines = Math.max(
    defaultValue_default(options.numberOfVerticalLines, 16),
    0
  );
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createEllipseOutlineGeometry";
}
EllipseOutlineGeometry.packedLength = Cartesian3_default.packedLength + Ellipsoid_default.packedLength + 8;
EllipseOutlineGeometry.pack = function(value, array, startingIndex) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required");
  }
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value._center, array, startingIndex);
  startingIndex += Cartesian3_default.packedLength;
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  array[startingIndex++] = value._semiMajorAxis;
  array[startingIndex++] = value._semiMinorAxis;
  array[startingIndex++] = value._rotation;
  array[startingIndex++] = value._height;
  array[startingIndex++] = value._granularity;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._numberOfVerticalLines;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchCenter = new Cartesian3_default();
var scratchEllipsoid = new Ellipsoid_default();
var scratchOptions = {
  center: scratchCenter,
  ellipsoid: scratchEllipsoid,
  semiMajorAxis: void 0,
  semiMinorAxis: void 0,
  rotation: void 0,
  height: void 0,
  granularity: void 0,
  extrudedHeight: void 0,
  numberOfVerticalLines: void 0,
  offsetAttribute: void 0
};
EllipseOutlineGeometry.unpack = function(array, startingIndex, result) {
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  const center = Cartesian3_default.unpack(array, startingIndex, scratchCenter);
  startingIndex += Cartesian3_default.packedLength;
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const semiMajorAxis = array[startingIndex++];
  const semiMinorAxis = array[startingIndex++];
  const rotation = array[startingIndex++];
  const height = array[startingIndex++];
  const granularity = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const numberOfVerticalLines = array[startingIndex++];
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.height = height;
    scratchOptions.extrudedHeight = extrudedHeight;
    scratchOptions.granularity = granularity;
    scratchOptions.rotation = rotation;
    scratchOptions.semiMajorAxis = semiMajorAxis;
    scratchOptions.semiMinorAxis = semiMinorAxis;
    scratchOptions.numberOfVerticalLines = numberOfVerticalLines;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new EllipseOutlineGeometry(scratchOptions);
  }
  result._center = Cartesian3_default.clone(center, result._center);
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._semiMajorAxis = semiMajorAxis;
  result._semiMinorAxis = semiMinorAxis;
  result._rotation = rotation;
  result._height = height;
  result._granularity = granularity;
  result._extrudedHeight = extrudedHeight;
  result._numberOfVerticalLines = numberOfVerticalLines;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
EllipseOutlineGeometry.createGeometry = function(ellipseGeometry) {
  if (ellipseGeometry._semiMajorAxis <= 0 || ellipseGeometry._semiMinorAxis <= 0) {
    return;
  }
  const height = ellipseGeometry._height;
  const extrudedHeight = ellipseGeometry._extrudedHeight;
  const extrude = !Math_default.equalsEpsilon(
    height,
    extrudedHeight,
    0,
    Math_default.EPSILON2
  );
  ellipseGeometry._center = ellipseGeometry._ellipsoid.scaleToGeodeticSurface(
    ellipseGeometry._center,
    ellipseGeometry._center
  );
  const options = {
    center: ellipseGeometry._center,
    semiMajorAxis: ellipseGeometry._semiMajorAxis,
    semiMinorAxis: ellipseGeometry._semiMinorAxis,
    ellipsoid: ellipseGeometry._ellipsoid,
    rotation: ellipseGeometry._rotation,
    height,
    granularity: ellipseGeometry._granularity,
    numberOfVerticalLines: ellipseGeometry._numberOfVerticalLines
  };
  let geometry;
  if (extrude) {
    options.extrudedHeight = extrudedHeight;
    options.offsetAttribute = ellipseGeometry._offsetAttribute;
    geometry = computeExtrudedEllipse(options);
  } else {
    geometry = computeEllipse(options);
    if (defined_default(ellipseGeometry._offsetAttribute)) {
      const length = geometry.attributes.position.values.length;
      const offsetValue = ellipseGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
      geometry.attributes.applyOffset = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset
      });
    }
  }
  return new Geometry_default({
    attributes: geometry.attributes,
    indices: geometry.indices,
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere: geometry.boundingSphere,
    offsetAttribute: ellipseGeometry._offsetAttribute
  });
};
var EllipseOutlineGeometry_default = EllipseOutlineGeometry;

export {
  EllipseOutlineGeometry_default
};
