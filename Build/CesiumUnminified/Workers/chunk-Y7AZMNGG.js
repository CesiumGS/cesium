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
  GeometryInstance_default
} from "./chunk-G4ABMSHX.js";
import {
  GeometryPipeline_default
} from "./chunk-NMEDZZL7.js";
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
  BoundingSphere_default,
  GeographicProjection_default,
  Quaternion_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/EllipseGeometry.js
var scratchCartesian1 = new Cartesian3_default();
var scratchCartesian2 = new Cartesian3_default();
var scratchCartesian3 = new Cartesian3_default();
var scratchCartesian4 = new Cartesian3_default();
var texCoordScratch = new Cartesian2_default();
var textureMatrixScratch = new Matrix3_default();
var tangentMatrixScratch = new Matrix3_default();
var quaternionScratch = new Quaternion_default();
var scratchNormal = new Cartesian3_default();
var scratchTangent = new Cartesian3_default();
var scratchBitangent = new Cartesian3_default();
var scratchCartographic = new Cartographic_default();
var projectedCenterScratch = new Cartesian3_default();
var scratchMinTexCoord = new Cartesian2_default();
var scratchMaxTexCoord = new Cartesian2_default();
function computeTopBottomAttributes(positions, options, extrude) {
  const vertexFormat = options.vertexFormat;
  const center = options.center;
  const semiMajorAxis = options.semiMajorAxis;
  const semiMinorAxis = options.semiMinorAxis;
  const ellipsoid = options.ellipsoid;
  const stRotation = options.stRotation;
  const size = extrude ? positions.length / 3 * 2 : positions.length / 3;
  const shadowVolume = options.shadowVolume;
  const textureCoordinates = vertexFormat.st ? new Float32Array(size * 2) : void 0;
  const normals = vertexFormat.normal ? new Float32Array(size * 3) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(size * 3) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(size * 3) : void 0;
  const extrudeNormals = shadowVolume ? new Float32Array(size * 3) : void 0;
  let textureCoordIndex = 0;
  let normal = scratchNormal;
  let tangent = scratchTangent;
  let bitangent = scratchBitangent;
  const projection = new GeographicProjection_default(ellipsoid);
  const projectedCenter = projection.project(
    ellipsoid.cartesianToCartographic(center, scratchCartographic),
    projectedCenterScratch
  );
  const geodeticNormal = ellipsoid.scaleToGeodeticSurface(
    center,
    scratchCartesian1
  );
  ellipsoid.geodeticSurfaceNormal(geodeticNormal, geodeticNormal);
  let textureMatrix = textureMatrixScratch;
  let tangentMatrix = tangentMatrixScratch;
  if (stRotation !== 0) {
    let rotation = Quaternion_default.fromAxisAngle(
      geodeticNormal,
      stRotation,
      quaternionScratch
    );
    textureMatrix = Matrix3_default.fromQuaternion(rotation, textureMatrix);
    rotation = Quaternion_default.fromAxisAngle(
      geodeticNormal,
      -stRotation,
      quaternionScratch
    );
    tangentMatrix = Matrix3_default.fromQuaternion(rotation, tangentMatrix);
  } else {
    textureMatrix = Matrix3_default.clone(Matrix3_default.IDENTITY, textureMatrix);
    tangentMatrix = Matrix3_default.clone(Matrix3_default.IDENTITY, tangentMatrix);
  }
  const minTexCoord = Cartesian2_default.fromElements(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    scratchMinTexCoord
  );
  const maxTexCoord = Cartesian2_default.fromElements(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    scratchMaxTexCoord
  );
  let length = positions.length;
  const bottomOffset = extrude ? length : 0;
  const stOffset = bottomOffset / 3 * 2;
  for (let i = 0; i < length; i += 3) {
    const i1 = i + 1;
    const i2 = i + 2;
    const position = Cartesian3_default.fromArray(positions, i, scratchCartesian1);
    if (vertexFormat.st) {
      const rotatedPoint = Matrix3_default.multiplyByVector(
        textureMatrix,
        position,
        scratchCartesian2
      );
      const projectedPoint = projection.project(
        ellipsoid.cartesianToCartographic(rotatedPoint, scratchCartographic),
        scratchCartesian3
      );
      Cartesian3_default.subtract(projectedPoint, projectedCenter, projectedPoint);
      texCoordScratch.x = (projectedPoint.x + semiMajorAxis) / (2 * semiMajorAxis);
      texCoordScratch.y = (projectedPoint.y + semiMinorAxis) / (2 * semiMinorAxis);
      minTexCoord.x = Math.min(texCoordScratch.x, minTexCoord.x);
      minTexCoord.y = Math.min(texCoordScratch.y, minTexCoord.y);
      maxTexCoord.x = Math.max(texCoordScratch.x, maxTexCoord.x);
      maxTexCoord.y = Math.max(texCoordScratch.y, maxTexCoord.y);
      if (extrude) {
        textureCoordinates[textureCoordIndex + stOffset] = texCoordScratch.x;
        textureCoordinates[textureCoordIndex + 1 + stOffset] = texCoordScratch.y;
      }
      textureCoordinates[textureCoordIndex++] = texCoordScratch.x;
      textureCoordinates[textureCoordIndex++] = texCoordScratch.y;
    }
    if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent || shadowVolume) {
      normal = ellipsoid.geodeticSurfaceNormal(position, normal);
      if (shadowVolume) {
        extrudeNormals[i + bottomOffset] = -normal.x;
        extrudeNormals[i1 + bottomOffset] = -normal.y;
        extrudeNormals[i2 + bottomOffset] = -normal.z;
      }
      if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
        if (vertexFormat.tangent || vertexFormat.bitangent) {
          tangent = Cartesian3_default.normalize(
            Cartesian3_default.cross(Cartesian3_default.UNIT_Z, normal, tangent),
            tangent
          );
          Matrix3_default.multiplyByVector(tangentMatrix, tangent, tangent);
        }
        if (vertexFormat.normal) {
          normals[i] = normal.x;
          normals[i1] = normal.y;
          normals[i2] = normal.z;
          if (extrude) {
            normals[i + bottomOffset] = -normal.x;
            normals[i1 + bottomOffset] = -normal.y;
            normals[i2 + bottomOffset] = -normal.z;
          }
        }
        if (vertexFormat.tangent) {
          tangents[i] = tangent.x;
          tangents[i1] = tangent.y;
          tangents[i2] = tangent.z;
          if (extrude) {
            tangents[i + bottomOffset] = -tangent.x;
            tangents[i1 + bottomOffset] = -tangent.y;
            tangents[i2 + bottomOffset] = -tangent.z;
          }
        }
        if (vertexFormat.bitangent) {
          bitangent = Cartesian3_default.normalize(
            Cartesian3_default.cross(normal, tangent, bitangent),
            bitangent
          );
          bitangents[i] = bitangent.x;
          bitangents[i1] = bitangent.y;
          bitangents[i2] = bitangent.z;
          if (extrude) {
            bitangents[i + bottomOffset] = bitangent.x;
            bitangents[i1 + bottomOffset] = bitangent.y;
            bitangents[i2 + bottomOffset] = bitangent.z;
          }
        }
      }
    }
  }
  if (vertexFormat.st) {
    length = textureCoordinates.length;
    for (let k = 0; k < length; k += 2) {
      textureCoordinates[k] = (textureCoordinates[k] - minTexCoord.x) / (maxTexCoord.x - minTexCoord.x);
      textureCoordinates[k + 1] = (textureCoordinates[k + 1] - minTexCoord.y) / (maxTexCoord.y - minTexCoord.y);
    }
  }
  const attributes = new GeometryAttributes_default();
  if (vertexFormat.position) {
    const finalPositions = EllipseGeometryLibrary_default.raisePositionsToHeight(
      positions,
      options,
      extrude
    );
    attributes.position = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: finalPositions
    });
  }
  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: textureCoordinates
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
  if (shadowVolume) {
    attributes.extrudeDirection = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: extrudeNormals
    });
  }
  if (extrude && defined_default(options.offsetAttribute)) {
    let offsetAttribute = new Uint8Array(size);
    if (options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
      offsetAttribute = offsetAttribute.fill(1, 0, size / 2);
    } else {
      const offsetValue = options.offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      offsetAttribute = offsetAttribute.fill(offsetValue);
    }
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: offsetAttribute
    });
  }
  return attributes;
}
function topIndices(numPts) {
  const indices = new Array(12 * (numPts * (numPts + 1)) - 6);
  let indicesIndex = 0;
  let prevIndex;
  let numInterior;
  let positionIndex;
  let i;
  let j;
  prevIndex = 0;
  positionIndex = 1;
  for (i = 0; i < 3; i++) {
    indices[indicesIndex++] = positionIndex++;
    indices[indicesIndex++] = prevIndex;
    indices[indicesIndex++] = positionIndex;
  }
  for (i = 2; i < numPts + 1; ++i) {
    positionIndex = i * (i + 1) - 1;
    prevIndex = (i - 1) * i - 1;
    indices[indicesIndex++] = positionIndex++;
    indices[indicesIndex++] = prevIndex;
    indices[indicesIndex++] = positionIndex;
    numInterior = 2 * i;
    for (j = 0; j < numInterior - 1; ++j) {
      indices[indicesIndex++] = positionIndex;
      indices[indicesIndex++] = prevIndex++;
      indices[indicesIndex++] = prevIndex;
      indices[indicesIndex++] = positionIndex++;
      indices[indicesIndex++] = prevIndex;
      indices[indicesIndex++] = positionIndex;
    }
    indices[indicesIndex++] = positionIndex++;
    indices[indicesIndex++] = prevIndex;
    indices[indicesIndex++] = positionIndex;
  }
  numInterior = numPts * 2;
  ++positionIndex;
  ++prevIndex;
  for (i = 0; i < numInterior - 1; ++i) {
    indices[indicesIndex++] = positionIndex;
    indices[indicesIndex++] = prevIndex++;
    indices[indicesIndex++] = prevIndex;
    indices[indicesIndex++] = positionIndex++;
    indices[indicesIndex++] = prevIndex;
    indices[indicesIndex++] = positionIndex;
  }
  indices[indicesIndex++] = positionIndex;
  indices[indicesIndex++] = prevIndex++;
  indices[indicesIndex++] = prevIndex;
  indices[indicesIndex++] = positionIndex++;
  indices[indicesIndex++] = prevIndex++;
  indices[indicesIndex++] = prevIndex;
  ++prevIndex;
  for (i = numPts - 1; i > 1; --i) {
    indices[indicesIndex++] = prevIndex++;
    indices[indicesIndex++] = prevIndex;
    indices[indicesIndex++] = positionIndex;
    numInterior = 2 * i;
    for (j = 0; j < numInterior - 1; ++j) {
      indices[indicesIndex++] = positionIndex;
      indices[indicesIndex++] = prevIndex++;
      indices[indicesIndex++] = prevIndex;
      indices[indicesIndex++] = positionIndex++;
      indices[indicesIndex++] = prevIndex;
      indices[indicesIndex++] = positionIndex;
    }
    indices[indicesIndex++] = prevIndex++;
    indices[indicesIndex++] = prevIndex++;
    indices[indicesIndex++] = positionIndex++;
  }
  for (i = 0; i < 3; i++) {
    indices[indicesIndex++] = prevIndex++;
    indices[indicesIndex++] = prevIndex;
    indices[indicesIndex++] = positionIndex;
  }
  return indices;
}
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
  const cep = EllipseGeometryLibrary_default.computeEllipsePositions(
    options,
    true,
    false
  );
  const positions = cep.positions;
  const numPts = cep.numPts;
  const attributes = computeTopBottomAttributes(positions, options, false);
  let indices = topIndices(numPts);
  indices = IndexDatatype_default.createTypedArray(positions.length / 3, indices);
  return {
    boundingSphere,
    attributes,
    indices
  };
}
function computeWallAttributes(positions, options) {
  const vertexFormat = options.vertexFormat;
  const center = options.center;
  const semiMajorAxis = options.semiMajorAxis;
  const semiMinorAxis = options.semiMinorAxis;
  const ellipsoid = options.ellipsoid;
  const height = options.height;
  const extrudedHeight = options.extrudedHeight;
  const stRotation = options.stRotation;
  const size = positions.length / 3 * 2;
  const finalPositions = new Float64Array(size * 3);
  const textureCoordinates = vertexFormat.st ? new Float32Array(size * 2) : void 0;
  const normals = vertexFormat.normal ? new Float32Array(size * 3) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(size * 3) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(size * 3) : void 0;
  const shadowVolume = options.shadowVolume;
  const extrudeNormals = shadowVolume ? new Float32Array(size * 3) : void 0;
  let textureCoordIndex = 0;
  let normal = scratchNormal;
  let tangent = scratchTangent;
  let bitangent = scratchBitangent;
  const projection = new GeographicProjection_default(ellipsoid);
  const projectedCenter = projection.project(
    ellipsoid.cartesianToCartographic(center, scratchCartographic),
    projectedCenterScratch
  );
  const geodeticNormal = ellipsoid.scaleToGeodeticSurface(
    center,
    scratchCartesian1
  );
  ellipsoid.geodeticSurfaceNormal(geodeticNormal, geodeticNormal);
  const rotation = Quaternion_default.fromAxisAngle(
    geodeticNormal,
    stRotation,
    quaternionScratch
  );
  const textureMatrix = Matrix3_default.fromQuaternion(rotation, textureMatrixScratch);
  const minTexCoord = Cartesian2_default.fromElements(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    scratchMinTexCoord
  );
  const maxTexCoord = Cartesian2_default.fromElements(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    scratchMaxTexCoord
  );
  let length = positions.length;
  const stOffset = length / 3 * 2;
  for (let i = 0; i < length; i += 3) {
    const i1 = i + 1;
    const i2 = i + 2;
    let position = Cartesian3_default.fromArray(positions, i, scratchCartesian1);
    let extrudedPosition;
    if (vertexFormat.st) {
      const rotatedPoint = Matrix3_default.multiplyByVector(
        textureMatrix,
        position,
        scratchCartesian2
      );
      const projectedPoint = projection.project(
        ellipsoid.cartesianToCartographic(rotatedPoint, scratchCartographic),
        scratchCartesian3
      );
      Cartesian3_default.subtract(projectedPoint, projectedCenter, projectedPoint);
      texCoordScratch.x = (projectedPoint.x + semiMajorAxis) / (2 * semiMajorAxis);
      texCoordScratch.y = (projectedPoint.y + semiMinorAxis) / (2 * semiMinorAxis);
      minTexCoord.x = Math.min(texCoordScratch.x, minTexCoord.x);
      minTexCoord.y = Math.min(texCoordScratch.y, minTexCoord.y);
      maxTexCoord.x = Math.max(texCoordScratch.x, maxTexCoord.x);
      maxTexCoord.y = Math.max(texCoordScratch.y, maxTexCoord.y);
      textureCoordinates[textureCoordIndex + stOffset] = texCoordScratch.x;
      textureCoordinates[textureCoordIndex + 1 + stOffset] = texCoordScratch.y;
      textureCoordinates[textureCoordIndex++] = texCoordScratch.x;
      textureCoordinates[textureCoordIndex++] = texCoordScratch.y;
    }
    position = ellipsoid.scaleToGeodeticSurface(position, position);
    extrudedPosition = Cartesian3_default.clone(position, scratchCartesian2);
    normal = ellipsoid.geodeticSurfaceNormal(position, normal);
    if (shadowVolume) {
      extrudeNormals[i + length] = -normal.x;
      extrudeNormals[i1 + length] = -normal.y;
      extrudeNormals[i2 + length] = -normal.z;
    }
    let scaledNormal = Cartesian3_default.multiplyByScalar(
      normal,
      height,
      scratchCartesian4
    );
    position = Cartesian3_default.add(position, scaledNormal, position);
    scaledNormal = Cartesian3_default.multiplyByScalar(
      normal,
      extrudedHeight,
      scaledNormal
    );
    extrudedPosition = Cartesian3_default.add(
      extrudedPosition,
      scaledNormal,
      extrudedPosition
    );
    if (vertexFormat.position) {
      finalPositions[i + length] = extrudedPosition.x;
      finalPositions[i1 + length] = extrudedPosition.y;
      finalPositions[i2 + length] = extrudedPosition.z;
      finalPositions[i] = position.x;
      finalPositions[i1] = position.y;
      finalPositions[i2] = position.z;
    }
    if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
      bitangent = Cartesian3_default.clone(normal, bitangent);
      const next = Cartesian3_default.fromArray(
        positions,
        (i + 3) % length,
        scratchCartesian4
      );
      Cartesian3_default.subtract(next, position, next);
      const bottom = Cartesian3_default.subtract(
        extrudedPosition,
        position,
        scratchCartesian3
      );
      normal = Cartesian3_default.normalize(
        Cartesian3_default.cross(bottom, next, normal),
        normal
      );
      if (vertexFormat.normal) {
        normals[i] = normal.x;
        normals[i1] = normal.y;
        normals[i2] = normal.z;
        normals[i + length] = normal.x;
        normals[i1 + length] = normal.y;
        normals[i2 + length] = normal.z;
      }
      if (vertexFormat.tangent) {
        tangent = Cartesian3_default.normalize(
          Cartesian3_default.cross(bitangent, normal, tangent),
          tangent
        );
        tangents[i] = tangent.x;
        tangents[i1] = tangent.y;
        tangents[i2] = tangent.z;
        tangents[i + length] = tangent.x;
        tangents[i + 1 + length] = tangent.y;
        tangents[i + 2 + length] = tangent.z;
      }
      if (vertexFormat.bitangent) {
        bitangents[i] = bitangent.x;
        bitangents[i1] = bitangent.y;
        bitangents[i2] = bitangent.z;
        bitangents[i + length] = bitangent.x;
        bitangents[i1 + length] = bitangent.y;
        bitangents[i2 + length] = bitangent.z;
      }
    }
  }
  if (vertexFormat.st) {
    length = textureCoordinates.length;
    for (let k = 0; k < length; k += 2) {
      textureCoordinates[k] = (textureCoordinates[k] - minTexCoord.x) / (maxTexCoord.x - minTexCoord.x);
      textureCoordinates[k + 1] = (textureCoordinates[k + 1] - minTexCoord.y) / (maxTexCoord.y - minTexCoord.y);
    }
  }
  const attributes = new GeometryAttributes_default();
  if (vertexFormat.position) {
    attributes.position = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: finalPositions
    });
  }
  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: textureCoordinates
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
  if (shadowVolume) {
    attributes.extrudeDirection = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: extrudeNormals
    });
  }
  if (defined_default(options.offsetAttribute)) {
    let offsetAttribute = new Uint8Array(size);
    if (options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
      offsetAttribute = offsetAttribute.fill(1, 0, size / 2);
    } else {
      const offsetValue = options.offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      offsetAttribute = offsetAttribute.fill(offsetValue);
    }
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: offsetAttribute
    });
  }
  return attributes;
}
function computeWallIndices(positions) {
  const length = positions.length / 3;
  const indices = IndexDatatype_default.createTypedArray(length, length * 6);
  let index = 0;
  for (let i = 0; i < length; i++) {
    const UL = i;
    const LL = i + length;
    const UR = (UL + 1) % length;
    const LR = UR + length;
    indices[index++] = UL;
    indices[index++] = LL;
    indices[index++] = UR;
    indices[index++] = UR;
    indices[index++] = LL;
    indices[index++] = LR;
  }
  return indices;
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
  const cep = EllipseGeometryLibrary_default.computeEllipsePositions(
    options,
    true,
    true
  );
  const positions = cep.positions;
  const numPts = cep.numPts;
  const outerPositions = cep.outerPositions;
  const boundingSphere = BoundingSphere_default.union(
    topBoundingSphere,
    bottomBoundingSphere
  );
  const topBottomAttributes = computeTopBottomAttributes(
    positions,
    options,
    true
  );
  let indices = topIndices(numPts);
  const length = indices.length;
  indices.length = length * 2;
  const posLength = positions.length / 3;
  for (let i = 0; i < length; i += 3) {
    indices[i + length] = indices[i + 2] + posLength;
    indices[i + 1 + length] = indices[i + 1] + posLength;
    indices[i + 2 + length] = indices[i] + posLength;
  }
  const topBottomIndices = IndexDatatype_default.createTypedArray(
    posLength * 2 / 3,
    indices
  );
  const topBottomGeo = new Geometry_default({
    attributes: topBottomAttributes,
    indices: topBottomIndices,
    primitiveType: PrimitiveType_default.TRIANGLES
  });
  const wallAttributes = computeWallAttributes(outerPositions, options);
  indices = computeWallIndices(outerPositions);
  const wallIndices = IndexDatatype_default.createTypedArray(
    outerPositions.length * 2 / 3,
    indices
  );
  const wallGeo = new Geometry_default({
    attributes: wallAttributes,
    indices: wallIndices,
    primitiveType: PrimitiveType_default.TRIANGLES
  });
  const geo = GeometryPipeline_default.combineInstances([
    new GeometryInstance_default({
      geometry: topBottomGeo
    }),
    new GeometryInstance_default({
      geometry: wallGeo
    })
  ]);
  return {
    boundingSphere,
    attributes: geo[0].attributes,
    indices: geo[0].indices
  };
}
function computeRectangle(center, semiMajorAxis, semiMinorAxis, rotation, granularity, ellipsoid, result) {
  const cep = EllipseGeometryLibrary_default.computeEllipsePositions(
    {
      center,
      semiMajorAxis,
      semiMinorAxis,
      rotation,
      granularity
    },
    false,
    true
  );
  const positionsFlat = cep.outerPositions;
  const positionsCount = positionsFlat.length / 3;
  const positions = new Array(positionsCount);
  for (let i = 0; i < positionsCount; ++i) {
    positions[i] = Cartesian3_default.fromArray(positionsFlat, i * 3);
  }
  const rectangle = Rectangle_default.fromCartesianArray(positions, ellipsoid, result);
  if (rectangle.width > Math_default.PI) {
    rectangle.north = rectangle.north > 0 ? Math_default.PI_OVER_TWO - Math_default.EPSILON7 : rectangle.north;
    rectangle.south = rectangle.south < 0 ? Math_default.EPSILON7 - Math_default.PI_OVER_TWO : rectangle.south;
    rectangle.east = Math_default.PI;
    rectangle.west = -Math_default.PI;
  }
  return rectangle;
}
function EllipseGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const center = options.center;
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  const semiMajorAxis = options.semiMajorAxis;
  const semiMinorAxis = options.semiMinorAxis;
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  Check_default.defined("options.center", center);
  Check_default.typeOf.number("options.semiMajorAxis", semiMajorAxis);
  Check_default.typeOf.number("options.semiMinorAxis", semiMinorAxis);
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
  this._stRotation = defaultValue_default(options.stRotation, 0);
  this._height = Math.max(extrudedHeight, height);
  this._granularity = granularity;
  this._vertexFormat = VertexFormat_default.clone(vertexFormat);
  this._extrudedHeight = Math.min(extrudedHeight, height);
  this._shadowVolume = defaultValue_default(options.shadowVolume, false);
  this._workerName = "createEllipseGeometry";
  this._offsetAttribute = options.offsetAttribute;
  this._rectangle = void 0;
  this._textureCoordinateRotationPoints = void 0;
}
EllipseGeometry.packedLength = Cartesian3_default.packedLength + Ellipsoid_default.packedLength + VertexFormat_default.packedLength + 9;
EllipseGeometry.pack = function(value, array, startingIndex) {
  Check_default.defined("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value._center, array, startingIndex);
  startingIndex += Cartesian3_default.packedLength;
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._semiMajorAxis;
  array[startingIndex++] = value._semiMinorAxis;
  array[startingIndex++] = value._rotation;
  array[startingIndex++] = value._stRotation;
  array[startingIndex++] = value._height;
  array[startingIndex++] = value._granularity;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._shadowVolume ? 1 : 0;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchCenter = new Cartesian3_default();
var scratchEllipsoid = new Ellipsoid_default();
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  center: scratchCenter,
  ellipsoid: scratchEllipsoid,
  vertexFormat: scratchVertexFormat,
  semiMajorAxis: void 0,
  semiMinorAxis: void 0,
  rotation: void 0,
  stRotation: void 0,
  height: void 0,
  granularity: void 0,
  extrudedHeight: void 0,
  shadowVolume: void 0,
  offsetAttribute: void 0
};
EllipseGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const center = Cartesian3_default.unpack(array, startingIndex, scratchCenter);
  startingIndex += Cartesian3_default.packedLength;
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const semiMajorAxis = array[startingIndex++];
  const semiMinorAxis = array[startingIndex++];
  const rotation = array[startingIndex++];
  const stRotation = array[startingIndex++];
  const height = array[startingIndex++];
  const granularity = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const shadowVolume = array[startingIndex++] === 1;
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.height = height;
    scratchOptions.extrudedHeight = extrudedHeight;
    scratchOptions.granularity = granularity;
    scratchOptions.stRotation = stRotation;
    scratchOptions.rotation = rotation;
    scratchOptions.semiMajorAxis = semiMajorAxis;
    scratchOptions.semiMinorAxis = semiMinorAxis;
    scratchOptions.shadowVolume = shadowVolume;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new EllipseGeometry(scratchOptions);
  }
  result._center = Cartesian3_default.clone(center, result._center);
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._semiMajorAxis = semiMajorAxis;
  result._semiMinorAxis = semiMinorAxis;
  result._rotation = rotation;
  result._stRotation = stRotation;
  result._height = height;
  result._granularity = granularity;
  result._extrudedHeight = extrudedHeight;
  result._shadowVolume = shadowVolume;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
EllipseGeometry.computeRectangle = function(options, result) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const center = options.center;
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  const semiMajorAxis = options.semiMajorAxis;
  const semiMinorAxis = options.semiMinorAxis;
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  const rotation = defaultValue_default(options.rotation, 0);
  Check_default.defined("options.center", center);
  Check_default.typeOf.number("options.semiMajorAxis", semiMajorAxis);
  Check_default.typeOf.number("options.semiMinorAxis", semiMinorAxis);
  if (semiMajorAxis < semiMinorAxis) {
    throw new DeveloperError_default(
      "semiMajorAxis must be greater than or equal to the semiMinorAxis."
    );
  }
  if (granularity <= 0) {
    throw new DeveloperError_default("granularity must be greater than zero.");
  }
  return computeRectangle(
    center,
    semiMajorAxis,
    semiMinorAxis,
    rotation,
    granularity,
    ellipsoid,
    result
  );
};
EllipseGeometry.createGeometry = function(ellipseGeometry) {
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
    vertexFormat: ellipseGeometry._vertexFormat,
    stRotation: ellipseGeometry._stRotation
  };
  let geometry;
  if (extrude) {
    options.extrudedHeight = extrudedHeight;
    options.shadowVolume = ellipseGeometry._shadowVolume;
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
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere: geometry.boundingSphere,
    offsetAttribute: ellipseGeometry._offsetAttribute
  });
};
EllipseGeometry.createShadowVolume = function(ellipseGeometry, minHeightFunc, maxHeightFunc) {
  const granularity = ellipseGeometry._granularity;
  const ellipsoid = ellipseGeometry._ellipsoid;
  const minHeight = minHeightFunc(granularity, ellipsoid);
  const maxHeight = maxHeightFunc(granularity, ellipsoid);
  return new EllipseGeometry({
    center: ellipseGeometry._center,
    semiMajorAxis: ellipseGeometry._semiMajorAxis,
    semiMinorAxis: ellipseGeometry._semiMinorAxis,
    ellipsoid,
    rotation: ellipseGeometry._rotation,
    stRotation: ellipseGeometry._stRotation,
    granularity,
    extrudedHeight: minHeight,
    height: maxHeight,
    vertexFormat: VertexFormat_default.POSITION_ONLY,
    shadowVolume: true
  });
};
function textureCoordinateRotationPoints(ellipseGeometry) {
  const stRotation = -ellipseGeometry._stRotation;
  if (stRotation === 0) {
    return [0, 0, 0, 1, 1, 0];
  }
  const cep = EllipseGeometryLibrary_default.computeEllipsePositions(
    {
      center: ellipseGeometry._center,
      semiMajorAxis: ellipseGeometry._semiMajorAxis,
      semiMinorAxis: ellipseGeometry._semiMinorAxis,
      rotation: ellipseGeometry._rotation,
      granularity: ellipseGeometry._granularity
    },
    false,
    true
  );
  const positionsFlat = cep.outerPositions;
  const positionsCount = positionsFlat.length / 3;
  const positions = new Array(positionsCount);
  for (let i = 0; i < positionsCount; ++i) {
    positions[i] = Cartesian3_default.fromArray(positionsFlat, i * 3);
  }
  const ellipsoid = ellipseGeometry._ellipsoid;
  const boundingRectangle = ellipseGeometry.rectangle;
  return Geometry_default._textureCoordinateRotationPoints(
    positions,
    stRotation,
    ellipsoid,
    boundingRectangle
  );
}
Object.defineProperties(EllipseGeometry.prototype, {
  /**
   * @private
   */
  rectangle: {
    get: function() {
      if (!defined_default(this._rectangle)) {
        this._rectangle = computeRectangle(
          this._center,
          this._semiMajorAxis,
          this._semiMinorAxis,
          this._rotation,
          this._granularity,
          this._ellipsoid
        );
      }
      return this._rectangle;
    }
  },
  /**
   * For remapping texture coordinates when rendering EllipseGeometries as GroundPrimitives.
   * @private
   */
  textureCoordinateRotationPoints: {
    get: function() {
      if (!defined_default(this._textureCoordinateRotationPoints)) {
        this._textureCoordinateRotationPoints = textureCoordinateRotationPoints(
          this
        );
      }
      return this._textureCoordinateRotationPoints;
    }
  }
});
var EllipseGeometry_default = EllipseGeometry;

export {
  EllipseGeometry_default
};
