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
  RectangleGeometryLibrary_default
} from "./chunk-XQ7D3FQQ.js";
import {
  GeometryInstance_default
} from "./chunk-G4ABMSHX.js";
import {
  GeometryPipeline_default
} from "./chunk-NMEDZZL7.js";
import "./chunk-IJT7RSPE.js";
import "./chunk-54JVCS3Y.js";
import {
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
import {
  PolygonPipeline_default
} from "./chunk-3DTYZXHQ.js";
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
  Cartesian2_default,
  Matrix2_default,
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
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
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

// packages/engine/Source/Core/RectangleGeometry.js
var positionScratch = new Cartesian3_default();
var normalScratch = new Cartesian3_default();
var tangentScratch = new Cartesian3_default();
var bitangentScratch = new Cartesian3_default();
var rectangleScratch = new Rectangle_default();
var stScratch = new Cartesian2_default();
var bottomBoundingSphere = new BoundingSphere_default();
var topBoundingSphere = new BoundingSphere_default();
function createAttributes(vertexFormat, attributes) {
  const geo = new Geometry_default({
    attributes: new GeometryAttributes_default(),
    primitiveType: PrimitiveType_default.TRIANGLES
  });
  geo.attributes.position = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: attributes.positions
  });
  if (vertexFormat.normal) {
    geo.attributes.normal = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: attributes.normals
    });
  }
  if (vertexFormat.tangent) {
    geo.attributes.tangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: attributes.tangents
    });
  }
  if (vertexFormat.bitangent) {
    geo.attributes.bitangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: attributes.bitangents
    });
  }
  return geo;
}
function calculateAttributes(positions, vertexFormat, ellipsoid, tangentRotationMatrix) {
  const length = positions.length;
  const normals = vertexFormat.normal ? new Float32Array(length) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(length) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(length) : void 0;
  let attrIndex = 0;
  const bitangent = bitangentScratch;
  const tangent = tangentScratch;
  let normal = normalScratch;
  if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
    for (let i = 0; i < length; i += 3) {
      const p = Cartesian3_default.fromArray(positions, i, positionScratch);
      const attrIndex1 = attrIndex + 1;
      const attrIndex2 = attrIndex + 2;
      normal = ellipsoid.geodeticSurfaceNormal(p, normal);
      if (vertexFormat.tangent || vertexFormat.bitangent) {
        Cartesian3_default.cross(Cartesian3_default.UNIT_Z, normal, tangent);
        Matrix3_default.multiplyByVector(tangentRotationMatrix, tangent, tangent);
        Cartesian3_default.normalize(tangent, tangent);
        if (vertexFormat.bitangent) {
          Cartesian3_default.normalize(
            Cartesian3_default.cross(normal, tangent, bitangent),
            bitangent
          );
        }
      }
      if (vertexFormat.normal) {
        normals[attrIndex] = normal.x;
        normals[attrIndex1] = normal.y;
        normals[attrIndex2] = normal.z;
      }
      if (vertexFormat.tangent) {
        tangents[attrIndex] = tangent.x;
        tangents[attrIndex1] = tangent.y;
        tangents[attrIndex2] = tangent.z;
      }
      if (vertexFormat.bitangent) {
        bitangents[attrIndex] = bitangent.x;
        bitangents[attrIndex1] = bitangent.y;
        bitangents[attrIndex2] = bitangent.z;
      }
      attrIndex += 3;
    }
  }
  return createAttributes(vertexFormat, {
    positions,
    normals,
    tangents,
    bitangents
  });
}
var v1Scratch = new Cartesian3_default();
var v2Scratch = new Cartesian3_default();
function calculateAttributesWall(positions, vertexFormat, ellipsoid) {
  const length = positions.length;
  const normals = vertexFormat.normal ? new Float32Array(length) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(length) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(length) : void 0;
  let normalIndex = 0;
  let tangentIndex = 0;
  let bitangentIndex = 0;
  let recomputeNormal = true;
  let bitangent = bitangentScratch;
  let tangent = tangentScratch;
  let normal = normalScratch;
  if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
    for (let i = 0; i < length; i += 6) {
      const p = Cartesian3_default.fromArray(positions, i, positionScratch);
      const p1 = Cartesian3_default.fromArray(positions, (i + 6) % length, v1Scratch);
      if (recomputeNormal) {
        const p2 = Cartesian3_default.fromArray(positions, (i + 3) % length, v2Scratch);
        Cartesian3_default.subtract(p1, p, p1);
        Cartesian3_default.subtract(p2, p, p2);
        normal = Cartesian3_default.normalize(Cartesian3_default.cross(p2, p1, normal), normal);
        recomputeNormal = false;
      }
      if (Cartesian3_default.equalsEpsilon(p1, p, Math_default.EPSILON10)) {
        recomputeNormal = true;
      }
      if (vertexFormat.tangent || vertexFormat.bitangent) {
        bitangent = ellipsoid.geodeticSurfaceNormal(p, bitangent);
        if (vertexFormat.tangent) {
          tangent = Cartesian3_default.normalize(
            Cartesian3_default.cross(bitangent, normal, tangent),
            tangent
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
  return createAttributes(vertexFormat, {
    positions,
    normals,
    tangents,
    bitangents
  });
}
function constructRectangle(rectangleGeometry, computedOptions) {
  const vertexFormat = rectangleGeometry._vertexFormat;
  const ellipsoid = rectangleGeometry._ellipsoid;
  const height = computedOptions.height;
  const width = computedOptions.width;
  const northCap = computedOptions.northCap;
  const southCap = computedOptions.southCap;
  let rowStart = 0;
  let rowEnd = height;
  let rowHeight = height;
  let size = 0;
  if (northCap) {
    rowStart = 1;
    rowHeight -= 1;
    size += 1;
  }
  if (southCap) {
    rowEnd -= 1;
    rowHeight -= 1;
    size += 1;
  }
  size += width * rowHeight;
  const positions = vertexFormat.position ? new Float64Array(size * 3) : void 0;
  const textureCoordinates = vertexFormat.st ? new Float32Array(size * 2) : void 0;
  let posIndex = 0;
  let stIndex = 0;
  const position = positionScratch;
  const st = stScratch;
  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = -Number.MAX_VALUE;
  let maxY = -Number.MAX_VALUE;
  for (let row = rowStart; row < rowEnd; ++row) {
    for (let col = 0; col < width; ++col) {
      RectangleGeometryLibrary_default.computePosition(
        computedOptions,
        ellipsoid,
        vertexFormat.st,
        row,
        col,
        position,
        st
      );
      positions[posIndex++] = position.x;
      positions[posIndex++] = position.y;
      positions[posIndex++] = position.z;
      if (vertexFormat.st) {
        textureCoordinates[stIndex++] = st.x;
        textureCoordinates[stIndex++] = st.y;
        minX = Math.min(minX, st.x);
        minY = Math.min(minY, st.y);
        maxX = Math.max(maxX, st.x);
        maxY = Math.max(maxY, st.y);
      }
    }
  }
  if (northCap) {
    RectangleGeometryLibrary_default.computePosition(
      computedOptions,
      ellipsoid,
      vertexFormat.st,
      0,
      0,
      position,
      st
    );
    positions[posIndex++] = position.x;
    positions[posIndex++] = position.y;
    positions[posIndex++] = position.z;
    if (vertexFormat.st) {
      textureCoordinates[stIndex++] = st.x;
      textureCoordinates[stIndex++] = st.y;
      minX = st.x;
      minY = st.y;
      maxX = st.x;
      maxY = st.y;
    }
  }
  if (southCap) {
    RectangleGeometryLibrary_default.computePosition(
      computedOptions,
      ellipsoid,
      vertexFormat.st,
      height - 1,
      0,
      position,
      st
    );
    positions[posIndex++] = position.x;
    positions[posIndex++] = position.y;
    positions[posIndex] = position.z;
    if (vertexFormat.st) {
      textureCoordinates[stIndex++] = st.x;
      textureCoordinates[stIndex] = st.y;
      minX = Math.min(minX, st.x);
      minY = Math.min(minY, st.y);
      maxX = Math.max(maxX, st.x);
      maxY = Math.max(maxY, st.y);
    }
  }
  if (vertexFormat.st && (minX < 0 || minY < 0 || maxX > 1 || maxY > 1)) {
    for (let k = 0; k < textureCoordinates.length; k += 2) {
      textureCoordinates[k] = (textureCoordinates[k] - minX) / (maxX - minX);
      textureCoordinates[k + 1] = (textureCoordinates[k + 1] - minY) / (maxY - minY);
    }
  }
  const geo = calculateAttributes(
    positions,
    vertexFormat,
    ellipsoid,
    computedOptions.tangentRotationMatrix
  );
  let indicesSize = 6 * (width - 1) * (rowHeight - 1);
  if (northCap) {
    indicesSize += 3 * (width - 1);
  }
  if (southCap) {
    indicesSize += 3 * (width - 1);
  }
  const indices = IndexDatatype_default.createTypedArray(size, indicesSize);
  let index = 0;
  let indicesIndex = 0;
  let i;
  for (i = 0; i < rowHeight - 1; ++i) {
    for (let j = 0; j < width - 1; ++j) {
      const upperLeft = index;
      const lowerLeft = upperLeft + width;
      const lowerRight = lowerLeft + 1;
      const upperRight = upperLeft + 1;
      indices[indicesIndex++] = upperLeft;
      indices[indicesIndex++] = lowerLeft;
      indices[indicesIndex++] = upperRight;
      indices[indicesIndex++] = upperRight;
      indices[indicesIndex++] = lowerLeft;
      indices[indicesIndex++] = lowerRight;
      ++index;
    }
    ++index;
  }
  if (northCap || southCap) {
    let northIndex = size - 1;
    const southIndex = size - 1;
    if (northCap && southCap) {
      northIndex = size - 2;
    }
    let p1;
    let p2;
    index = 0;
    if (northCap) {
      for (i = 0; i < width - 1; i++) {
        p1 = index;
        p2 = p1 + 1;
        indices[indicesIndex++] = northIndex;
        indices[indicesIndex++] = p1;
        indices[indicesIndex++] = p2;
        ++index;
      }
    }
    if (southCap) {
      index = (rowHeight - 1) * width;
      for (i = 0; i < width - 1; i++) {
        p1 = index;
        p2 = p1 + 1;
        indices[indicesIndex++] = p1;
        indices[indicesIndex++] = southIndex;
        indices[indicesIndex++] = p2;
        ++index;
      }
    }
  }
  geo.indices = indices;
  if (vertexFormat.st) {
    geo.attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: textureCoordinates
    });
  }
  return geo;
}
function addWallPositions(wallPositions, posIndex, i, topPositions, bottomPositions) {
  wallPositions[posIndex++] = topPositions[i];
  wallPositions[posIndex++] = topPositions[i + 1];
  wallPositions[posIndex++] = topPositions[i + 2];
  wallPositions[posIndex++] = bottomPositions[i];
  wallPositions[posIndex++] = bottomPositions[i + 1];
  wallPositions[posIndex] = bottomPositions[i + 2];
  return wallPositions;
}
function addWallTextureCoordinates(wallTextures, stIndex, i, st) {
  wallTextures[stIndex++] = st[i];
  wallTextures[stIndex++] = st[i + 1];
  wallTextures[stIndex++] = st[i];
  wallTextures[stIndex] = st[i + 1];
  return wallTextures;
}
var scratchVertexFormat = new VertexFormat_default();
function constructExtrudedRectangle(rectangleGeometry, computedOptions) {
  const shadowVolume = rectangleGeometry._shadowVolume;
  const offsetAttributeValue = rectangleGeometry._offsetAttribute;
  const vertexFormat = rectangleGeometry._vertexFormat;
  const minHeight = rectangleGeometry._extrudedHeight;
  const maxHeight = rectangleGeometry._surfaceHeight;
  const ellipsoid = rectangleGeometry._ellipsoid;
  const height = computedOptions.height;
  const width = computedOptions.width;
  let i;
  if (shadowVolume) {
    const newVertexFormat = VertexFormat_default.clone(
      vertexFormat,
      scratchVertexFormat
    );
    newVertexFormat.normal = true;
    rectangleGeometry._vertexFormat = newVertexFormat;
  }
  const topBottomGeo = constructRectangle(rectangleGeometry, computedOptions);
  if (shadowVolume) {
    rectangleGeometry._vertexFormat = vertexFormat;
  }
  let topPositions = PolygonPipeline_default.scaleToGeodeticHeight(
    topBottomGeo.attributes.position.values,
    maxHeight,
    ellipsoid,
    false
  );
  topPositions = new Float64Array(topPositions);
  let length = topPositions.length;
  const newLength = length * 2;
  const positions = new Float64Array(newLength);
  positions.set(topPositions);
  const bottomPositions = PolygonPipeline_default.scaleToGeodeticHeight(
    topBottomGeo.attributes.position.values,
    minHeight,
    ellipsoid
  );
  positions.set(bottomPositions, length);
  topBottomGeo.attributes.position.values = positions;
  const normals = vertexFormat.normal ? new Float32Array(newLength) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(newLength) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(newLength) : void 0;
  const textures = vertexFormat.st ? new Float32Array(newLength / 3 * 2) : void 0;
  let topSt;
  let topNormals;
  if (vertexFormat.normal) {
    topNormals = topBottomGeo.attributes.normal.values;
    normals.set(topNormals);
    for (i = 0; i < length; i++) {
      topNormals[i] = -topNormals[i];
    }
    normals.set(topNormals, length);
    topBottomGeo.attributes.normal.values = normals;
  }
  if (shadowVolume) {
    topNormals = topBottomGeo.attributes.normal.values;
    if (!vertexFormat.normal) {
      topBottomGeo.attributes.normal = void 0;
    }
    const extrudeNormals = new Float32Array(newLength);
    for (i = 0; i < length; i++) {
      topNormals[i] = -topNormals[i];
    }
    extrudeNormals.set(topNormals, length);
    topBottomGeo.attributes.extrudeDirection = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: extrudeNormals
    });
  }
  let offsetValue;
  const hasOffsets = defined_default(offsetAttributeValue);
  if (hasOffsets) {
    const size = length / 3 * 2;
    let offsetAttribute = new Uint8Array(size);
    if (offsetAttributeValue === GeometryOffsetAttribute_default.TOP) {
      offsetAttribute = offsetAttribute.fill(1, 0, size / 2);
    } else {
      offsetValue = offsetAttributeValue === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      offsetAttribute = offsetAttribute.fill(offsetValue);
    }
    topBottomGeo.attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: offsetAttribute
    });
  }
  if (vertexFormat.tangent) {
    const topTangents = topBottomGeo.attributes.tangent.values;
    tangents.set(topTangents);
    for (i = 0; i < length; i++) {
      topTangents[i] = -topTangents[i];
    }
    tangents.set(topTangents, length);
    topBottomGeo.attributes.tangent.values = tangents;
  }
  if (vertexFormat.bitangent) {
    const topBitangents = topBottomGeo.attributes.bitangent.values;
    bitangents.set(topBitangents);
    bitangents.set(topBitangents, length);
    topBottomGeo.attributes.bitangent.values = bitangents;
  }
  if (vertexFormat.st) {
    topSt = topBottomGeo.attributes.st.values;
    textures.set(topSt);
    textures.set(topSt, length / 3 * 2);
    topBottomGeo.attributes.st.values = textures;
  }
  const indices = topBottomGeo.indices;
  const indicesLength = indices.length;
  const posLength = length / 3;
  const newIndices = IndexDatatype_default.createTypedArray(
    newLength / 3,
    indicesLength * 2
  );
  newIndices.set(indices);
  for (i = 0; i < indicesLength; i += 3) {
    newIndices[i + indicesLength] = indices[i + 2] + posLength;
    newIndices[i + 1 + indicesLength] = indices[i + 1] + posLength;
    newIndices[i + 2 + indicesLength] = indices[i] + posLength;
  }
  topBottomGeo.indices = newIndices;
  const northCap = computedOptions.northCap;
  const southCap = computedOptions.southCap;
  let rowHeight = height;
  let widthMultiplier = 2;
  let perimeterPositions = 0;
  let corners = 4;
  let dupliateCorners = 4;
  if (northCap) {
    widthMultiplier -= 1;
    rowHeight -= 1;
    perimeterPositions += 1;
    corners -= 2;
    dupliateCorners -= 1;
  }
  if (southCap) {
    widthMultiplier -= 1;
    rowHeight -= 1;
    perimeterPositions += 1;
    corners -= 2;
    dupliateCorners -= 1;
  }
  perimeterPositions += widthMultiplier * width + 2 * rowHeight - corners;
  const wallCount = (perimeterPositions + dupliateCorners) * 2;
  let wallPositions = new Float64Array(wallCount * 3);
  const wallExtrudeNormals = shadowVolume ? new Float32Array(wallCount * 3) : void 0;
  let wallOffsetAttribute = hasOffsets ? new Uint8Array(wallCount) : void 0;
  let wallTextures = vertexFormat.st ? new Float32Array(wallCount * 2) : void 0;
  const computeTopOffsets = offsetAttributeValue === GeometryOffsetAttribute_default.TOP;
  if (hasOffsets && !computeTopOffsets) {
    offsetValue = offsetAttributeValue === GeometryOffsetAttribute_default.ALL ? 1 : 0;
    wallOffsetAttribute = wallOffsetAttribute.fill(offsetValue);
  }
  let posIndex = 0;
  let stIndex = 0;
  let extrudeNormalIndex = 0;
  let wallOffsetIndex = 0;
  const area = width * rowHeight;
  let threeI;
  for (i = 0; i < area; i += width) {
    threeI = i * 3;
    wallPositions = addWallPositions(
      wallPositions,
      posIndex,
      threeI,
      topPositions,
      bottomPositions
    );
    posIndex += 6;
    if (vertexFormat.st) {
      wallTextures = addWallTextureCoordinates(
        wallTextures,
        stIndex,
        i * 2,
        topSt
      );
      stIndex += 4;
    }
    if (shadowVolume) {
      extrudeNormalIndex += 3;
      wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
      wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
      wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
    }
    if (computeTopOffsets) {
      wallOffsetAttribute[wallOffsetIndex++] = 1;
      wallOffsetIndex += 1;
    }
  }
  if (!southCap) {
    for (i = area - width; i < area; i++) {
      threeI = i * 3;
      wallPositions = addWallPositions(
        wallPositions,
        posIndex,
        threeI,
        topPositions,
        bottomPositions
      );
      posIndex += 6;
      if (vertexFormat.st) {
        wallTextures = addWallTextureCoordinates(
          wallTextures,
          stIndex,
          i * 2,
          topSt
        );
        stIndex += 4;
      }
      if (shadowVolume) {
        extrudeNormalIndex += 3;
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
      }
      if (computeTopOffsets) {
        wallOffsetAttribute[wallOffsetIndex++] = 1;
        wallOffsetIndex += 1;
      }
    }
  } else {
    const southIndex = northCap ? area + 1 : area;
    threeI = southIndex * 3;
    for (i = 0; i < 2; i++) {
      wallPositions = addWallPositions(
        wallPositions,
        posIndex,
        threeI,
        topPositions,
        bottomPositions
      );
      posIndex += 6;
      if (vertexFormat.st) {
        wallTextures = addWallTextureCoordinates(
          wallTextures,
          stIndex,
          southIndex * 2,
          topSt
        );
        stIndex += 4;
      }
      if (shadowVolume) {
        extrudeNormalIndex += 3;
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
      }
      if (computeTopOffsets) {
        wallOffsetAttribute[wallOffsetIndex++] = 1;
        wallOffsetIndex += 1;
      }
    }
  }
  for (i = area - 1; i > 0; i -= width) {
    threeI = i * 3;
    wallPositions = addWallPositions(
      wallPositions,
      posIndex,
      threeI,
      topPositions,
      bottomPositions
    );
    posIndex += 6;
    if (vertexFormat.st) {
      wallTextures = addWallTextureCoordinates(
        wallTextures,
        stIndex,
        i * 2,
        topSt
      );
      stIndex += 4;
    }
    if (shadowVolume) {
      extrudeNormalIndex += 3;
      wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
      wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
      wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
    }
    if (computeTopOffsets) {
      wallOffsetAttribute[wallOffsetIndex++] = 1;
      wallOffsetIndex += 1;
    }
  }
  if (!northCap) {
    for (i = width - 1; i >= 0; i--) {
      threeI = i * 3;
      wallPositions = addWallPositions(
        wallPositions,
        posIndex,
        threeI,
        topPositions,
        bottomPositions
      );
      posIndex += 6;
      if (vertexFormat.st) {
        wallTextures = addWallTextureCoordinates(
          wallTextures,
          stIndex,
          i * 2,
          topSt
        );
        stIndex += 4;
      }
      if (shadowVolume) {
        extrudeNormalIndex += 3;
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
      }
      if (computeTopOffsets) {
        wallOffsetAttribute[wallOffsetIndex++] = 1;
        wallOffsetIndex += 1;
      }
    }
  } else {
    const northIndex = area;
    threeI = northIndex * 3;
    for (i = 0; i < 2; i++) {
      wallPositions = addWallPositions(
        wallPositions,
        posIndex,
        threeI,
        topPositions,
        bottomPositions
      );
      posIndex += 6;
      if (vertexFormat.st) {
        wallTextures = addWallTextureCoordinates(
          wallTextures,
          stIndex,
          northIndex * 2,
          topSt
        );
        stIndex += 4;
      }
      if (shadowVolume) {
        extrudeNormalIndex += 3;
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 1];
        wallExtrudeNormals[extrudeNormalIndex++] = topNormals[threeI + 2];
      }
      if (computeTopOffsets) {
        wallOffsetAttribute[wallOffsetIndex++] = 1;
        wallOffsetIndex += 1;
      }
    }
  }
  let geo = calculateAttributesWall(wallPositions, vertexFormat, ellipsoid);
  if (vertexFormat.st) {
    geo.attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: wallTextures
    });
  }
  if (shadowVolume) {
    geo.attributes.extrudeDirection = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: wallExtrudeNormals
    });
  }
  if (hasOffsets) {
    geo.attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: wallOffsetAttribute
    });
  }
  const wallIndices = IndexDatatype_default.createTypedArray(
    wallCount,
    perimeterPositions * 6
  );
  let upperLeft;
  let lowerLeft;
  let lowerRight;
  let upperRight;
  length = wallPositions.length / 3;
  let index = 0;
  for (i = 0; i < length - 1; i += 2) {
    upperLeft = i;
    upperRight = (upperLeft + 2) % length;
    const p1 = Cartesian3_default.fromArray(wallPositions, upperLeft * 3, v1Scratch);
    const p2 = Cartesian3_default.fromArray(wallPositions, upperRight * 3, v2Scratch);
    if (Cartesian3_default.equalsEpsilon(p1, p2, Math_default.EPSILON10)) {
      continue;
    }
    lowerLeft = (upperLeft + 1) % length;
    lowerRight = (lowerLeft + 2) % length;
    wallIndices[index++] = upperLeft;
    wallIndices[index++] = lowerLeft;
    wallIndices[index++] = upperRight;
    wallIndices[index++] = upperRight;
    wallIndices[index++] = lowerLeft;
    wallIndices[index++] = lowerRight;
  }
  geo.indices = wallIndices;
  geo = GeometryPipeline_default.combineInstances([
    new GeometryInstance_default({
      geometry: topBottomGeo
    }),
    new GeometryInstance_default({
      geometry: geo
    })
  ]);
  return geo[0];
}
var scratchRectanglePoints = [
  new Cartesian3_default(),
  new Cartesian3_default(),
  new Cartesian3_default(),
  new Cartesian3_default()
];
var nwScratch = new Cartographic_default();
var stNwScratch = new Cartographic_default();
function computeRectangle(rectangle, granularity, rotation, ellipsoid, result) {
  if (rotation === 0) {
    return Rectangle_default.clone(rectangle, result);
  }
  const computedOptions = RectangleGeometryLibrary_default.computeOptions(
    rectangle,
    granularity,
    rotation,
    0,
    rectangleScratch,
    nwScratch
  );
  const height = computedOptions.height;
  const width = computedOptions.width;
  const positions = scratchRectanglePoints;
  RectangleGeometryLibrary_default.computePosition(
    computedOptions,
    ellipsoid,
    false,
    0,
    0,
    positions[0]
  );
  RectangleGeometryLibrary_default.computePosition(
    computedOptions,
    ellipsoid,
    false,
    0,
    width - 1,
    positions[1]
  );
  RectangleGeometryLibrary_default.computePosition(
    computedOptions,
    ellipsoid,
    false,
    height - 1,
    0,
    positions[2]
  );
  RectangleGeometryLibrary_default.computePosition(
    computedOptions,
    ellipsoid,
    false,
    height - 1,
    width - 1,
    positions[3]
  );
  return Rectangle_default.fromCartesianArray(positions, ellipsoid, result);
}
function RectangleGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const rectangle = options.rectangle;
  Check_default.typeOf.object("rectangle", rectangle);
  Rectangle_default.validate(rectangle);
  if (rectangle.north < rectangle.south) {
    throw new DeveloperError_default(
      "options.rectangle.north must be greater than or equal to options.rectangle.south"
    );
  }
  const height = defaultValue_default(options.height, 0);
  const extrudedHeight = defaultValue_default(options.extrudedHeight, height);
  this._rectangle = Rectangle_default.clone(rectangle);
  this._granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  this._ellipsoid = Ellipsoid_default.clone(
    defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84)
  );
  this._surfaceHeight = Math.max(height, extrudedHeight);
  this._rotation = defaultValue_default(options.rotation, 0);
  this._stRotation = defaultValue_default(options.stRotation, 0);
  this._vertexFormat = VertexFormat_default.clone(
    defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT)
  );
  this._extrudedHeight = Math.min(height, extrudedHeight);
  this._shadowVolume = defaultValue_default(options.shadowVolume, false);
  this._workerName = "createRectangleGeometry";
  this._offsetAttribute = options.offsetAttribute;
  this._rotatedRectangle = void 0;
  this._textureCoordinateRotationPoints = void 0;
}
RectangleGeometry.packedLength = Rectangle_default.packedLength + Ellipsoid_default.packedLength + VertexFormat_default.packedLength + 7;
RectangleGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  Rectangle_default.pack(value._rectangle, array, startingIndex);
  startingIndex += Rectangle_default.packedLength;
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._granularity;
  array[startingIndex++] = value._surfaceHeight;
  array[startingIndex++] = value._rotation;
  array[startingIndex++] = value._stRotation;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._shadowVolume ? 1 : 0;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchRectangle = new Rectangle_default();
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchOptions = {
  rectangle: scratchRectangle,
  ellipsoid: scratchEllipsoid,
  vertexFormat: scratchVertexFormat,
  granularity: void 0,
  height: void 0,
  rotation: void 0,
  stRotation: void 0,
  extrudedHeight: void 0,
  shadowVolume: void 0,
  offsetAttribute: void 0
};
RectangleGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const rectangle = Rectangle_default.unpack(array, startingIndex, scratchRectangle);
  startingIndex += Rectangle_default.packedLength;
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const granularity = array[startingIndex++];
  const surfaceHeight = array[startingIndex++];
  const rotation = array[startingIndex++];
  const stRotation = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const shadowVolume = array[startingIndex++] === 1;
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.granularity = granularity;
    scratchOptions.height = surfaceHeight;
    scratchOptions.rotation = rotation;
    scratchOptions.stRotation = stRotation;
    scratchOptions.extrudedHeight = extrudedHeight;
    scratchOptions.shadowVolume = shadowVolume;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new RectangleGeometry(scratchOptions);
  }
  result._rectangle = Rectangle_default.clone(rectangle, result._rectangle);
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._granularity = granularity;
  result._surfaceHeight = surfaceHeight;
  result._rotation = rotation;
  result._stRotation = stRotation;
  result._extrudedHeight = extrudedHeight;
  result._shadowVolume = shadowVolume;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
RectangleGeometry.computeRectangle = function(options, result) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const rectangle = options.rectangle;
  Check_default.typeOf.object("rectangle", rectangle);
  Rectangle_default.validate(rectangle);
  if (rectangle.north < rectangle.south) {
    throw new DeveloperError_default(
      "options.rectangle.north must be greater than or equal to options.rectangle.south"
    );
  }
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  const rotation = defaultValue_default(options.rotation, 0);
  return computeRectangle(rectangle, granularity, rotation, ellipsoid, result);
};
var tangentRotationMatrixScratch = new Matrix3_default();
var quaternionScratch = new Quaternion_default();
var centerScratch = new Cartographic_default();
RectangleGeometry.createGeometry = function(rectangleGeometry) {
  if (Math_default.equalsEpsilon(
    rectangleGeometry._rectangle.north,
    rectangleGeometry._rectangle.south,
    Math_default.EPSILON10
  ) || Math_default.equalsEpsilon(
    rectangleGeometry._rectangle.east,
    rectangleGeometry._rectangle.west,
    Math_default.EPSILON10
  )) {
    return void 0;
  }
  let rectangle = rectangleGeometry._rectangle;
  const ellipsoid = rectangleGeometry._ellipsoid;
  const rotation = rectangleGeometry._rotation;
  const stRotation = rectangleGeometry._stRotation;
  const vertexFormat = rectangleGeometry._vertexFormat;
  const computedOptions = RectangleGeometryLibrary_default.computeOptions(
    rectangle,
    rectangleGeometry._granularity,
    rotation,
    stRotation,
    rectangleScratch,
    nwScratch,
    stNwScratch
  );
  const tangentRotationMatrix = tangentRotationMatrixScratch;
  if (stRotation !== 0 || rotation !== 0) {
    const center = Rectangle_default.center(rectangle, centerScratch);
    const axis = ellipsoid.geodeticSurfaceNormalCartographic(center, v1Scratch);
    Quaternion_default.fromAxisAngle(axis, -stRotation, quaternionScratch);
    Matrix3_default.fromQuaternion(quaternionScratch, tangentRotationMatrix);
  } else {
    Matrix3_default.clone(Matrix3_default.IDENTITY, tangentRotationMatrix);
  }
  const surfaceHeight = rectangleGeometry._surfaceHeight;
  const extrudedHeight = rectangleGeometry._extrudedHeight;
  const extrude = !Math_default.equalsEpsilon(
    surfaceHeight,
    extrudedHeight,
    0,
    Math_default.EPSILON2
  );
  computedOptions.lonScalar = 1 / rectangleGeometry._rectangle.width;
  computedOptions.latScalar = 1 / rectangleGeometry._rectangle.height;
  computedOptions.tangentRotationMatrix = tangentRotationMatrix;
  let geometry;
  let boundingSphere;
  rectangle = rectangleGeometry._rectangle;
  if (extrude) {
    geometry = constructExtrudedRectangle(rectangleGeometry, computedOptions);
    const topBS = BoundingSphere_default.fromRectangle3D(
      rectangle,
      ellipsoid,
      surfaceHeight,
      topBoundingSphere
    );
    const bottomBS = BoundingSphere_default.fromRectangle3D(
      rectangle,
      ellipsoid,
      extrudedHeight,
      bottomBoundingSphere
    );
    boundingSphere = BoundingSphere_default.union(topBS, bottomBS);
  } else {
    geometry = constructRectangle(rectangleGeometry, computedOptions);
    geometry.attributes.position.values = PolygonPipeline_default.scaleToGeodeticHeight(
      geometry.attributes.position.values,
      surfaceHeight,
      ellipsoid,
      false
    );
    if (defined_default(rectangleGeometry._offsetAttribute)) {
      const length = geometry.attributes.position.values.length;
      const offsetValue = rectangleGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
      geometry.attributes.applyOffset = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset
      });
    }
    boundingSphere = BoundingSphere_default.fromRectangle3D(
      rectangle,
      ellipsoid,
      surfaceHeight
    );
  }
  if (!vertexFormat.position) {
    delete geometry.attributes.position;
  }
  return new Geometry_default({
    attributes: geometry.attributes,
    indices: geometry.indices,
    primitiveType: geometry.primitiveType,
    boundingSphere,
    offsetAttribute: rectangleGeometry._offsetAttribute
  });
};
RectangleGeometry.createShadowVolume = function(rectangleGeometry, minHeightFunc, maxHeightFunc) {
  const granularity = rectangleGeometry._granularity;
  const ellipsoid = rectangleGeometry._ellipsoid;
  const minHeight = minHeightFunc(granularity, ellipsoid);
  const maxHeight = maxHeightFunc(granularity, ellipsoid);
  return new RectangleGeometry({
    rectangle: rectangleGeometry._rectangle,
    rotation: rectangleGeometry._rotation,
    ellipsoid,
    stRotation: rectangleGeometry._stRotation,
    granularity,
    extrudedHeight: maxHeight,
    height: minHeight,
    vertexFormat: VertexFormat_default.POSITION_ONLY,
    shadowVolume: true
  });
};
var unrotatedTextureRectangleScratch = new Rectangle_default();
var points2DScratch = [new Cartesian2_default(), new Cartesian2_default(), new Cartesian2_default()];
var rotation2DScratch = new Matrix2_default();
var rectangleCenterScratch = new Cartographic_default();
function textureCoordinateRotationPoints(rectangleGeometry) {
  if (rectangleGeometry._stRotation === 0) {
    return [0, 0, 0, 1, 1, 0];
  }
  const rectangle = Rectangle_default.clone(
    rectangleGeometry._rectangle,
    unrotatedTextureRectangleScratch
  );
  const granularity = rectangleGeometry._granularity;
  const ellipsoid = rectangleGeometry._ellipsoid;
  const rotation = rectangleGeometry._rotation - rectangleGeometry._stRotation;
  const unrotatedTextureRectangle = computeRectangle(
    rectangle,
    granularity,
    rotation,
    ellipsoid,
    unrotatedTextureRectangleScratch
  );
  const points2D = points2DScratch;
  points2D[0].x = unrotatedTextureRectangle.west;
  points2D[0].y = unrotatedTextureRectangle.south;
  points2D[1].x = unrotatedTextureRectangle.west;
  points2D[1].y = unrotatedTextureRectangle.north;
  points2D[2].x = unrotatedTextureRectangle.east;
  points2D[2].y = unrotatedTextureRectangle.south;
  const boundingRectangle = rectangleGeometry.rectangle;
  const toDesiredInComputed = Matrix2_default.fromRotation(
    rectangleGeometry._stRotation,
    rotation2DScratch
  );
  const boundingRectangleCenter = Rectangle_default.center(
    boundingRectangle,
    rectangleCenterScratch
  );
  for (let i = 0; i < 3; ++i) {
    const point2D = points2D[i];
    point2D.x -= boundingRectangleCenter.longitude;
    point2D.y -= boundingRectangleCenter.latitude;
    Matrix2_default.multiplyByVector(toDesiredInComputed, point2D, point2D);
    point2D.x += boundingRectangleCenter.longitude;
    point2D.y += boundingRectangleCenter.latitude;
    point2D.x = (point2D.x - boundingRectangle.west) / boundingRectangle.width;
    point2D.y = (point2D.y - boundingRectangle.south) / boundingRectangle.height;
  }
  const minXYCorner = points2D[0];
  const maxYCorner = points2D[1];
  const maxXCorner = points2D[2];
  const result = new Array(6);
  Cartesian2_default.pack(minXYCorner, result);
  Cartesian2_default.pack(maxYCorner, result, 2);
  Cartesian2_default.pack(maxXCorner, result, 4);
  return result;
}
Object.defineProperties(RectangleGeometry.prototype, {
  /**
   * @private
   */
  rectangle: {
    get: function() {
      if (!defined_default(this._rotatedRectangle)) {
        this._rotatedRectangle = computeRectangle(
          this._rectangle,
          this._granularity,
          this._rotation,
          this._ellipsoid
        );
      }
      return this._rotatedRectangle;
    }
  },
  /**
   * For remapping texture coordinates when rendering RectangleGeometries as GroundPrimitives.
   * This version permits skew in textures by computing offsets directly in cartographic space and
   * more accurately approximates rendering RectangleGeometries with height as standard Primitives.
   * @see Geometry#_textureCoordinateRotationPoints
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
var RectangleGeometry_default = RectangleGeometry;

// packages/engine/Source/Workers/createRectangleGeometry.js
function createRectangleGeometry(rectangleGeometry, offset) {
  if (defined_default(offset)) {
    rectangleGeometry = RectangleGeometry_default.unpack(rectangleGeometry, offset);
  }
  rectangleGeometry._ellipsoid = Ellipsoid_default.clone(rectangleGeometry._ellipsoid);
  rectangleGeometry._rectangle = Rectangle_default.clone(rectangleGeometry._rectangle);
  return RectangleGeometry_default.createGeometry(rectangleGeometry);
}
var createRectangleGeometry_default = createRectangleGeometry;
export {
  createRectangleGeometry_default as default
};
