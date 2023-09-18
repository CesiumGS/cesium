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
  BoundingRectangle_default
} from "./chunk-VRK4NS6A.js";
import {
  CoplanarPolygonGeometryLibrary_default
} from "./chunk-BGZ46MRX.js";
import "./chunk-YQGUKCJO.js";
import {
  PolygonGeometryLibrary_default
} from "./chunk-NMQGGKYU.js";
import "./chunk-7ZN7OZXO.js";
import {
  GeometryInstance_default
} from "./chunk-G4ABMSHX.js";
import {
  GeometryPipeline_default
} from "./chunk-NMEDZZL7.js";
import "./chunk-IJT7RSPE.js";
import "./chunk-54JVCS3Y.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
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
  BoundingSphere_default,
  Quaternion_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import {
  Cartesian2_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Ellipsoid_default,
  Matrix3_default
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

// packages/engine/Source/Core/CoplanarPolygonGeometry.js
var scratchPosition = new Cartesian3_default();
var scratchBR = new BoundingRectangle_default();
var stScratch = new Cartesian2_default();
var textureCoordinatesOrigin = new Cartesian2_default();
var scratchNormal = new Cartesian3_default();
var scratchTangent = new Cartesian3_default();
var scratchBitangent = new Cartesian3_default();
var centerScratch = new Cartesian3_default();
var axis1Scratch = new Cartesian3_default();
var axis2Scratch = new Cartesian3_default();
var quaternionScratch = new Quaternion_default();
var textureMatrixScratch = new Matrix3_default();
var tangentRotationScratch = new Matrix3_default();
var surfaceNormalScratch = new Cartesian3_default();
function createGeometryFromPolygon(polygon, vertexFormat, boundingRectangle, stRotation, hardcodedTextureCoordinates, projectPointTo2D, normal, tangent, bitangent) {
  const positions = polygon.positions;
  let indices = PolygonPipeline_default.triangulate(polygon.positions2D, polygon.holes);
  if (indices.length < 3) {
    indices = [0, 1, 2];
  }
  const newIndices = IndexDatatype_default.createTypedArray(
    positions.length,
    indices.length
  );
  newIndices.set(indices);
  let textureMatrix = textureMatrixScratch;
  if (stRotation !== 0) {
    let rotation = Quaternion_default.fromAxisAngle(
      normal,
      stRotation,
      quaternionScratch
    );
    textureMatrix = Matrix3_default.fromQuaternion(rotation, textureMatrix);
    if (vertexFormat.tangent || vertexFormat.bitangent) {
      rotation = Quaternion_default.fromAxisAngle(
        normal,
        -stRotation,
        quaternionScratch
      );
      const tangentRotation = Matrix3_default.fromQuaternion(
        rotation,
        tangentRotationScratch
      );
      tangent = Cartesian3_default.normalize(
        Matrix3_default.multiplyByVector(tangentRotation, tangent, tangent),
        tangent
      );
      if (vertexFormat.bitangent) {
        bitangent = Cartesian3_default.normalize(
          Cartesian3_default.cross(normal, tangent, bitangent),
          bitangent
        );
      }
    }
  } else {
    textureMatrix = Matrix3_default.clone(Matrix3_default.IDENTITY, textureMatrix);
  }
  const stOrigin = textureCoordinatesOrigin;
  if (vertexFormat.st) {
    stOrigin.x = boundingRectangle.x;
    stOrigin.y = boundingRectangle.y;
  }
  const length = positions.length;
  const size = length * 3;
  const flatPositions = new Float64Array(size);
  const normals = vertexFormat.normal ? new Float32Array(size) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(size) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(size) : void 0;
  const textureCoordinates = vertexFormat.st ? new Float32Array(length * 2) : void 0;
  let positionIndex = 0;
  let normalIndex = 0;
  let bitangentIndex = 0;
  let tangentIndex = 0;
  let stIndex = 0;
  for (let i = 0; i < length; i++) {
    const position = positions[i];
    flatPositions[positionIndex++] = position.x;
    flatPositions[positionIndex++] = position.y;
    flatPositions[positionIndex++] = position.z;
    if (vertexFormat.st) {
      if (defined_default(hardcodedTextureCoordinates) && hardcodedTextureCoordinates.positions.length === length) {
        textureCoordinates[stIndex++] = hardcodedTextureCoordinates.positions[i].x;
        textureCoordinates[stIndex++] = hardcodedTextureCoordinates.positions[i].y;
      } else {
        const p = Matrix3_default.multiplyByVector(
          textureMatrix,
          position,
          scratchPosition
        );
        const st = projectPointTo2D(p, stScratch);
        Cartesian2_default.subtract(st, stOrigin, st);
        const stx = Math_default.clamp(st.x / boundingRectangle.width, 0, 1);
        const sty = Math_default.clamp(st.y / boundingRectangle.height, 0, 1);
        textureCoordinates[stIndex++] = stx;
        textureCoordinates[stIndex++] = sty;
      }
    }
    if (vertexFormat.normal) {
      normals[normalIndex++] = normal.x;
      normals[normalIndex++] = normal.y;
      normals[normalIndex++] = normal.z;
    }
    if (vertexFormat.tangent) {
      tangents[tangentIndex++] = tangent.x;
      tangents[tangentIndex++] = tangent.y;
      tangents[tangentIndex++] = tangent.z;
    }
    if (vertexFormat.bitangent) {
      bitangents[bitangentIndex++] = bitangent.x;
      bitangents[bitangentIndex++] = bitangent.y;
      bitangents[bitangentIndex++] = bitangent.z;
    }
  }
  const attributes = new GeometryAttributes_default();
  if (vertexFormat.position) {
    attributes.position = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: flatPositions
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
  return new Geometry_default({
    attributes,
    indices: newIndices,
    primitiveType: PrimitiveType_default.TRIANGLES
  });
}
function CoplanarPolygonGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const polygonHierarchy = options.polygonHierarchy;
  const textureCoordinates = options.textureCoordinates;
  Check_default.defined("options.polygonHierarchy", polygonHierarchy);
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  this._vertexFormat = VertexFormat_default.clone(vertexFormat);
  this._polygonHierarchy = polygonHierarchy;
  this._stRotation = defaultValue_default(options.stRotation, 0);
  this._ellipsoid = Ellipsoid_default.clone(
    defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84)
  );
  this._workerName = "createCoplanarPolygonGeometry";
  this._textureCoordinates = textureCoordinates;
  this.packedLength = PolygonGeometryLibrary_default.computeHierarchyPackedLength(
    polygonHierarchy,
    Cartesian3_default
  ) + VertexFormat_default.packedLength + Ellipsoid_default.packedLength + (defined_default(textureCoordinates) ? PolygonGeometryLibrary_default.computeHierarchyPackedLength(
    textureCoordinates,
    Cartesian2_default
  ) : 1) + 2;
}
CoplanarPolygonGeometry.fromPositions = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.defined("options.positions", options.positions);
  const newOptions = {
    polygonHierarchy: {
      positions: options.positions
    },
    vertexFormat: options.vertexFormat,
    stRotation: options.stRotation,
    ellipsoid: options.ellipsoid,
    textureCoordinates: options.textureCoordinates
  };
  return new CoplanarPolygonGeometry(newOptions);
};
CoplanarPolygonGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  startingIndex = PolygonGeometryLibrary_default.packPolygonHierarchy(
    value._polygonHierarchy,
    array,
    startingIndex,
    Cartesian3_default
  );
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._stRotation;
  if (defined_default(value._textureCoordinates)) {
    startingIndex = PolygonGeometryLibrary_default.packPolygonHierarchy(
      value._textureCoordinates,
      array,
      startingIndex,
      Cartesian2_default
    );
  } else {
    array[startingIndex++] = -1;
  }
  array[startingIndex++] = value.packedLength;
  return array;
};
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  polygonHierarchy: {}
};
CoplanarPolygonGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const polygonHierarchy = PolygonGeometryLibrary_default.unpackPolygonHierarchy(
    array,
    startingIndex,
    Cartesian3_default
  );
  startingIndex = polygonHierarchy.startingIndex;
  delete polygonHierarchy.startingIndex;
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const stRotation = array[startingIndex++];
  const textureCoordinates = array[startingIndex] === -1 ? void 0 : PolygonGeometryLibrary_default.unpackPolygonHierarchy(
    array,
    startingIndex,
    Cartesian2_default
  );
  if (defined_default(textureCoordinates)) {
    startingIndex = textureCoordinates.startingIndex;
    delete textureCoordinates.startingIndex;
  } else {
    startingIndex++;
  }
  const packedLength = array[startingIndex++];
  if (!defined_default(result)) {
    result = new CoplanarPolygonGeometry(scratchOptions);
  }
  result._polygonHierarchy = polygonHierarchy;
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._stRotation = stRotation;
  result._textureCoordinates = textureCoordinates;
  result.packedLength = packedLength;
  return result;
};
CoplanarPolygonGeometry.createGeometry = function(polygonGeometry) {
  const vertexFormat = polygonGeometry._vertexFormat;
  const polygonHierarchy = polygonGeometry._polygonHierarchy;
  const stRotation = polygonGeometry._stRotation;
  const textureCoordinates = polygonGeometry._textureCoordinates;
  const hasTextureCoordinates = defined_default(textureCoordinates);
  let outerPositions = polygonHierarchy.positions;
  outerPositions = arrayRemoveDuplicates_default(
    outerPositions,
    Cartesian3_default.equalsEpsilon,
    true
  );
  if (outerPositions.length < 3) {
    return;
  }
  let normal = scratchNormal;
  let tangent = scratchTangent;
  let bitangent = scratchBitangent;
  let axis1 = axis1Scratch;
  const axis2 = axis2Scratch;
  const validGeometry = CoplanarPolygonGeometryLibrary_default.computeProjectTo2DArguments(
    outerPositions,
    centerScratch,
    axis1,
    axis2
  );
  if (!validGeometry) {
    return void 0;
  }
  normal = Cartesian3_default.cross(axis1, axis2, normal);
  normal = Cartesian3_default.normalize(normal, normal);
  if (!Cartesian3_default.equalsEpsilon(
    centerScratch,
    Cartesian3_default.ZERO,
    Math_default.EPSILON6
  )) {
    const surfaceNormal = polygonGeometry._ellipsoid.geodeticSurfaceNormal(
      centerScratch,
      surfaceNormalScratch
    );
    if (Cartesian3_default.dot(normal, surfaceNormal) < 0) {
      normal = Cartesian3_default.negate(normal, normal);
      axis1 = Cartesian3_default.negate(axis1, axis1);
    }
  }
  const projectPoints = CoplanarPolygonGeometryLibrary_default.createProjectPointsTo2DFunction(
    centerScratch,
    axis1,
    axis2
  );
  const projectPoint = CoplanarPolygonGeometryLibrary_default.createProjectPointTo2DFunction(
    centerScratch,
    axis1,
    axis2
  );
  if (vertexFormat.tangent) {
    tangent = Cartesian3_default.clone(axis1, tangent);
  }
  if (vertexFormat.bitangent) {
    bitangent = Cartesian3_default.clone(axis2, bitangent);
  }
  const results = PolygonGeometryLibrary_default.polygonsFromHierarchy(
    polygonHierarchy,
    hasTextureCoordinates,
    projectPoints,
    false
  );
  const hierarchy = results.hierarchy;
  const polygons = results.polygons;
  const dummyFunction = function(identity) {
    return identity;
  };
  const textureCoordinatePolygons = hasTextureCoordinates ? PolygonGeometryLibrary_default.polygonsFromHierarchy(
    textureCoordinates,
    true,
    dummyFunction,
    false
  ).polygons : void 0;
  if (hierarchy.length === 0) {
    return;
  }
  outerPositions = hierarchy[0].outerRing;
  const boundingSphere = BoundingSphere_default.fromPoints(outerPositions);
  const boundingRectangle = PolygonGeometryLibrary_default.computeBoundingRectangle(
    normal,
    projectPoint,
    outerPositions,
    stRotation,
    scratchBR
  );
  const geometries = [];
  for (let i = 0; i < polygons.length; i++) {
    const geometryInstance = new GeometryInstance_default({
      geometry: createGeometryFromPolygon(
        polygons[i],
        vertexFormat,
        boundingRectangle,
        stRotation,
        hasTextureCoordinates ? textureCoordinatePolygons[i] : void 0,
        projectPoint,
        normal,
        tangent,
        bitangent
      )
    });
    geometries.push(geometryInstance);
  }
  const geometry = GeometryPipeline_default.combineInstances(geometries)[0];
  geometry.attributes.position.values = new Float64Array(
    geometry.attributes.position.values
  );
  geometry.indices = IndexDatatype_default.createTypedArray(
    geometry.attributes.position.values.length / 3,
    geometry.indices
  );
  const attributes = geometry.attributes;
  if (!vertexFormat.position) {
    delete attributes.position;
  }
  return new Geometry_default({
    attributes,
    indices: geometry.indices,
    primitiveType: geometry.primitiveType,
    boundingSphere
  });
};
var CoplanarPolygonGeometry_default = CoplanarPolygonGeometry;

// packages/engine/Source/Workers/createCoplanarPolygonGeometry.js
function createCoplanarPolygonGeometry(polygonGeometry, offset) {
  if (defined_default(offset)) {
    polygonGeometry = CoplanarPolygonGeometry_default.unpack(polygonGeometry, offset);
  }
  return CoplanarPolygonGeometry_default.createGeometry(polygonGeometry);
}
var createCoplanarPolygonGeometry_default = createCoplanarPolygonGeometry;
export {
  createCoplanarPolygonGeometry_default as default
};
