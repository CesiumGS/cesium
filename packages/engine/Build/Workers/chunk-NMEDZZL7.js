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
  AttributeCompression_default
} from "./chunk-IJT7RSPE.js";
import {
  EncodedCartesian3_default
} from "./chunk-54JVCS3Y.js";
import {
  IntersectionTests_default
} from "./chunk-MKJM6R4K.js";
import {
  Plane_default
} from "./chunk-PY3JQBWU.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  GeometryAttribute_default,
  GeometryType_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default,
  GeographicProjection_default,
  Intersect_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default,
  Cartesian4_default,
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
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

// packages/engine/Source/Core/barycentricCoordinates.js
var scratchCartesian1 = new Cartesian3_default();
var scratchCartesian2 = new Cartesian3_default();
var scratchCartesian3 = new Cartesian3_default();
function barycentricCoordinates(point, p0, p1, p2, result) {
  Check_default.defined("point", point);
  Check_default.defined("p0", p0);
  Check_default.defined("p1", p1);
  Check_default.defined("p2", p2);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  let v02;
  let v12;
  let v22;
  let dot00;
  let dot01;
  let dot02;
  let dot11;
  let dot12;
  if (!defined_default(p0.z)) {
    if (Cartesian2_default.equalsEpsilon(point, p0, Math_default.EPSILON14)) {
      return Cartesian3_default.clone(Cartesian3_default.UNIT_X, result);
    }
    if (Cartesian2_default.equalsEpsilon(point, p1, Math_default.EPSILON14)) {
      return Cartesian3_default.clone(Cartesian3_default.UNIT_Y, result);
    }
    if (Cartesian2_default.equalsEpsilon(point, p2, Math_default.EPSILON14)) {
      return Cartesian3_default.clone(Cartesian3_default.UNIT_Z, result);
    }
    v02 = Cartesian2_default.subtract(p1, p0, scratchCartesian1);
    v12 = Cartesian2_default.subtract(p2, p0, scratchCartesian2);
    v22 = Cartesian2_default.subtract(point, p0, scratchCartesian3);
    dot00 = Cartesian2_default.dot(v02, v02);
    dot01 = Cartesian2_default.dot(v02, v12);
    dot02 = Cartesian2_default.dot(v02, v22);
    dot11 = Cartesian2_default.dot(v12, v12);
    dot12 = Cartesian2_default.dot(v12, v22);
  } else {
    if (Cartesian3_default.equalsEpsilon(point, p0, Math_default.EPSILON14)) {
      return Cartesian3_default.clone(Cartesian3_default.UNIT_X, result);
    }
    if (Cartesian3_default.equalsEpsilon(point, p1, Math_default.EPSILON14)) {
      return Cartesian3_default.clone(Cartesian3_default.UNIT_Y, result);
    }
    if (Cartesian3_default.equalsEpsilon(point, p2, Math_default.EPSILON14)) {
      return Cartesian3_default.clone(Cartesian3_default.UNIT_Z, result);
    }
    v02 = Cartesian3_default.subtract(p1, p0, scratchCartesian1);
    v12 = Cartesian3_default.subtract(p2, p0, scratchCartesian2);
    v22 = Cartesian3_default.subtract(point, p0, scratchCartesian3);
    dot00 = Cartesian3_default.dot(v02, v02);
    dot01 = Cartesian3_default.dot(v02, v12);
    dot02 = Cartesian3_default.dot(v02, v22);
    dot11 = Cartesian3_default.dot(v12, v12);
    dot12 = Cartesian3_default.dot(v12, v22);
  }
  result.y = dot11 * dot02 - dot01 * dot12;
  result.z = dot00 * dot12 - dot01 * dot02;
  const q = dot00 * dot11 - dot01 * dot01;
  if (q === 0) {
    return void 0;
  }
  result.y /= q;
  result.z /= q;
  result.x = 1 - result.y - result.z;
  return result;
}
var barycentricCoordinates_default = barycentricCoordinates;

// packages/engine/Source/Core/Tipsify.js
var Tipsify = {};
Tipsify.calculateACMR = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const indices = options.indices;
  let maximumIndex = options.maximumIndex;
  const cacheSize = defaultValue_default(options.cacheSize, 24);
  if (!defined_default(indices)) {
    throw new DeveloperError_default("indices is required.");
  }
  const numIndices = indices.length;
  if (numIndices < 3 || numIndices % 3 !== 0) {
    throw new DeveloperError_default("indices length must be a multiple of three.");
  }
  if (maximumIndex <= 0) {
    throw new DeveloperError_default("maximumIndex must be greater than zero.");
  }
  if (cacheSize < 3) {
    throw new DeveloperError_default("cacheSize must be greater than two.");
  }
  if (!defined_default(maximumIndex)) {
    maximumIndex = 0;
    let currentIndex = 0;
    let intoIndices = indices[currentIndex];
    while (currentIndex < numIndices) {
      if (intoIndices > maximumIndex) {
        maximumIndex = intoIndices;
      }
      ++currentIndex;
      intoIndices = indices[currentIndex];
    }
  }
  const vertexTimeStamps = [];
  for (let i = 0; i < maximumIndex + 1; i++) {
    vertexTimeStamps[i] = 0;
  }
  let s = cacheSize + 1;
  for (let j = 0; j < numIndices; ++j) {
    if (s - vertexTimeStamps[indices[j]] > cacheSize) {
      vertexTimeStamps[indices[j]] = s;
      ++s;
    }
  }
  return (s - cacheSize + 1) / (numIndices / 3);
};
Tipsify.tipsify = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const indices = options.indices;
  const maximumIndex = options.maximumIndex;
  const cacheSize = defaultValue_default(options.cacheSize, 24);
  let cursor;
  function skipDeadEnd(vertices2, deadEnd2, indices2, maximumIndexPlusOne2) {
    while (deadEnd2.length >= 1) {
      const d = deadEnd2[deadEnd2.length - 1];
      deadEnd2.splice(deadEnd2.length - 1, 1);
      if (vertices2[d].numLiveTriangles > 0) {
        return d;
      }
    }
    while (cursor < maximumIndexPlusOne2) {
      if (vertices2[cursor].numLiveTriangles > 0) {
        ++cursor;
        return cursor - 1;
      }
      ++cursor;
    }
    return -1;
  }
  function getNextVertex(indices2, cacheSize2, oneRing2, vertices2, s2, deadEnd2, maximumIndexPlusOne2) {
    let n = -1;
    let p;
    let m = -1;
    let itOneRing = 0;
    while (itOneRing < oneRing2.length) {
      const index2 = oneRing2[itOneRing];
      if (vertices2[index2].numLiveTriangles) {
        p = 0;
        if (s2 - vertices2[index2].timeStamp + 2 * vertices2[index2].numLiveTriangles <= cacheSize2) {
          p = s2 - vertices2[index2].timeStamp;
        }
        if (p > m || m === -1) {
          m = p;
          n = index2;
        }
      }
      ++itOneRing;
    }
    if (n === -1) {
      return skipDeadEnd(vertices2, deadEnd2, indices2, maximumIndexPlusOne2);
    }
    return n;
  }
  if (!defined_default(indices)) {
    throw new DeveloperError_default("indices is required.");
  }
  const numIndices = indices.length;
  if (numIndices < 3 || numIndices % 3 !== 0) {
    throw new DeveloperError_default("indices length must be a multiple of three.");
  }
  if (maximumIndex <= 0) {
    throw new DeveloperError_default("maximumIndex must be greater than zero.");
  }
  if (cacheSize < 3) {
    throw new DeveloperError_default("cacheSize must be greater than two.");
  }
  let maximumIndexPlusOne = 0;
  let currentIndex = 0;
  let intoIndices = indices[currentIndex];
  const endIndex = numIndices;
  if (defined_default(maximumIndex)) {
    maximumIndexPlusOne = maximumIndex + 1;
  } else {
    while (currentIndex < endIndex) {
      if (intoIndices > maximumIndexPlusOne) {
        maximumIndexPlusOne = intoIndices;
      }
      ++currentIndex;
      intoIndices = indices[currentIndex];
    }
    if (maximumIndexPlusOne === -1) {
      return 0;
    }
    ++maximumIndexPlusOne;
  }
  const vertices = [];
  let i;
  for (i = 0; i < maximumIndexPlusOne; i++) {
    vertices[i] = {
      numLiveTriangles: 0,
      timeStamp: 0,
      vertexTriangles: []
    };
  }
  currentIndex = 0;
  let triangle = 0;
  while (currentIndex < endIndex) {
    vertices[indices[currentIndex]].vertexTriangles.push(triangle);
    ++vertices[indices[currentIndex]].numLiveTriangles;
    vertices[indices[currentIndex + 1]].vertexTriangles.push(triangle);
    ++vertices[indices[currentIndex + 1]].numLiveTriangles;
    vertices[indices[currentIndex + 2]].vertexTriangles.push(triangle);
    ++vertices[indices[currentIndex + 2]].numLiveTriangles;
    ++triangle;
    currentIndex += 3;
  }
  let f = 0;
  let s = cacheSize + 1;
  cursor = 1;
  let oneRing = [];
  const deadEnd = [];
  let vertex;
  let intoVertices;
  let currentOutputIndex = 0;
  const outputIndices = [];
  const numTriangles = numIndices / 3;
  const triangleEmitted = [];
  for (i = 0; i < numTriangles; i++) {
    triangleEmitted[i] = false;
  }
  let index;
  let limit;
  while (f !== -1) {
    oneRing = [];
    intoVertices = vertices[f];
    limit = intoVertices.vertexTriangles.length;
    for (let k = 0; k < limit; ++k) {
      triangle = intoVertices.vertexTriangles[k];
      if (!triangleEmitted[triangle]) {
        triangleEmitted[triangle] = true;
        currentIndex = triangle + triangle + triangle;
        for (let j = 0; j < 3; ++j) {
          index = indices[currentIndex];
          oneRing.push(index);
          deadEnd.push(index);
          outputIndices[currentOutputIndex] = index;
          ++currentOutputIndex;
          vertex = vertices[index];
          --vertex.numLiveTriangles;
          if (s - vertex.timeStamp > cacheSize) {
            vertex.timeStamp = s;
            ++s;
          }
          ++currentIndex;
        }
      }
    }
    f = getNextVertex(
      indices,
      cacheSize,
      oneRing,
      vertices,
      s,
      deadEnd,
      maximumIndexPlusOne
    );
  }
  return outputIndices;
};
var Tipsify_default = Tipsify;

// packages/engine/Source/Core/GeometryPipeline.js
var GeometryPipeline = {};
function addTriangle(lines, index, i0, i1, i2) {
  lines[index++] = i0;
  lines[index++] = i1;
  lines[index++] = i1;
  lines[index++] = i2;
  lines[index++] = i2;
  lines[index] = i0;
}
function trianglesToLines(triangles) {
  const count = triangles.length;
  const size = count / 3 * 6;
  const lines = IndexDatatype_default.createTypedArray(count, size);
  let index = 0;
  for (let i = 0; i < count; i += 3, index += 6) {
    addTriangle(lines, index, triangles[i], triangles[i + 1], triangles[i + 2]);
  }
  return lines;
}
function triangleStripToLines(triangles) {
  const count = triangles.length;
  if (count >= 3) {
    const size = (count - 2) * 6;
    const lines = IndexDatatype_default.createTypedArray(count, size);
    addTriangle(lines, 0, triangles[0], triangles[1], triangles[2]);
    let index = 6;
    for (let i = 3; i < count; ++i, index += 6) {
      addTriangle(
        lines,
        index,
        triangles[i - 1],
        triangles[i],
        triangles[i - 2]
      );
    }
    return lines;
  }
  return new Uint16Array();
}
function triangleFanToLines(triangles) {
  if (triangles.length > 0) {
    const count = triangles.length - 1;
    const size = (count - 1) * 6;
    const lines = IndexDatatype_default.createTypedArray(count, size);
    const base = triangles[0];
    let index = 0;
    for (let i = 1; i < count; ++i, index += 6) {
      addTriangle(lines, index, base, triangles[i], triangles[i + 1]);
    }
    return lines;
  }
  return new Uint16Array();
}
GeometryPipeline.toWireframe = function(geometry) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  const indices = geometry.indices;
  if (defined_default(indices)) {
    switch (geometry.primitiveType) {
      case PrimitiveType_default.TRIANGLES:
        geometry.indices = trianglesToLines(indices);
        break;
      case PrimitiveType_default.TRIANGLE_STRIP:
        geometry.indices = triangleStripToLines(indices);
        break;
      case PrimitiveType_default.TRIANGLE_FAN:
        geometry.indices = triangleFanToLines(indices);
        break;
      default:
        throw new DeveloperError_default(
          "geometry.primitiveType must be TRIANGLES, TRIANGLE_STRIP, or TRIANGLE_FAN."
        );
    }
    geometry.primitiveType = PrimitiveType_default.LINES;
  }
  return geometry;
};
GeometryPipeline.createLineSegmentsForVectors = function(geometry, attributeName, length) {
  attributeName = defaultValue_default(attributeName, "normal");
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  if (!defined_default(geometry.attributes.position)) {
    throw new DeveloperError_default("geometry.attributes.position is required.");
  }
  if (!defined_default(geometry.attributes[attributeName])) {
    throw new DeveloperError_default(
      `geometry.attributes must have an attribute with the same name as the attributeName parameter, ${attributeName}.`
    );
  }
  length = defaultValue_default(length, 1e4);
  const positions = geometry.attributes.position.values;
  const vectors = geometry.attributes[attributeName].values;
  const positionsLength = positions.length;
  const newPositions = new Float64Array(2 * positionsLength);
  let j = 0;
  for (let i = 0; i < positionsLength; i += 3) {
    newPositions[j++] = positions[i];
    newPositions[j++] = positions[i + 1];
    newPositions[j++] = positions[i + 2];
    newPositions[j++] = positions[i] + vectors[i] * length;
    newPositions[j++] = positions[i + 1] + vectors[i + 1] * length;
    newPositions[j++] = positions[i + 2] + vectors[i + 2] * length;
  }
  let newBoundingSphere;
  const bs = geometry.boundingSphere;
  if (defined_default(bs)) {
    newBoundingSphere = new BoundingSphere_default(bs.center, bs.radius + length);
  }
  return new Geometry_default({
    attributes: {
      position: new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.DOUBLE,
        componentsPerAttribute: 3,
        values: newPositions
      })
    },
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere: newBoundingSphere
  });
};
GeometryPipeline.createAttributeLocations = function(geometry) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  const semantics = [
    "position",
    "positionHigh",
    "positionLow",
    // From VertexFormat.position - after 2D projection and high-precision encoding
    "position3DHigh",
    "position3DLow",
    "position2DHigh",
    "position2DLow",
    // From Primitive
    "pickColor",
    // From VertexFormat
    "normal",
    "st",
    "tangent",
    "bitangent",
    // For shadow volumes
    "extrudeDirection",
    // From compressing texture coordinates and normals
    "compressedAttributes"
  ];
  const attributes = geometry.attributes;
  const indices = {};
  let j = 0;
  let i;
  const len = semantics.length;
  for (i = 0; i < len; ++i) {
    const semantic = semantics[i];
    if (defined_default(attributes[semantic])) {
      indices[semantic] = j++;
    }
  }
  for (const name in attributes) {
    if (attributes.hasOwnProperty(name) && !defined_default(indices[name])) {
      indices[name] = j++;
    }
  }
  return indices;
};
GeometryPipeline.reorderForPreVertexCache = function(geometry) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  const numVertices = Geometry_default.computeNumberOfVertices(geometry);
  const indices = geometry.indices;
  if (defined_default(indices)) {
    const indexCrossReferenceOldToNew = new Int32Array(numVertices);
    for (let i = 0; i < numVertices; i++) {
      indexCrossReferenceOldToNew[i] = -1;
    }
    const indicesIn = indices;
    const numIndices = indicesIn.length;
    const indicesOut = IndexDatatype_default.createTypedArray(numVertices, numIndices);
    let intoIndicesIn = 0;
    let intoIndicesOut = 0;
    let nextIndex = 0;
    let tempIndex;
    while (intoIndicesIn < numIndices) {
      tempIndex = indexCrossReferenceOldToNew[indicesIn[intoIndicesIn]];
      if (tempIndex !== -1) {
        indicesOut[intoIndicesOut] = tempIndex;
      } else {
        tempIndex = indicesIn[intoIndicesIn];
        indexCrossReferenceOldToNew[tempIndex] = nextIndex;
        indicesOut[intoIndicesOut] = nextIndex;
        ++nextIndex;
      }
      ++intoIndicesIn;
      ++intoIndicesOut;
    }
    geometry.indices = indicesOut;
    const attributes = geometry.attributes;
    for (const property in attributes) {
      if (attributes.hasOwnProperty(property) && defined_default(attributes[property]) && defined_default(attributes[property].values)) {
        const attribute = attributes[property];
        const elementsIn = attribute.values;
        let intoElementsIn = 0;
        const numComponents = attribute.componentsPerAttribute;
        const elementsOut = ComponentDatatype_default.createTypedArray(
          attribute.componentDatatype,
          nextIndex * numComponents
        );
        while (intoElementsIn < numVertices) {
          const temp = indexCrossReferenceOldToNew[intoElementsIn];
          if (temp !== -1) {
            for (let j = 0; j < numComponents; j++) {
              elementsOut[numComponents * temp + j] = elementsIn[numComponents * intoElementsIn + j];
            }
          }
          ++intoElementsIn;
        }
        attribute.values = elementsOut;
      }
    }
  }
  return geometry;
};
GeometryPipeline.reorderForPostVertexCache = function(geometry, cacheCapacity) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  const indices = geometry.indices;
  if (geometry.primitiveType === PrimitiveType_default.TRIANGLES && defined_default(indices)) {
    const numIndices = indices.length;
    let maximumIndex = 0;
    for (let j = 0; j < numIndices; j++) {
      if (indices[j] > maximumIndex) {
        maximumIndex = indices[j];
      }
    }
    geometry.indices = Tipsify_default.tipsify({
      indices,
      maximumIndex,
      cacheSize: cacheCapacity
    });
  }
  return geometry;
};
function copyAttributesDescriptions(attributes) {
  const newAttributes = {};
  for (const attribute in attributes) {
    if (attributes.hasOwnProperty(attribute) && defined_default(attributes[attribute]) && defined_default(attributes[attribute].values)) {
      const attr = attributes[attribute];
      newAttributes[attribute] = new GeometryAttribute_default({
        componentDatatype: attr.componentDatatype,
        componentsPerAttribute: attr.componentsPerAttribute,
        normalize: attr.normalize,
        values: []
      });
    }
  }
  return newAttributes;
}
function copyVertex(destinationAttributes, sourceAttributes, index) {
  for (const attribute in sourceAttributes) {
    if (sourceAttributes.hasOwnProperty(attribute) && defined_default(sourceAttributes[attribute]) && defined_default(sourceAttributes[attribute].values)) {
      const attr = sourceAttributes[attribute];
      for (let k = 0; k < attr.componentsPerAttribute; ++k) {
        destinationAttributes[attribute].values.push(
          attr.values[index * attr.componentsPerAttribute + k]
        );
      }
    }
  }
}
GeometryPipeline.fitToUnsignedShortIndices = function(geometry) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  if (defined_default(geometry.indices) && geometry.primitiveType !== PrimitiveType_default.TRIANGLES && geometry.primitiveType !== PrimitiveType_default.LINES && geometry.primitiveType !== PrimitiveType_default.POINTS) {
    throw new DeveloperError_default(
      "geometry.primitiveType must equal to PrimitiveType.TRIANGLES, PrimitiveType.LINES, or PrimitiveType.POINTS."
    );
  }
  const geometries = [];
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  if (defined_default(geometry.indices) && numberOfVertices >= Math_default.SIXTY_FOUR_KILOBYTES) {
    let oldToNewIndex = [];
    let newIndices = [];
    let currentIndex = 0;
    let newAttributes = copyAttributesDescriptions(geometry.attributes);
    const originalIndices = geometry.indices;
    const numberOfIndices = originalIndices.length;
    let indicesPerPrimitive;
    if (geometry.primitiveType === PrimitiveType_default.TRIANGLES) {
      indicesPerPrimitive = 3;
    } else if (geometry.primitiveType === PrimitiveType_default.LINES) {
      indicesPerPrimitive = 2;
    } else if (geometry.primitiveType === PrimitiveType_default.POINTS) {
      indicesPerPrimitive = 1;
    }
    for (let j = 0; j < numberOfIndices; j += indicesPerPrimitive) {
      for (let k = 0; k < indicesPerPrimitive; ++k) {
        const x = originalIndices[j + k];
        let i = oldToNewIndex[x];
        if (!defined_default(i)) {
          i = currentIndex++;
          oldToNewIndex[x] = i;
          copyVertex(newAttributes, geometry.attributes, x);
        }
        newIndices.push(i);
      }
      if (currentIndex + indicesPerPrimitive >= Math_default.SIXTY_FOUR_KILOBYTES) {
        geometries.push(
          new Geometry_default({
            attributes: newAttributes,
            indices: newIndices,
            primitiveType: geometry.primitiveType,
            boundingSphere: geometry.boundingSphere,
            boundingSphereCV: geometry.boundingSphereCV
          })
        );
        oldToNewIndex = [];
        newIndices = [];
        currentIndex = 0;
        newAttributes = copyAttributesDescriptions(geometry.attributes);
      }
    }
    if (newIndices.length !== 0) {
      geometries.push(
        new Geometry_default({
          attributes: newAttributes,
          indices: newIndices,
          primitiveType: geometry.primitiveType,
          boundingSphere: geometry.boundingSphere,
          boundingSphereCV: geometry.boundingSphereCV
        })
      );
    }
  } else {
    geometries.push(geometry);
  }
  return geometries;
};
var scratchProjectTo2DCartesian3 = new Cartesian3_default();
var scratchProjectTo2DCartographic = new Cartographic_default();
GeometryPipeline.projectTo2D = function(geometry, attributeName, attributeName3D, attributeName2D, projection) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  if (!defined_default(attributeName)) {
    throw new DeveloperError_default("attributeName is required.");
  }
  if (!defined_default(attributeName3D)) {
    throw new DeveloperError_default("attributeName3D is required.");
  }
  if (!defined_default(attributeName2D)) {
    throw new DeveloperError_default("attributeName2D is required.");
  }
  if (!defined_default(geometry.attributes[attributeName])) {
    throw new DeveloperError_default(
      `geometry must have attribute matching the attributeName argument: ${attributeName}.`
    );
  }
  if (geometry.attributes[attributeName].componentDatatype !== ComponentDatatype_default.DOUBLE) {
    throw new DeveloperError_default(
      "The attribute componentDatatype must be ComponentDatatype.DOUBLE."
    );
  }
  const attribute = geometry.attributes[attributeName];
  projection = defined_default(projection) ? projection : new GeographicProjection_default();
  const ellipsoid = projection.ellipsoid;
  const values3D = attribute.values;
  const projectedValues = new Float64Array(values3D.length);
  let index = 0;
  for (let i = 0; i < values3D.length; i += 3) {
    const value = Cartesian3_default.fromArray(
      values3D,
      i,
      scratchProjectTo2DCartesian3
    );
    const lonLat = ellipsoid.cartesianToCartographic(
      value,
      scratchProjectTo2DCartographic
    );
    if (!defined_default(lonLat)) {
      throw new DeveloperError_default(
        `Could not project point (${value.x}, ${value.y}, ${value.z}) to 2D.`
      );
    }
    const projectedLonLat = projection.project(
      lonLat,
      scratchProjectTo2DCartesian3
    );
    projectedValues[index++] = projectedLonLat.x;
    projectedValues[index++] = projectedLonLat.y;
    projectedValues[index++] = projectedLonLat.z;
  }
  geometry.attributes[attributeName3D] = attribute;
  geometry.attributes[attributeName2D] = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: projectedValues
  });
  delete geometry.attributes[attributeName];
  return geometry;
};
var encodedResult = {
  high: 0,
  low: 0
};
GeometryPipeline.encodeAttribute = function(geometry, attributeName, attributeHighName, attributeLowName) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  if (!defined_default(attributeName)) {
    throw new DeveloperError_default("attributeName is required.");
  }
  if (!defined_default(attributeHighName)) {
    throw new DeveloperError_default("attributeHighName is required.");
  }
  if (!defined_default(attributeLowName)) {
    throw new DeveloperError_default("attributeLowName is required.");
  }
  if (!defined_default(geometry.attributes[attributeName])) {
    throw new DeveloperError_default(
      `geometry must have attribute matching the attributeName argument: ${attributeName}.`
    );
  }
  if (geometry.attributes[attributeName].componentDatatype !== ComponentDatatype_default.DOUBLE) {
    throw new DeveloperError_default(
      "The attribute componentDatatype must be ComponentDatatype.DOUBLE."
    );
  }
  const attribute = geometry.attributes[attributeName];
  const values = attribute.values;
  const length = values.length;
  const highValues = new Float32Array(length);
  const lowValues = new Float32Array(length);
  for (let i = 0; i < length; ++i) {
    EncodedCartesian3_default.encode(values[i], encodedResult);
    highValues[i] = encodedResult.high;
    lowValues[i] = encodedResult.low;
  }
  const componentsPerAttribute = attribute.componentsPerAttribute;
  geometry.attributes[attributeHighName] = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute,
    values: highValues
  });
  geometry.attributes[attributeLowName] = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute,
    values: lowValues
  });
  delete geometry.attributes[attributeName];
  return geometry;
};
var scratchCartesian32 = new Cartesian3_default();
function transformPoint(matrix, attribute) {
  if (defined_default(attribute)) {
    const values = attribute.values;
    const length = values.length;
    for (let i = 0; i < length; i += 3) {
      Cartesian3_default.unpack(values, i, scratchCartesian32);
      Matrix4_default.multiplyByPoint(matrix, scratchCartesian32, scratchCartesian32);
      Cartesian3_default.pack(scratchCartesian32, values, i);
    }
  }
}
function transformVector(matrix, attribute) {
  if (defined_default(attribute)) {
    const values = attribute.values;
    const length = values.length;
    for (let i = 0; i < length; i += 3) {
      Cartesian3_default.unpack(values, i, scratchCartesian32);
      Matrix3_default.multiplyByVector(matrix, scratchCartesian32, scratchCartesian32);
      scratchCartesian32 = Cartesian3_default.normalize(
        scratchCartesian32,
        scratchCartesian32
      );
      Cartesian3_default.pack(scratchCartesian32, values, i);
    }
  }
}
var inverseTranspose = new Matrix4_default();
var normalMatrix = new Matrix3_default();
GeometryPipeline.transformToWorldCoordinates = function(instance) {
  if (!defined_default(instance)) {
    throw new DeveloperError_default("instance is required.");
  }
  const modelMatrix = instance.modelMatrix;
  if (Matrix4_default.equals(modelMatrix, Matrix4_default.IDENTITY)) {
    return instance;
  }
  const attributes = instance.geometry.attributes;
  transformPoint(modelMatrix, attributes.position);
  transformPoint(modelMatrix, attributes.prevPosition);
  transformPoint(modelMatrix, attributes.nextPosition);
  if (defined_default(attributes.normal) || defined_default(attributes.tangent) || defined_default(attributes.bitangent)) {
    Matrix4_default.inverse(modelMatrix, inverseTranspose);
    Matrix4_default.transpose(inverseTranspose, inverseTranspose);
    Matrix4_default.getMatrix3(inverseTranspose, normalMatrix);
    transformVector(normalMatrix, attributes.normal);
    transformVector(normalMatrix, attributes.tangent);
    transformVector(normalMatrix, attributes.bitangent);
  }
  const boundingSphere = instance.geometry.boundingSphere;
  if (defined_default(boundingSphere)) {
    instance.geometry.boundingSphere = BoundingSphere_default.transform(
      boundingSphere,
      modelMatrix,
      boundingSphere
    );
  }
  instance.modelMatrix = Matrix4_default.clone(Matrix4_default.IDENTITY);
  return instance;
};
function findAttributesInAllGeometries(instances, propertyName) {
  const length = instances.length;
  const attributesInAllGeometries = {};
  const attributes0 = instances[0][propertyName].attributes;
  let name;
  for (name in attributes0) {
    if (attributes0.hasOwnProperty(name) && defined_default(attributes0[name]) && defined_default(attributes0[name].values)) {
      const attribute = attributes0[name];
      let numberOfComponents = attribute.values.length;
      let inAllGeometries = true;
      for (let i = 1; i < length; ++i) {
        const otherAttribute = instances[i][propertyName].attributes[name];
        if (!defined_default(otherAttribute) || attribute.componentDatatype !== otherAttribute.componentDatatype || attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute || attribute.normalize !== otherAttribute.normalize) {
          inAllGeometries = false;
          break;
        }
        numberOfComponents += otherAttribute.values.length;
      }
      if (inAllGeometries) {
        attributesInAllGeometries[name] = new GeometryAttribute_default({
          componentDatatype: attribute.componentDatatype,
          componentsPerAttribute: attribute.componentsPerAttribute,
          normalize: attribute.normalize,
          values: ComponentDatatype_default.createTypedArray(
            attribute.componentDatatype,
            numberOfComponents
          )
        });
      }
    }
  }
  return attributesInAllGeometries;
}
var tempScratch = new Cartesian3_default();
function combineGeometries(instances, propertyName) {
  const length = instances.length;
  let name;
  let i;
  let j;
  let k;
  const m = instances[0].modelMatrix;
  const haveIndices = defined_default(instances[0][propertyName].indices);
  const primitiveType = instances[0][propertyName].primitiveType;
  for (i = 1; i < length; ++i) {
    if (!Matrix4_default.equals(instances[i].modelMatrix, m)) {
      throw new DeveloperError_default("All instances must have the same modelMatrix.");
    }
    if (defined_default(instances[i][propertyName].indices) !== haveIndices) {
      throw new DeveloperError_default(
        "All instance geometries must have an indices or not have one."
      );
    }
    if (instances[i][propertyName].primitiveType !== primitiveType) {
      throw new DeveloperError_default(
        "All instance geometries must have the same primitiveType."
      );
    }
  }
  const attributes = findAttributesInAllGeometries(instances, propertyName);
  let values;
  let sourceValues;
  let sourceValuesLength;
  for (name in attributes) {
    if (attributes.hasOwnProperty(name)) {
      values = attributes[name].values;
      k = 0;
      for (i = 0; i < length; ++i) {
        sourceValues = instances[i][propertyName].attributes[name].values;
        sourceValuesLength = sourceValues.length;
        for (j = 0; j < sourceValuesLength; ++j) {
          values[k++] = sourceValues[j];
        }
      }
    }
  }
  let indices;
  if (haveIndices) {
    let numberOfIndices = 0;
    for (i = 0; i < length; ++i) {
      numberOfIndices += instances[i][propertyName].indices.length;
    }
    const numberOfVertices = Geometry_default.computeNumberOfVertices(
      new Geometry_default({
        attributes,
        primitiveType: PrimitiveType_default.POINTS
      })
    );
    const destIndices = IndexDatatype_default.createTypedArray(
      numberOfVertices,
      numberOfIndices
    );
    let destOffset = 0;
    let offset = 0;
    for (i = 0; i < length; ++i) {
      const sourceIndices = instances[i][propertyName].indices;
      const sourceIndicesLen = sourceIndices.length;
      for (k = 0; k < sourceIndicesLen; ++k) {
        destIndices[destOffset++] = offset + sourceIndices[k];
      }
      offset += Geometry_default.computeNumberOfVertices(instances[i][propertyName]);
    }
    indices = destIndices;
  }
  let center = new Cartesian3_default();
  let radius = 0;
  let bs;
  for (i = 0; i < length; ++i) {
    bs = instances[i][propertyName].boundingSphere;
    if (!defined_default(bs)) {
      center = void 0;
      break;
    }
    Cartesian3_default.add(bs.center, center, center);
  }
  if (defined_default(center)) {
    Cartesian3_default.divideByScalar(center, length, center);
    for (i = 0; i < length; ++i) {
      bs = instances[i][propertyName].boundingSphere;
      const tempRadius = Cartesian3_default.magnitude(
        Cartesian3_default.subtract(bs.center, center, tempScratch)
      ) + bs.radius;
      if (tempRadius > radius) {
        radius = tempRadius;
      }
    }
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType,
    boundingSphere: defined_default(center) ? new BoundingSphere_default(center, radius) : void 0
  });
}
GeometryPipeline.combineInstances = function(instances) {
  if (!defined_default(instances) || instances.length < 1) {
    throw new DeveloperError_default(
      "instances is required and must have length greater than zero."
    );
  }
  const instanceGeometry = [];
  const instanceSplitGeometry = [];
  const length = instances.length;
  for (let i = 0; i < length; ++i) {
    const instance = instances[i];
    if (defined_default(instance.geometry)) {
      instanceGeometry.push(instance);
    } else if (defined_default(instance.westHemisphereGeometry) && defined_default(instance.eastHemisphereGeometry)) {
      instanceSplitGeometry.push(instance);
    }
  }
  const geometries = [];
  if (instanceGeometry.length > 0) {
    geometries.push(combineGeometries(instanceGeometry, "geometry"));
  }
  if (instanceSplitGeometry.length > 0) {
    geometries.push(
      combineGeometries(instanceSplitGeometry, "westHemisphereGeometry")
    );
    geometries.push(
      combineGeometries(instanceSplitGeometry, "eastHemisphereGeometry")
    );
  }
  return geometries;
};
var normal = new Cartesian3_default();
var v0 = new Cartesian3_default();
var v1 = new Cartesian3_default();
var v2 = new Cartesian3_default();
GeometryPipeline.computeNormal = function(geometry) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  if (!defined_default(geometry.attributes.position) || !defined_default(geometry.attributes.position.values)) {
    throw new DeveloperError_default(
      "geometry.attributes.position.values is required."
    );
  }
  if (!defined_default(geometry.indices)) {
    throw new DeveloperError_default("geometry.indices is required.");
  }
  if (geometry.indices.length < 2 || geometry.indices.length % 3 !== 0) {
    throw new DeveloperError_default(
      "geometry.indices length must be greater than 0 and be a multiple of 3."
    );
  }
  if (geometry.primitiveType !== PrimitiveType_default.TRIANGLES) {
    throw new DeveloperError_default(
      "geometry.primitiveType must be PrimitiveType.TRIANGLES."
    );
  }
  const indices = geometry.indices;
  const attributes = geometry.attributes;
  const vertices = attributes.position.values;
  const numVertices = attributes.position.values.length / 3;
  const numIndices = indices.length;
  const normalsPerVertex = new Array(numVertices);
  const normalsPerTriangle = new Array(numIndices / 3);
  const normalIndices = new Array(numIndices);
  let i;
  for (i = 0; i < numVertices; i++) {
    normalsPerVertex[i] = {
      indexOffset: 0,
      count: 0,
      currentCount: 0
    };
  }
  let j = 0;
  for (i = 0; i < numIndices; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    const i03 = i0 * 3;
    const i13 = i1 * 3;
    const i23 = i2 * 3;
    v0.x = vertices[i03];
    v0.y = vertices[i03 + 1];
    v0.z = vertices[i03 + 2];
    v1.x = vertices[i13];
    v1.y = vertices[i13 + 1];
    v1.z = vertices[i13 + 2];
    v2.x = vertices[i23];
    v2.y = vertices[i23 + 1];
    v2.z = vertices[i23 + 2];
    normalsPerVertex[i0].count++;
    normalsPerVertex[i1].count++;
    normalsPerVertex[i2].count++;
    Cartesian3_default.subtract(v1, v0, v1);
    Cartesian3_default.subtract(v2, v0, v2);
    normalsPerTriangle[j] = Cartesian3_default.cross(v1, v2, new Cartesian3_default());
    j++;
  }
  let indexOffset = 0;
  for (i = 0; i < numVertices; i++) {
    normalsPerVertex[i].indexOffset += indexOffset;
    indexOffset += normalsPerVertex[i].count;
  }
  j = 0;
  let vertexNormalData;
  for (i = 0; i < numIndices; i += 3) {
    vertexNormalData = normalsPerVertex[indices[i]];
    let index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
    normalIndices[index] = j;
    vertexNormalData.currentCount++;
    vertexNormalData = normalsPerVertex[indices[i + 1]];
    index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
    normalIndices[index] = j;
    vertexNormalData.currentCount++;
    vertexNormalData = normalsPerVertex[indices[i + 2]];
    index = vertexNormalData.indexOffset + vertexNormalData.currentCount;
    normalIndices[index] = j;
    vertexNormalData.currentCount++;
    j++;
  }
  const normalValues = new Float32Array(numVertices * 3);
  for (i = 0; i < numVertices; i++) {
    const i3 = i * 3;
    vertexNormalData = normalsPerVertex[i];
    Cartesian3_default.clone(Cartesian3_default.ZERO, normal);
    if (vertexNormalData.count > 0) {
      for (j = 0; j < vertexNormalData.count; j++) {
        Cartesian3_default.add(
          normal,
          normalsPerTriangle[normalIndices[vertexNormalData.indexOffset + j]],
          normal
        );
      }
      if (Cartesian3_default.equalsEpsilon(Cartesian3_default.ZERO, normal, Math_default.EPSILON10)) {
        Cartesian3_default.clone(
          normalsPerTriangle[normalIndices[vertexNormalData.indexOffset]],
          normal
        );
      }
    }
    if (Cartesian3_default.equalsEpsilon(Cartesian3_default.ZERO, normal, Math_default.EPSILON10)) {
      normal.z = 1;
    }
    Cartesian3_default.normalize(normal, normal);
    normalValues[i3] = normal.x;
    normalValues[i3 + 1] = normal.y;
    normalValues[i3 + 2] = normal.z;
  }
  geometry.attributes.normal = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute: 3,
    values: normalValues
  });
  return geometry;
};
var normalScratch = new Cartesian3_default();
var normalScale = new Cartesian3_default();
var tScratch = new Cartesian3_default();
GeometryPipeline.computeTangentAndBitangent = function(geometry) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  const attributes = geometry.attributes;
  const indices = geometry.indices;
  if (!defined_default(attributes.position) || !defined_default(attributes.position.values)) {
    throw new DeveloperError_default(
      "geometry.attributes.position.values is required."
    );
  }
  if (!defined_default(attributes.normal) || !defined_default(attributes.normal.values)) {
    throw new DeveloperError_default("geometry.attributes.normal.values is required.");
  }
  if (!defined_default(attributes.st) || !defined_default(attributes.st.values)) {
    throw new DeveloperError_default("geometry.attributes.st.values is required.");
  }
  if (!defined_default(indices)) {
    throw new DeveloperError_default("geometry.indices is required.");
  }
  if (indices.length < 2 || indices.length % 3 !== 0) {
    throw new DeveloperError_default(
      "geometry.indices length must be greater than 0 and be a multiple of 3."
    );
  }
  if (geometry.primitiveType !== PrimitiveType_default.TRIANGLES) {
    throw new DeveloperError_default(
      "geometry.primitiveType must be PrimitiveType.TRIANGLES."
    );
  }
  const vertices = geometry.attributes.position.values;
  const normals = geometry.attributes.normal.values;
  const st = geometry.attributes.st.values;
  const numVertices = geometry.attributes.position.values.length / 3;
  const numIndices = indices.length;
  const tan1 = new Array(numVertices * 3);
  let i;
  for (i = 0; i < tan1.length; i++) {
    tan1[i] = 0;
  }
  let i03;
  let i13;
  let i23;
  for (i = 0; i < numIndices; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    i03 = i0 * 3;
    i13 = i1 * 3;
    i23 = i2 * 3;
    const i02 = i0 * 2;
    const i12 = i1 * 2;
    const i22 = i2 * 2;
    const ux = vertices[i03];
    const uy = vertices[i03 + 1];
    const uz = vertices[i03 + 2];
    const wx = st[i02];
    const wy = st[i02 + 1];
    const t1 = st[i12 + 1] - wy;
    const t2 = st[i22 + 1] - wy;
    const r = 1 / ((st[i12] - wx) * t2 - (st[i22] - wx) * t1);
    const sdirx = (t2 * (vertices[i13] - ux) - t1 * (vertices[i23] - ux)) * r;
    const sdiry = (t2 * (vertices[i13 + 1] - uy) - t1 * (vertices[i23 + 1] - uy)) * r;
    const sdirz = (t2 * (vertices[i13 + 2] - uz) - t1 * (vertices[i23 + 2] - uz)) * r;
    tan1[i03] += sdirx;
    tan1[i03 + 1] += sdiry;
    tan1[i03 + 2] += sdirz;
    tan1[i13] += sdirx;
    tan1[i13 + 1] += sdiry;
    tan1[i13 + 2] += sdirz;
    tan1[i23] += sdirx;
    tan1[i23 + 1] += sdiry;
    tan1[i23 + 2] += sdirz;
  }
  const tangentValues = new Float32Array(numVertices * 3);
  const bitangentValues = new Float32Array(numVertices * 3);
  for (i = 0; i < numVertices; i++) {
    i03 = i * 3;
    i13 = i03 + 1;
    i23 = i03 + 2;
    const n = Cartesian3_default.fromArray(normals, i03, normalScratch);
    const t = Cartesian3_default.fromArray(tan1, i03, tScratch);
    const scalar = Cartesian3_default.dot(n, t);
    Cartesian3_default.multiplyByScalar(n, scalar, normalScale);
    Cartesian3_default.normalize(Cartesian3_default.subtract(t, normalScale, t), t);
    tangentValues[i03] = t.x;
    tangentValues[i13] = t.y;
    tangentValues[i23] = t.z;
    Cartesian3_default.normalize(Cartesian3_default.cross(n, t, t), t);
    bitangentValues[i03] = t.x;
    bitangentValues[i13] = t.y;
    bitangentValues[i23] = t.z;
  }
  geometry.attributes.tangent = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute: 3,
    values: tangentValues
  });
  geometry.attributes.bitangent = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute: 3,
    values: bitangentValues
  });
  return geometry;
};
var scratchCartesian22 = new Cartesian2_default();
var toEncode1 = new Cartesian3_default();
var toEncode2 = new Cartesian3_default();
var toEncode3 = new Cartesian3_default();
var encodeResult2 = new Cartesian2_default();
GeometryPipeline.compressVertices = function(geometry) {
  if (!defined_default(geometry)) {
    throw new DeveloperError_default("geometry is required.");
  }
  const extrudeAttribute = geometry.attributes.extrudeDirection;
  let i;
  let numVertices;
  if (defined_default(extrudeAttribute)) {
    const extrudeDirections = extrudeAttribute.values;
    numVertices = extrudeDirections.length / 3;
    const compressedDirections = new Float32Array(numVertices * 2);
    let i2 = 0;
    for (i = 0; i < numVertices; ++i) {
      Cartesian3_default.fromArray(extrudeDirections, i * 3, toEncode1);
      if (Cartesian3_default.equals(toEncode1, Cartesian3_default.ZERO)) {
        i2 += 2;
        continue;
      }
      encodeResult2 = AttributeCompression_default.octEncodeInRange(
        toEncode1,
        65535,
        encodeResult2
      );
      compressedDirections[i2++] = encodeResult2.x;
      compressedDirections[i2++] = encodeResult2.y;
    }
    geometry.attributes.compressedAttributes = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: compressedDirections
    });
    delete geometry.attributes.extrudeDirection;
    return geometry;
  }
  const normalAttribute = geometry.attributes.normal;
  const stAttribute = geometry.attributes.st;
  const hasNormal = defined_default(normalAttribute);
  const hasSt = defined_default(stAttribute);
  if (!hasNormal && !hasSt) {
    return geometry;
  }
  const tangentAttribute = geometry.attributes.tangent;
  const bitangentAttribute = geometry.attributes.bitangent;
  const hasTangent = defined_default(tangentAttribute);
  const hasBitangent = defined_default(bitangentAttribute);
  let normals;
  let st;
  let tangents;
  let bitangents;
  if (hasNormal) {
    normals = normalAttribute.values;
  }
  if (hasSt) {
    st = stAttribute.values;
  }
  if (hasTangent) {
    tangents = tangentAttribute.values;
  }
  if (hasBitangent) {
    bitangents = bitangentAttribute.values;
  }
  const length = hasNormal ? normals.length : st.length;
  const numComponents = hasNormal ? 3 : 2;
  numVertices = length / numComponents;
  let compressedLength = numVertices;
  let numCompressedComponents = hasSt && hasNormal ? 2 : 1;
  numCompressedComponents += hasTangent || hasBitangent ? 1 : 0;
  compressedLength *= numCompressedComponents;
  const compressedAttributes = new Float32Array(compressedLength);
  let normalIndex = 0;
  for (i = 0; i < numVertices; ++i) {
    if (hasSt) {
      Cartesian2_default.fromArray(st, i * 2, scratchCartesian22);
      compressedAttributes[normalIndex++] = AttributeCompression_default.compressTextureCoordinates(scratchCartesian22);
    }
    const index = i * 3;
    if (hasNormal && defined_default(tangents) && defined_default(bitangents)) {
      Cartesian3_default.fromArray(normals, index, toEncode1);
      Cartesian3_default.fromArray(tangents, index, toEncode2);
      Cartesian3_default.fromArray(bitangents, index, toEncode3);
      AttributeCompression_default.octPack(
        toEncode1,
        toEncode2,
        toEncode3,
        scratchCartesian22
      );
      compressedAttributes[normalIndex++] = scratchCartesian22.x;
      compressedAttributes[normalIndex++] = scratchCartesian22.y;
    } else {
      if (hasNormal) {
        Cartesian3_default.fromArray(normals, index, toEncode1);
        compressedAttributes[normalIndex++] = AttributeCompression_default.octEncodeFloat(toEncode1);
      }
      if (hasTangent) {
        Cartesian3_default.fromArray(tangents, index, toEncode1);
        compressedAttributes[normalIndex++] = AttributeCompression_default.octEncodeFloat(toEncode1);
      }
      if (hasBitangent) {
        Cartesian3_default.fromArray(bitangents, index, toEncode1);
        compressedAttributes[normalIndex++] = AttributeCompression_default.octEncodeFloat(toEncode1);
      }
    }
  }
  geometry.attributes.compressedAttributes = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute: numCompressedComponents,
    values: compressedAttributes
  });
  if (hasNormal) {
    delete geometry.attributes.normal;
  }
  if (hasSt) {
    delete geometry.attributes.st;
  }
  if (hasBitangent) {
    delete geometry.attributes.bitangent;
  }
  if (hasTangent) {
    delete geometry.attributes.tangent;
  }
  return geometry;
};
function indexTriangles(geometry) {
  if (defined_default(geometry.indices)) {
    return geometry;
  }
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  if (numberOfVertices < 3) {
    throw new DeveloperError_default("The number of vertices must be at least three.");
  }
  if (numberOfVertices % 3 !== 0) {
    throw new DeveloperError_default(
      "The number of vertices must be a multiple of three."
    );
  }
  const indices = IndexDatatype_default.createTypedArray(
    numberOfVertices,
    numberOfVertices
  );
  for (let i = 0; i < numberOfVertices; ++i) {
    indices[i] = i;
  }
  geometry.indices = indices;
  return geometry;
}
function indexTriangleFan(geometry) {
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  if (numberOfVertices < 3) {
    throw new DeveloperError_default("The number of vertices must be at least three.");
  }
  const indices = IndexDatatype_default.createTypedArray(
    numberOfVertices,
    (numberOfVertices - 2) * 3
  );
  indices[0] = 1;
  indices[1] = 0;
  indices[2] = 2;
  let indicesIndex = 3;
  for (let i = 3; i < numberOfVertices; ++i) {
    indices[indicesIndex++] = i - 1;
    indices[indicesIndex++] = 0;
    indices[indicesIndex++] = i;
  }
  geometry.indices = indices;
  geometry.primitiveType = PrimitiveType_default.TRIANGLES;
  return geometry;
}
function indexTriangleStrip(geometry) {
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  if (numberOfVertices < 3) {
    throw new DeveloperError_default("The number of vertices must be at least 3.");
  }
  const indices = IndexDatatype_default.createTypedArray(
    numberOfVertices,
    (numberOfVertices - 2) * 3
  );
  indices[0] = 0;
  indices[1] = 1;
  indices[2] = 2;
  if (numberOfVertices > 3) {
    indices[3] = 0;
    indices[4] = 2;
    indices[5] = 3;
  }
  let indicesIndex = 6;
  for (let i = 3; i < numberOfVertices - 1; i += 2) {
    indices[indicesIndex++] = i;
    indices[indicesIndex++] = i - 1;
    indices[indicesIndex++] = i + 1;
    if (i + 2 < numberOfVertices) {
      indices[indicesIndex++] = i;
      indices[indicesIndex++] = i + 1;
      indices[indicesIndex++] = i + 2;
    }
  }
  geometry.indices = indices;
  geometry.primitiveType = PrimitiveType_default.TRIANGLES;
  return geometry;
}
function indexLines(geometry) {
  if (defined_default(geometry.indices)) {
    return geometry;
  }
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  if (numberOfVertices < 2) {
    throw new DeveloperError_default("The number of vertices must be at least two.");
  }
  if (numberOfVertices % 2 !== 0) {
    throw new DeveloperError_default("The number of vertices must be a multiple of 2.");
  }
  const indices = IndexDatatype_default.createTypedArray(
    numberOfVertices,
    numberOfVertices
  );
  for (let i = 0; i < numberOfVertices; ++i) {
    indices[i] = i;
  }
  geometry.indices = indices;
  return geometry;
}
function indexLineStrip(geometry) {
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  if (numberOfVertices < 2) {
    throw new DeveloperError_default("The number of vertices must be at least two.");
  }
  const indices = IndexDatatype_default.createTypedArray(
    numberOfVertices,
    (numberOfVertices - 1) * 2
  );
  indices[0] = 0;
  indices[1] = 1;
  let indicesIndex = 2;
  for (let i = 2; i < numberOfVertices; ++i) {
    indices[indicesIndex++] = i - 1;
    indices[indicesIndex++] = i;
  }
  geometry.indices = indices;
  geometry.primitiveType = PrimitiveType_default.LINES;
  return geometry;
}
function indexLineLoop(geometry) {
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  if (numberOfVertices < 2) {
    throw new DeveloperError_default("The number of vertices must be at least two.");
  }
  const indices = IndexDatatype_default.createTypedArray(
    numberOfVertices,
    numberOfVertices * 2
  );
  indices[0] = 0;
  indices[1] = 1;
  let indicesIndex = 2;
  for (let i = 2; i < numberOfVertices; ++i) {
    indices[indicesIndex++] = i - 1;
    indices[indicesIndex++] = i;
  }
  indices[indicesIndex++] = numberOfVertices - 1;
  indices[indicesIndex] = 0;
  geometry.indices = indices;
  geometry.primitiveType = PrimitiveType_default.LINES;
  return geometry;
}
function indexPrimitive(geometry) {
  switch (geometry.primitiveType) {
    case PrimitiveType_default.TRIANGLE_FAN:
      return indexTriangleFan(geometry);
    case PrimitiveType_default.TRIANGLE_STRIP:
      return indexTriangleStrip(geometry);
    case PrimitiveType_default.TRIANGLES:
      return indexTriangles(geometry);
    case PrimitiveType_default.LINE_STRIP:
      return indexLineStrip(geometry);
    case PrimitiveType_default.LINE_LOOP:
      return indexLineLoop(geometry);
    case PrimitiveType_default.LINES:
      return indexLines(geometry);
  }
  return geometry;
}
function offsetPointFromXZPlane(p, isBehind) {
  if (Math.abs(p.y) < Math_default.EPSILON6) {
    if (isBehind) {
      p.y = -Math_default.EPSILON6;
    } else {
      p.y = Math_default.EPSILON6;
    }
  }
}
function offsetTriangleFromXZPlane(p0, p1, p2) {
  if (p0.y !== 0 && p1.y !== 0 && p2.y !== 0) {
    offsetPointFromXZPlane(p0, p0.y < 0);
    offsetPointFromXZPlane(p1, p1.y < 0);
    offsetPointFromXZPlane(p2, p2.y < 0);
    return;
  }
  const p0y = Math.abs(p0.y);
  const p1y = Math.abs(p1.y);
  const p2y = Math.abs(p2.y);
  let sign;
  if (p0y > p1y) {
    if (p0y > p2y) {
      sign = Math_default.sign(p0.y);
    } else {
      sign = Math_default.sign(p2.y);
    }
  } else if (p1y > p2y) {
    sign = Math_default.sign(p1.y);
  } else {
    sign = Math_default.sign(p2.y);
  }
  const isBehind = sign < 0;
  offsetPointFromXZPlane(p0, isBehind);
  offsetPointFromXZPlane(p1, isBehind);
  offsetPointFromXZPlane(p2, isBehind);
}
var c3 = new Cartesian3_default();
function getXZIntersectionOffsetPoints(p, p1, u12, v12) {
  Cartesian3_default.add(
    p,
    Cartesian3_default.multiplyByScalar(
      Cartesian3_default.subtract(p1, p, c3),
      p.y / (p.y - p1.y),
      c3
    ),
    u12
  );
  Cartesian3_default.clone(u12, v12);
  offsetPointFromXZPlane(u12, true);
  offsetPointFromXZPlane(v12, false);
}
var u1 = new Cartesian3_default();
var u2 = new Cartesian3_default();
var q1 = new Cartesian3_default();
var q2 = new Cartesian3_default();
var splitTriangleResult = {
  positions: new Array(7),
  indices: new Array(3 * 3)
};
function splitTriangle(p0, p1, p2) {
  if (p0.x >= 0 || p1.x >= 0 || p2.x >= 0) {
    return void 0;
  }
  offsetTriangleFromXZPlane(p0, p1, p2);
  const p0Behind = p0.y < 0;
  const p1Behind = p1.y < 0;
  const p2Behind = p2.y < 0;
  let numBehind = 0;
  numBehind += p0Behind ? 1 : 0;
  numBehind += p1Behind ? 1 : 0;
  numBehind += p2Behind ? 1 : 0;
  const indices = splitTriangleResult.indices;
  if (numBehind === 1) {
    indices[1] = 3;
    indices[2] = 4;
    indices[5] = 6;
    indices[7] = 6;
    indices[8] = 5;
    if (p0Behind) {
      getXZIntersectionOffsetPoints(p0, p1, u1, q1);
      getXZIntersectionOffsetPoints(p0, p2, u2, q2);
      indices[0] = 0;
      indices[3] = 1;
      indices[4] = 2;
      indices[6] = 1;
    } else if (p1Behind) {
      getXZIntersectionOffsetPoints(p1, p2, u1, q1);
      getXZIntersectionOffsetPoints(p1, p0, u2, q2);
      indices[0] = 1;
      indices[3] = 2;
      indices[4] = 0;
      indices[6] = 2;
    } else if (p2Behind) {
      getXZIntersectionOffsetPoints(p2, p0, u1, q1);
      getXZIntersectionOffsetPoints(p2, p1, u2, q2);
      indices[0] = 2;
      indices[3] = 0;
      indices[4] = 1;
      indices[6] = 0;
    }
  } else if (numBehind === 2) {
    indices[2] = 4;
    indices[4] = 4;
    indices[5] = 3;
    indices[7] = 5;
    indices[8] = 6;
    if (!p0Behind) {
      getXZIntersectionOffsetPoints(p0, p1, u1, q1);
      getXZIntersectionOffsetPoints(p0, p2, u2, q2);
      indices[0] = 1;
      indices[1] = 2;
      indices[3] = 1;
      indices[6] = 0;
    } else if (!p1Behind) {
      getXZIntersectionOffsetPoints(p1, p2, u1, q1);
      getXZIntersectionOffsetPoints(p1, p0, u2, q2);
      indices[0] = 2;
      indices[1] = 0;
      indices[3] = 2;
      indices[6] = 1;
    } else if (!p2Behind) {
      getXZIntersectionOffsetPoints(p2, p0, u1, q1);
      getXZIntersectionOffsetPoints(p2, p1, u2, q2);
      indices[0] = 0;
      indices[1] = 1;
      indices[3] = 0;
      indices[6] = 2;
    }
  }
  const positions = splitTriangleResult.positions;
  positions[0] = p0;
  positions[1] = p1;
  positions[2] = p2;
  positions.length = 3;
  if (numBehind === 1 || numBehind === 2) {
    positions[3] = u1;
    positions[4] = u2;
    positions[5] = q1;
    positions[6] = q2;
    positions.length = 7;
  }
  return splitTriangleResult;
}
function updateGeometryAfterSplit(geometry, computeBoundingSphere) {
  const attributes = geometry.attributes;
  if (attributes.position.values.length === 0) {
    return void 0;
  }
  for (const property in attributes) {
    if (attributes.hasOwnProperty(property) && defined_default(attributes[property]) && defined_default(attributes[property].values)) {
      const attribute = attributes[property];
      attribute.values = ComponentDatatype_default.createTypedArray(
        attribute.componentDatatype,
        attribute.values
      );
    }
  }
  const numberOfVertices = Geometry_default.computeNumberOfVertices(geometry);
  geometry.indices = IndexDatatype_default.createTypedArray(
    numberOfVertices,
    geometry.indices
  );
  if (computeBoundingSphere) {
    geometry.boundingSphere = BoundingSphere_default.fromVertices(
      attributes.position.values
    );
  }
  return geometry;
}
function copyGeometryForSplit(geometry) {
  const attributes = geometry.attributes;
  const copiedAttributes = {};
  for (const property in attributes) {
    if (attributes.hasOwnProperty(property) && defined_default(attributes[property]) && defined_default(attributes[property].values)) {
      const attribute = attributes[property];
      copiedAttributes[property] = new GeometryAttribute_default({
        componentDatatype: attribute.componentDatatype,
        componentsPerAttribute: attribute.componentsPerAttribute,
        normalize: attribute.normalize,
        values: []
      });
    }
  }
  return new Geometry_default({
    attributes: copiedAttributes,
    indices: [],
    primitiveType: geometry.primitiveType
  });
}
function updateInstanceAfterSplit(instance, westGeometry, eastGeometry) {
  const computeBoundingSphere = defined_default(instance.geometry.boundingSphere);
  westGeometry = updateGeometryAfterSplit(westGeometry, computeBoundingSphere);
  eastGeometry = updateGeometryAfterSplit(eastGeometry, computeBoundingSphere);
  if (defined_default(eastGeometry) && !defined_default(westGeometry)) {
    instance.geometry = eastGeometry;
  } else if (!defined_default(eastGeometry) && defined_default(westGeometry)) {
    instance.geometry = westGeometry;
  } else {
    instance.westHemisphereGeometry = westGeometry;
    instance.eastHemisphereGeometry = eastGeometry;
    instance.geometry = void 0;
  }
}
function generateBarycentricInterpolateFunction(CartesianType, numberOfComponents) {
  const v0Scratch = new CartesianType();
  const v1Scratch = new CartesianType();
  const v2Scratch = new CartesianType();
  return function(i0, i1, i2, coords, sourceValues, currentValues, insertedIndex, normalize) {
    const v02 = CartesianType.fromArray(
      sourceValues,
      i0 * numberOfComponents,
      v0Scratch
    );
    const v12 = CartesianType.fromArray(
      sourceValues,
      i1 * numberOfComponents,
      v1Scratch
    );
    const v22 = CartesianType.fromArray(
      sourceValues,
      i2 * numberOfComponents,
      v2Scratch
    );
    CartesianType.multiplyByScalar(v02, coords.x, v02);
    CartesianType.multiplyByScalar(v12, coords.y, v12);
    CartesianType.multiplyByScalar(v22, coords.z, v22);
    const value = CartesianType.add(v02, v12, v02);
    CartesianType.add(value, v22, value);
    if (normalize) {
      CartesianType.normalize(value, value);
    }
    CartesianType.pack(
      value,
      currentValues,
      insertedIndex * numberOfComponents
    );
  };
}
var interpolateAndPackCartesian4 = generateBarycentricInterpolateFunction(
  Cartesian4_default,
  4
);
var interpolateAndPackCartesian3 = generateBarycentricInterpolateFunction(
  Cartesian3_default,
  3
);
var interpolateAndPackCartesian2 = generateBarycentricInterpolateFunction(
  Cartesian2_default,
  2
);
var interpolateAndPackBoolean = function(i0, i1, i2, coords, sourceValues, currentValues, insertedIndex) {
  const v12 = sourceValues[i0] * coords.x;
  const v22 = sourceValues[i1] * coords.y;
  const v3 = sourceValues[i2] * coords.z;
  currentValues[insertedIndex] = v12 + v22 + v3 > Math_default.EPSILON6 ? 1 : 0;
};
var p0Scratch = new Cartesian3_default();
var p1Scratch = new Cartesian3_default();
var p2Scratch = new Cartesian3_default();
var barycentricScratch = new Cartesian3_default();
function computeTriangleAttributes(i0, i1, i2, point, positions, normals, tangents, bitangents, texCoords, extrudeDirections, applyOffset, currentAttributes, customAttributeNames, customAttributesLength, allAttributes, insertedIndex) {
  if (!defined_default(normals) && !defined_default(tangents) && !defined_default(bitangents) && !defined_default(texCoords) && !defined_default(extrudeDirections) && customAttributesLength === 0) {
    return;
  }
  const p0 = Cartesian3_default.fromArray(positions, i0 * 3, p0Scratch);
  const p1 = Cartesian3_default.fromArray(positions, i1 * 3, p1Scratch);
  const p2 = Cartesian3_default.fromArray(positions, i2 * 3, p2Scratch);
  const coords = barycentricCoordinates_default(point, p0, p1, p2, barycentricScratch);
  if (!defined_default(coords)) {
    return;
  }
  if (defined_default(normals)) {
    interpolateAndPackCartesian3(
      i0,
      i1,
      i2,
      coords,
      normals,
      currentAttributes.normal.values,
      insertedIndex,
      true
    );
  }
  if (defined_default(extrudeDirections)) {
    const d0 = Cartesian3_default.fromArray(extrudeDirections, i0 * 3, p0Scratch);
    const d1 = Cartesian3_default.fromArray(extrudeDirections, i1 * 3, p1Scratch);
    const d2 = Cartesian3_default.fromArray(extrudeDirections, i2 * 3, p2Scratch);
    Cartesian3_default.multiplyByScalar(d0, coords.x, d0);
    Cartesian3_default.multiplyByScalar(d1, coords.y, d1);
    Cartesian3_default.multiplyByScalar(d2, coords.z, d2);
    let direction;
    if (!Cartesian3_default.equals(d0, Cartesian3_default.ZERO) || !Cartesian3_default.equals(d1, Cartesian3_default.ZERO) || !Cartesian3_default.equals(d2, Cartesian3_default.ZERO)) {
      direction = Cartesian3_default.add(d0, d1, d0);
      Cartesian3_default.add(direction, d2, direction);
      Cartesian3_default.normalize(direction, direction);
    } else {
      direction = p0Scratch;
      direction.x = 0;
      direction.y = 0;
      direction.z = 0;
    }
    Cartesian3_default.pack(
      direction,
      currentAttributes.extrudeDirection.values,
      insertedIndex * 3
    );
  }
  if (defined_default(applyOffset)) {
    interpolateAndPackBoolean(
      i0,
      i1,
      i2,
      coords,
      applyOffset,
      currentAttributes.applyOffset.values,
      insertedIndex
    );
  }
  if (defined_default(tangents)) {
    interpolateAndPackCartesian3(
      i0,
      i1,
      i2,
      coords,
      tangents,
      currentAttributes.tangent.values,
      insertedIndex,
      true
    );
  }
  if (defined_default(bitangents)) {
    interpolateAndPackCartesian3(
      i0,
      i1,
      i2,
      coords,
      bitangents,
      currentAttributes.bitangent.values,
      insertedIndex,
      true
    );
  }
  if (defined_default(texCoords)) {
    interpolateAndPackCartesian2(
      i0,
      i1,
      i2,
      coords,
      texCoords,
      currentAttributes.st.values,
      insertedIndex
    );
  }
  if (customAttributesLength > 0) {
    for (let i = 0; i < customAttributesLength; i++) {
      const attributeName = customAttributeNames[i];
      genericInterpolate(
        i0,
        i1,
        i2,
        coords,
        insertedIndex,
        allAttributes[attributeName],
        currentAttributes[attributeName]
      );
    }
  }
}
function genericInterpolate(i0, i1, i2, coords, insertedIndex, sourceAttribute, currentAttribute) {
  const componentsPerAttribute = sourceAttribute.componentsPerAttribute;
  const sourceValues = sourceAttribute.values;
  const currentValues = currentAttribute.values;
  switch (componentsPerAttribute) {
    case 4:
      interpolateAndPackCartesian4(
        i0,
        i1,
        i2,
        coords,
        sourceValues,
        currentValues,
        insertedIndex,
        false
      );
      break;
    case 3:
      interpolateAndPackCartesian3(
        i0,
        i1,
        i2,
        coords,
        sourceValues,
        currentValues,
        insertedIndex,
        false
      );
      break;
    case 2:
      interpolateAndPackCartesian2(
        i0,
        i1,
        i2,
        coords,
        sourceValues,
        currentValues,
        insertedIndex,
        false
      );
      break;
    default:
      currentValues[insertedIndex] = sourceValues[i0] * coords.x + sourceValues[i1] * coords.y + sourceValues[i2] * coords.z;
  }
}
function insertSplitPoint(currentAttributes, currentIndices, currentIndexMap, indices, currentIndex, point) {
  const insertIndex = currentAttributes.position.values.length / 3;
  if (currentIndex !== -1) {
    const prevIndex = indices[currentIndex];
    const newIndex = currentIndexMap[prevIndex];
    if (newIndex === -1) {
      currentIndexMap[prevIndex] = insertIndex;
      currentAttributes.position.values.push(point.x, point.y, point.z);
      currentIndices.push(insertIndex);
      return insertIndex;
    }
    currentIndices.push(newIndex);
    return newIndex;
  }
  currentAttributes.position.values.push(point.x, point.y, point.z);
  currentIndices.push(insertIndex);
  return insertIndex;
}
var NAMED_ATTRIBUTES = {
  position: true,
  normal: true,
  bitangent: true,
  tangent: true,
  st: true,
  extrudeDirection: true,
  applyOffset: true
};
function splitLongitudeTriangles(instance) {
  const geometry = instance.geometry;
  const attributes = geometry.attributes;
  const positions = attributes.position.values;
  const normals = defined_default(attributes.normal) ? attributes.normal.values : void 0;
  const bitangents = defined_default(attributes.bitangent) ? attributes.bitangent.values : void 0;
  const tangents = defined_default(attributes.tangent) ? attributes.tangent.values : void 0;
  const texCoords = defined_default(attributes.st) ? attributes.st.values : void 0;
  const extrudeDirections = defined_default(attributes.extrudeDirection) ? attributes.extrudeDirection.values : void 0;
  const applyOffset = defined_default(attributes.applyOffset) ? attributes.applyOffset.values : void 0;
  const indices = geometry.indices;
  const customAttributeNames = [];
  for (const attributeName in attributes) {
    if (attributes.hasOwnProperty(attributeName) && !NAMED_ATTRIBUTES[attributeName] && defined_default(attributes[attributeName])) {
      customAttributeNames.push(attributeName);
    }
  }
  const customAttributesLength = customAttributeNames.length;
  const eastGeometry = copyGeometryForSplit(geometry);
  const westGeometry = copyGeometryForSplit(geometry);
  let currentAttributes;
  let currentIndices;
  let currentIndexMap;
  let insertedIndex;
  let i;
  const westGeometryIndexMap = [];
  westGeometryIndexMap.length = positions.length / 3;
  const eastGeometryIndexMap = [];
  eastGeometryIndexMap.length = positions.length / 3;
  for (i = 0; i < westGeometryIndexMap.length; ++i) {
    westGeometryIndexMap[i] = -1;
    eastGeometryIndexMap[i] = -1;
  }
  const len = indices.length;
  for (i = 0; i < len; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    let p0 = Cartesian3_default.fromArray(positions, i0 * 3);
    let p1 = Cartesian3_default.fromArray(positions, i1 * 3);
    let p2 = Cartesian3_default.fromArray(positions, i2 * 3);
    const result = splitTriangle(p0, p1, p2);
    if (defined_default(result) && result.positions.length > 3) {
      const resultPositions = result.positions;
      const resultIndices = result.indices;
      const resultLength = resultIndices.length;
      for (let j = 0; j < resultLength; ++j) {
        const resultIndex = resultIndices[j];
        const point = resultPositions[resultIndex];
        if (point.y < 0) {
          currentAttributes = westGeometry.attributes;
          currentIndices = westGeometry.indices;
          currentIndexMap = westGeometryIndexMap;
        } else {
          currentAttributes = eastGeometry.attributes;
          currentIndices = eastGeometry.indices;
          currentIndexMap = eastGeometryIndexMap;
        }
        insertedIndex = insertSplitPoint(
          currentAttributes,
          currentIndices,
          currentIndexMap,
          indices,
          resultIndex < 3 ? i + resultIndex : -1,
          point
        );
        computeTriangleAttributes(
          i0,
          i1,
          i2,
          point,
          positions,
          normals,
          tangents,
          bitangents,
          texCoords,
          extrudeDirections,
          applyOffset,
          currentAttributes,
          customAttributeNames,
          customAttributesLength,
          attributes,
          insertedIndex
        );
      }
    } else {
      if (defined_default(result)) {
        p0 = result.positions[0];
        p1 = result.positions[1];
        p2 = result.positions[2];
      }
      if (p0.y < 0) {
        currentAttributes = westGeometry.attributes;
        currentIndices = westGeometry.indices;
        currentIndexMap = westGeometryIndexMap;
      } else {
        currentAttributes = eastGeometry.attributes;
        currentIndices = eastGeometry.indices;
        currentIndexMap = eastGeometryIndexMap;
      }
      insertedIndex = insertSplitPoint(
        currentAttributes,
        currentIndices,
        currentIndexMap,
        indices,
        i,
        p0
      );
      computeTriangleAttributes(
        i0,
        i1,
        i2,
        p0,
        positions,
        normals,
        tangents,
        bitangents,
        texCoords,
        extrudeDirections,
        applyOffset,
        currentAttributes,
        customAttributeNames,
        customAttributesLength,
        attributes,
        insertedIndex
      );
      insertedIndex = insertSplitPoint(
        currentAttributes,
        currentIndices,
        currentIndexMap,
        indices,
        i + 1,
        p1
      );
      computeTriangleAttributes(
        i0,
        i1,
        i2,
        p1,
        positions,
        normals,
        tangents,
        bitangents,
        texCoords,
        extrudeDirections,
        applyOffset,
        currentAttributes,
        customAttributeNames,
        customAttributesLength,
        attributes,
        insertedIndex
      );
      insertedIndex = insertSplitPoint(
        currentAttributes,
        currentIndices,
        currentIndexMap,
        indices,
        i + 2,
        p2
      );
      computeTriangleAttributes(
        i0,
        i1,
        i2,
        p2,
        positions,
        normals,
        tangents,
        bitangents,
        texCoords,
        extrudeDirections,
        applyOffset,
        currentAttributes,
        customAttributeNames,
        customAttributesLength,
        attributes,
        insertedIndex
      );
    }
  }
  updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
}
var xzPlane = Plane_default.fromPointNormal(Cartesian3_default.ZERO, Cartesian3_default.UNIT_Y);
var offsetScratch = new Cartesian3_default();
var offsetPointScratch = new Cartesian3_default();
function computeLineAttributes(i0, i1, point, positions, insertIndex, currentAttributes, applyOffset) {
  if (!defined_default(applyOffset)) {
    return;
  }
  const p0 = Cartesian3_default.fromArray(positions, i0 * 3, p0Scratch);
  if (Cartesian3_default.equalsEpsilon(p0, point, Math_default.EPSILON10)) {
    currentAttributes.applyOffset.values[insertIndex] = applyOffset[i0];
  } else {
    currentAttributes.applyOffset.values[insertIndex] = applyOffset[i1];
  }
}
function splitLongitudeLines(instance) {
  const geometry = instance.geometry;
  const attributes = geometry.attributes;
  const positions = attributes.position.values;
  const applyOffset = defined_default(attributes.applyOffset) ? attributes.applyOffset.values : void 0;
  const indices = geometry.indices;
  const eastGeometry = copyGeometryForSplit(geometry);
  const westGeometry = copyGeometryForSplit(geometry);
  let i;
  const length = indices.length;
  const westGeometryIndexMap = [];
  westGeometryIndexMap.length = positions.length / 3;
  const eastGeometryIndexMap = [];
  eastGeometryIndexMap.length = positions.length / 3;
  for (i = 0; i < westGeometryIndexMap.length; ++i) {
    westGeometryIndexMap[i] = -1;
    eastGeometryIndexMap[i] = -1;
  }
  for (i = 0; i < length; i += 2) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const p0 = Cartesian3_default.fromArray(positions, i0 * 3, p0Scratch);
    const p1 = Cartesian3_default.fromArray(positions, i1 * 3, p1Scratch);
    let insertIndex;
    if (Math.abs(p0.y) < Math_default.EPSILON6) {
      if (p0.y < 0) {
        p0.y = -Math_default.EPSILON6;
      } else {
        p0.y = Math_default.EPSILON6;
      }
    }
    if (Math.abs(p1.y) < Math_default.EPSILON6) {
      if (p1.y < 0) {
        p1.y = -Math_default.EPSILON6;
      } else {
        p1.y = Math_default.EPSILON6;
      }
    }
    let p0Attributes = eastGeometry.attributes;
    let p0Indices = eastGeometry.indices;
    let p0IndexMap = eastGeometryIndexMap;
    let p1Attributes = westGeometry.attributes;
    let p1Indices = westGeometry.indices;
    let p1IndexMap = westGeometryIndexMap;
    const intersection = IntersectionTests_default.lineSegmentPlane(
      p0,
      p1,
      xzPlane,
      p2Scratch
    );
    if (defined_default(intersection)) {
      const offset = Cartesian3_default.multiplyByScalar(
        Cartesian3_default.UNIT_Y,
        5 * Math_default.EPSILON9,
        offsetScratch
      );
      if (p0.y < 0) {
        Cartesian3_default.negate(offset, offset);
        p0Attributes = westGeometry.attributes;
        p0Indices = westGeometry.indices;
        p0IndexMap = westGeometryIndexMap;
        p1Attributes = eastGeometry.attributes;
        p1Indices = eastGeometry.indices;
        p1IndexMap = eastGeometryIndexMap;
      }
      const offsetPoint = Cartesian3_default.add(
        intersection,
        offset,
        offsetPointScratch
      );
      insertIndex = insertSplitPoint(
        p0Attributes,
        p0Indices,
        p0IndexMap,
        indices,
        i,
        p0
      );
      computeLineAttributes(
        i0,
        i1,
        p0,
        positions,
        insertIndex,
        p0Attributes,
        applyOffset
      );
      insertIndex = insertSplitPoint(
        p0Attributes,
        p0Indices,
        p0IndexMap,
        indices,
        -1,
        offsetPoint
      );
      computeLineAttributes(
        i0,
        i1,
        offsetPoint,
        positions,
        insertIndex,
        p0Attributes,
        applyOffset
      );
      Cartesian3_default.negate(offset, offset);
      Cartesian3_default.add(intersection, offset, offsetPoint);
      insertIndex = insertSplitPoint(
        p1Attributes,
        p1Indices,
        p1IndexMap,
        indices,
        -1,
        offsetPoint
      );
      computeLineAttributes(
        i0,
        i1,
        offsetPoint,
        positions,
        insertIndex,
        p1Attributes,
        applyOffset
      );
      insertIndex = insertSplitPoint(
        p1Attributes,
        p1Indices,
        p1IndexMap,
        indices,
        i + 1,
        p1
      );
      computeLineAttributes(
        i0,
        i1,
        p1,
        positions,
        insertIndex,
        p1Attributes,
        applyOffset
      );
    } else {
      let currentAttributes;
      let currentIndices;
      let currentIndexMap;
      if (p0.y < 0) {
        currentAttributes = westGeometry.attributes;
        currentIndices = westGeometry.indices;
        currentIndexMap = westGeometryIndexMap;
      } else {
        currentAttributes = eastGeometry.attributes;
        currentIndices = eastGeometry.indices;
        currentIndexMap = eastGeometryIndexMap;
      }
      insertIndex = insertSplitPoint(
        currentAttributes,
        currentIndices,
        currentIndexMap,
        indices,
        i,
        p0
      );
      computeLineAttributes(
        i0,
        i1,
        p0,
        positions,
        insertIndex,
        currentAttributes,
        applyOffset
      );
      insertIndex = insertSplitPoint(
        currentAttributes,
        currentIndices,
        currentIndexMap,
        indices,
        i + 1,
        p1
      );
      computeLineAttributes(
        i0,
        i1,
        p1,
        positions,
        insertIndex,
        currentAttributes,
        applyOffset
      );
    }
  }
  updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
}
var cartesian2Scratch0 = new Cartesian2_default();
var cartesian2Scratch1 = new Cartesian2_default();
var cartesian3Scratch0 = new Cartesian3_default();
var cartesian3Scratch2 = new Cartesian3_default();
var cartesian3Scratch3 = new Cartesian3_default();
var cartesian3Scratch4 = new Cartesian3_default();
var cartesian3Scratch5 = new Cartesian3_default();
var cartesian3Scratch6 = new Cartesian3_default();
var cartesian4Scratch0 = new Cartesian4_default();
function updateAdjacencyAfterSplit(geometry) {
  const attributes = geometry.attributes;
  const positions = attributes.position.values;
  const prevPositions = attributes.prevPosition.values;
  const nextPositions = attributes.nextPosition.values;
  const length = positions.length;
  for (let j = 0; j < length; j += 3) {
    const position = Cartesian3_default.unpack(positions, j, cartesian3Scratch0);
    if (position.x > 0) {
      continue;
    }
    const prevPosition = Cartesian3_default.unpack(
      prevPositions,
      j,
      cartesian3Scratch2
    );
    if (position.y < 0 && prevPosition.y > 0 || position.y > 0 && prevPosition.y < 0) {
      if (j - 3 > 0) {
        prevPositions[j] = positions[j - 3];
        prevPositions[j + 1] = positions[j - 2];
        prevPositions[j + 2] = positions[j - 1];
      } else {
        Cartesian3_default.pack(position, prevPositions, j);
      }
    }
    const nextPosition = Cartesian3_default.unpack(
      nextPositions,
      j,
      cartesian3Scratch3
    );
    if (position.y < 0 && nextPosition.y > 0 || position.y > 0 && nextPosition.y < 0) {
      if (j + 3 < length) {
        nextPositions[j] = positions[j + 3];
        nextPositions[j + 1] = positions[j + 4];
        nextPositions[j + 2] = positions[j + 5];
      } else {
        Cartesian3_default.pack(position, nextPositions, j);
      }
    }
  }
}
var offsetScalar = 5 * Math_default.EPSILON9;
var coplanarOffset = Math_default.EPSILON6;
function splitLongitudePolyline(instance) {
  const geometry = instance.geometry;
  const attributes = geometry.attributes;
  const positions = attributes.position.values;
  const prevPositions = attributes.prevPosition.values;
  const nextPositions = attributes.nextPosition.values;
  const expandAndWidths = attributes.expandAndWidth.values;
  const texCoords = defined_default(attributes.st) ? attributes.st.values : void 0;
  const colors = defined_default(attributes.color) ? attributes.color.values : void 0;
  const eastGeometry = copyGeometryForSplit(geometry);
  const westGeometry = copyGeometryForSplit(geometry);
  let i;
  let j;
  let index;
  let intersectionFound = false;
  const length = positions.length / 3;
  for (i = 0; i < length; i += 4) {
    const i0 = i;
    const i2 = i + 2;
    const p0 = Cartesian3_default.fromArray(positions, i0 * 3, cartesian3Scratch0);
    const p2 = Cartesian3_default.fromArray(positions, i2 * 3, cartesian3Scratch2);
    if (Math.abs(p0.y) < coplanarOffset) {
      p0.y = coplanarOffset * (p2.y < 0 ? -1 : 1);
      positions[i * 3 + 1] = p0.y;
      positions[(i + 1) * 3 + 1] = p0.y;
      for (j = i0 * 3; j < i0 * 3 + 4 * 3; j += 3) {
        prevPositions[j] = positions[i * 3];
        prevPositions[j + 1] = positions[i * 3 + 1];
        prevPositions[j + 2] = positions[i * 3 + 2];
      }
    }
    if (Math.abs(p2.y) < coplanarOffset) {
      p2.y = coplanarOffset * (p0.y < 0 ? -1 : 1);
      positions[(i + 2) * 3 + 1] = p2.y;
      positions[(i + 3) * 3 + 1] = p2.y;
      for (j = i0 * 3; j < i0 * 3 + 4 * 3; j += 3) {
        nextPositions[j] = positions[(i + 2) * 3];
        nextPositions[j + 1] = positions[(i + 2) * 3 + 1];
        nextPositions[j + 2] = positions[(i + 2) * 3 + 2];
      }
    }
    let p0Attributes = eastGeometry.attributes;
    let p0Indices = eastGeometry.indices;
    let p2Attributes = westGeometry.attributes;
    let p2Indices = westGeometry.indices;
    const intersection = IntersectionTests_default.lineSegmentPlane(
      p0,
      p2,
      xzPlane,
      cartesian3Scratch4
    );
    if (defined_default(intersection)) {
      intersectionFound = true;
      const offset = Cartesian3_default.multiplyByScalar(
        Cartesian3_default.UNIT_Y,
        offsetScalar,
        cartesian3Scratch5
      );
      if (p0.y < 0) {
        Cartesian3_default.negate(offset, offset);
        p0Attributes = westGeometry.attributes;
        p0Indices = westGeometry.indices;
        p2Attributes = eastGeometry.attributes;
        p2Indices = eastGeometry.indices;
      }
      const offsetPoint = Cartesian3_default.add(
        intersection,
        offset,
        cartesian3Scratch6
      );
      p0Attributes.position.values.push(p0.x, p0.y, p0.z, p0.x, p0.y, p0.z);
      p0Attributes.position.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p0Attributes.position.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p0Attributes.prevPosition.values.push(
        prevPositions[i0 * 3],
        prevPositions[i0 * 3 + 1],
        prevPositions[i0 * 3 + 2]
      );
      p0Attributes.prevPosition.values.push(
        prevPositions[i0 * 3 + 3],
        prevPositions[i0 * 3 + 4],
        prevPositions[i0 * 3 + 5]
      );
      p0Attributes.prevPosition.values.push(p0.x, p0.y, p0.z, p0.x, p0.y, p0.z);
      p0Attributes.nextPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p0Attributes.nextPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p0Attributes.nextPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p0Attributes.nextPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      Cartesian3_default.negate(offset, offset);
      Cartesian3_default.add(intersection, offset, offsetPoint);
      p2Attributes.position.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p2Attributes.position.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p2Attributes.position.values.push(p2.x, p2.y, p2.z, p2.x, p2.y, p2.z);
      p2Attributes.prevPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p2Attributes.prevPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p2Attributes.prevPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p2Attributes.prevPosition.values.push(
        offsetPoint.x,
        offsetPoint.y,
        offsetPoint.z
      );
      p2Attributes.nextPosition.values.push(p2.x, p2.y, p2.z, p2.x, p2.y, p2.z);
      p2Attributes.nextPosition.values.push(
        nextPositions[i2 * 3],
        nextPositions[i2 * 3 + 1],
        nextPositions[i2 * 3 + 2]
      );
      p2Attributes.nextPosition.values.push(
        nextPositions[i2 * 3 + 3],
        nextPositions[i2 * 3 + 4],
        nextPositions[i2 * 3 + 5]
      );
      const ew0 = Cartesian2_default.fromArray(
        expandAndWidths,
        i0 * 2,
        cartesian2Scratch0
      );
      const width = Math.abs(ew0.y);
      p0Attributes.expandAndWidth.values.push(-1, width, 1, width);
      p0Attributes.expandAndWidth.values.push(-1, -width, 1, -width);
      p2Attributes.expandAndWidth.values.push(-1, width, 1, width);
      p2Attributes.expandAndWidth.values.push(-1, -width, 1, -width);
      let t = Cartesian3_default.magnitudeSquared(
        Cartesian3_default.subtract(intersection, p0, cartesian3Scratch3)
      );
      t /= Cartesian3_default.magnitudeSquared(
        Cartesian3_default.subtract(p2, p0, cartesian3Scratch3)
      );
      if (defined_default(colors)) {
        const c0 = Cartesian4_default.fromArray(colors, i0 * 4, cartesian4Scratch0);
        const c2 = Cartesian4_default.fromArray(colors, i2 * 4, cartesian4Scratch0);
        const r = Math_default.lerp(c0.x, c2.x, t);
        const g = Math_default.lerp(c0.y, c2.y, t);
        const b = Math_default.lerp(c0.z, c2.z, t);
        const a = Math_default.lerp(c0.w, c2.w, t);
        for (j = i0 * 4; j < i0 * 4 + 2 * 4; ++j) {
          p0Attributes.color.values.push(colors[j]);
        }
        p0Attributes.color.values.push(r, g, b, a);
        p0Attributes.color.values.push(r, g, b, a);
        p2Attributes.color.values.push(r, g, b, a);
        p2Attributes.color.values.push(r, g, b, a);
        for (j = i2 * 4; j < i2 * 4 + 2 * 4; ++j) {
          p2Attributes.color.values.push(colors[j]);
        }
      }
      if (defined_default(texCoords)) {
        const s0 = Cartesian2_default.fromArray(texCoords, i0 * 2, cartesian2Scratch0);
        const s3 = Cartesian2_default.fromArray(
          texCoords,
          (i + 3) * 2,
          cartesian2Scratch1
        );
        const sx = Math_default.lerp(s0.x, s3.x, t);
        for (j = i0 * 2; j < i0 * 2 + 2 * 2; ++j) {
          p0Attributes.st.values.push(texCoords[j]);
        }
        p0Attributes.st.values.push(sx, s0.y);
        p0Attributes.st.values.push(sx, s3.y);
        p2Attributes.st.values.push(sx, s0.y);
        p2Attributes.st.values.push(sx, s3.y);
        for (j = i2 * 2; j < i2 * 2 + 2 * 2; ++j) {
          p2Attributes.st.values.push(texCoords[j]);
        }
      }
      index = p0Attributes.position.values.length / 3 - 4;
      p0Indices.push(index, index + 2, index + 1);
      p0Indices.push(index + 1, index + 2, index + 3);
      index = p2Attributes.position.values.length / 3 - 4;
      p2Indices.push(index, index + 2, index + 1);
      p2Indices.push(index + 1, index + 2, index + 3);
    } else {
      let currentAttributes;
      let currentIndices;
      if (p0.y < 0) {
        currentAttributes = westGeometry.attributes;
        currentIndices = westGeometry.indices;
      } else {
        currentAttributes = eastGeometry.attributes;
        currentIndices = eastGeometry.indices;
      }
      currentAttributes.position.values.push(p0.x, p0.y, p0.z);
      currentAttributes.position.values.push(p0.x, p0.y, p0.z);
      currentAttributes.position.values.push(p2.x, p2.y, p2.z);
      currentAttributes.position.values.push(p2.x, p2.y, p2.z);
      for (j = i * 3; j < i * 3 + 4 * 3; ++j) {
        currentAttributes.prevPosition.values.push(prevPositions[j]);
        currentAttributes.nextPosition.values.push(nextPositions[j]);
      }
      for (j = i * 2; j < i * 2 + 4 * 2; ++j) {
        currentAttributes.expandAndWidth.values.push(expandAndWidths[j]);
        if (defined_default(texCoords)) {
          currentAttributes.st.values.push(texCoords[j]);
        }
      }
      if (defined_default(colors)) {
        for (j = i * 4; j < i * 4 + 4 * 4; ++j) {
          currentAttributes.color.values.push(colors[j]);
        }
      }
      index = currentAttributes.position.values.length / 3 - 4;
      currentIndices.push(index, index + 2, index + 1);
      currentIndices.push(index + 1, index + 2, index + 3);
    }
  }
  if (intersectionFound) {
    updateAdjacencyAfterSplit(westGeometry);
    updateAdjacencyAfterSplit(eastGeometry);
  }
  updateInstanceAfterSplit(instance, westGeometry, eastGeometry);
}
GeometryPipeline.splitLongitude = function(instance) {
  if (!defined_default(instance)) {
    throw new DeveloperError_default("instance is required.");
  }
  const geometry = instance.geometry;
  const boundingSphere = geometry.boundingSphere;
  if (defined_default(boundingSphere)) {
    const minX = boundingSphere.center.x - boundingSphere.radius;
    if (minX > 0 || BoundingSphere_default.intersectPlane(boundingSphere, Plane_default.ORIGIN_ZX_PLANE) !== Intersect_default.INTERSECTING) {
      return instance;
    }
  }
  if (geometry.geometryType !== GeometryType_default.NONE) {
    switch (geometry.geometryType) {
      case GeometryType_default.POLYLINES:
        splitLongitudePolyline(instance);
        break;
      case GeometryType_default.TRIANGLES:
        splitLongitudeTriangles(instance);
        break;
      case GeometryType_default.LINES:
        splitLongitudeLines(instance);
        break;
    }
  } else {
    indexPrimitive(geometry);
    if (geometry.primitiveType === PrimitiveType_default.TRIANGLES) {
      splitLongitudeTriangles(instance);
    } else if (geometry.primitiveType === PrimitiveType_default.LINES) {
      splitLongitudeLines(instance);
    }
  }
  return instance;
};
var GeometryPipeline_default = GeometryPipeline;

export {
  GeometryPipeline_default
};
