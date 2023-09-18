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
  require_draco_decoder_nodejs
} from "./chunk-AOEIPTN4.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-V2Y7GTNU.js";
import {
  WebMercatorProjection_default
} from "./chunk-BWREGNKG.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import "./chunk-63W23YZY.js";
import "./chunk-J64Y4DQH.js";
import {
  __toESM,
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Workers/decodeI3S.js
var import_draco_decoder_nodejs = __toESM(require_draco_decoder_nodejs(), 1);
var draco;
function bilinearInterpolate(tx, ty, h00, h10, h01, h11) {
  const a = h00 * (1 - tx) + h10 * tx;
  const b = h01 * (1 - tx) + h11 * tx;
  return a * (1 - ty) + b * ty;
}
function sampleMap(u, v, width, data) {
  const address = u + v * width;
  return data[address];
}
function sampleGeoid(sampleX, sampleY, geoidData) {
  const extent = geoidData.nativeExtent;
  let x = (sampleX - extent.west) / (extent.east - extent.west) * (geoidData.width - 1);
  let y = (sampleY - extent.south) / (extent.north - extent.south) * (geoidData.height - 1);
  const xi = Math.floor(x);
  let yi = Math.floor(y);
  x -= xi;
  y -= yi;
  const xNext = xi < geoidData.width ? xi + 1 : xi;
  let yNext = yi < geoidData.height ? yi + 1 : yi;
  yi = geoidData.height - 1 - yi;
  yNext = geoidData.height - 1 - yNext;
  const h00 = sampleMap(xi, yi, geoidData.width, geoidData.buffer);
  const h10 = sampleMap(xNext, yi, geoidData.width, geoidData.buffer);
  const h01 = sampleMap(xi, yNext, geoidData.width, geoidData.buffer);
  const h11 = sampleMap(xNext, yNext, geoidData.width, geoidData.buffer);
  let finalHeight = bilinearInterpolate(x, y, h00, h10, h01, h11);
  finalHeight = finalHeight * geoidData.scale + geoidData.offset;
  return finalHeight;
}
function sampleGeoidFromList(lon, lat, geoidDataList) {
  for (let i = 0; i < geoidDataList.length; i++) {
    const localExtent = geoidDataList[i].nativeExtent;
    let localPt = new Cartesian3_default();
    if (geoidDataList[i].projectionType === "WebMercator") {
      const radii = geoidDataList[i].projection._ellipsoid._radii;
      const webMercatorProj = new WebMercatorProjection_default(
        new Ellipsoid_default(radii.x, radii.y, radii.z)
      );
      localPt = webMercatorProj.project(new Cartographic_default(lon, lat, 0));
    } else {
      localPt.x = lon;
      localPt.y = lat;
    }
    if (localPt.x > localExtent.west && localPt.x < localExtent.east && localPt.y > localExtent.south && localPt.y < localExtent.north) {
      return sampleGeoid(localPt.x, localPt.y, geoidDataList[i]);
    }
  }
  return 0;
}
function orthometricToEllipsoidal(vertexCount, position, scale_x, scale_y, center, geoidDataList, fast) {
  if (fast) {
    return;
  }
  const centerHeight = sampleGeoidFromList(
    center.longitude,
    center.latitude,
    geoidDataList
  );
  for (let i = 0; i < vertexCount; ++i) {
    const height = sampleGeoidFromList(
      center.longitude + Math_default.toRadians(scale_x * position[i * 3]),
      center.latitude + Math_default.toRadians(scale_y * position[i * 3 + 1]),
      geoidDataList
    );
    position[i * 3 + 2] += height - centerHeight;
  }
}
function transformToLocal(vertexCount, positions, normals, cartographicCenter, cartesianCenter, parentRotation, ellipsoidRadiiSquare, scale_x, scale_y) {
  if (vertexCount === 0 || !defined_default(positions) || positions.length === 0) {
    return;
  }
  const ellipsoid = new Ellipsoid_default(
    Math.sqrt(ellipsoidRadiiSquare.x),
    Math.sqrt(ellipsoidRadiiSquare.y),
    Math.sqrt(ellipsoidRadiiSquare.z)
  );
  for (let i = 0; i < vertexCount; ++i) {
    const indexOffset = i * 3;
    const indexOffset1 = indexOffset + 1;
    const indexOffset2 = indexOffset + 2;
    const cartographic = new Cartographic_default();
    cartographic.longitude = cartographicCenter.longitude + Math_default.toRadians(scale_x * positions[indexOffset]);
    cartographic.latitude = cartographicCenter.latitude + Math_default.toRadians(scale_y * positions[indexOffset1]);
    cartographic.height = cartographicCenter.height + positions[indexOffset2];
    const position = {};
    ellipsoid.cartographicToCartesian(cartographic, position);
    position.x -= cartesianCenter.x;
    position.y -= cartesianCenter.y;
    position.z -= cartesianCenter.z;
    const rotatedPosition = {};
    Matrix3_default.multiplyByVector(parentRotation, position, rotatedPosition);
    positions[indexOffset] = rotatedPosition.x;
    positions[indexOffset1] = rotatedPosition.y;
    positions[indexOffset2] = rotatedPosition.z;
    if (defined_default(normals)) {
      const normal = new Cartesian3_default(
        normals[indexOffset],
        normals[indexOffset1],
        normals[indexOffset2]
      );
      const rotatedNormal = {};
      Matrix3_default.multiplyByVector(parentRotation, normal, rotatedNormal);
      normals[indexOffset] = rotatedNormal.x;
      normals[indexOffset1] = rotatedNormal.y;
      normals[indexOffset2] = rotatedNormal.z;
    }
  }
}
function cropUVs(vertexCount, uv0s, uvRegions) {
  for (let vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
    const minU = uvRegions[vertexIndex * 4] / 65535;
    const minV = uvRegions[vertexIndex * 4 + 1] / 65535;
    const scaleU = (uvRegions[vertexIndex * 4 + 2] - uvRegions[vertexIndex * 4]) / 65535;
    const scaleV = (uvRegions[vertexIndex * 4 + 3] - uvRegions[vertexIndex * 4 + 1]) / 65535;
    uv0s[vertexIndex * 2] *= scaleU;
    uv0s[vertexIndex * 2] += minU;
    uv0s[vertexIndex * 2 + 1] *= scaleV;
    uv0s[vertexIndex * 2 + 1] += minV;
  }
}
function generateGltfBuffer(vertexCount, indices, positions, normals, uv0s, colors) {
  if (vertexCount === 0 || !defined_default(positions) || positions.length === 0) {
    return {
      buffers: [],
      bufferViews: [],
      accessors: [],
      meshes: [],
      nodes: [],
      nodesInScene: []
    };
  }
  const buffers = [];
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];
  const nodesInScene = [];
  if (defined_default(indices)) {
    vertexCount = indices.length;
  }
  const indexArray = new Uint32Array(vertexCount);
  if (defined_default(indices)) {
    for (let vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
      indexArray[vertexIndex] = indices[vertexIndex];
    }
  } else {
    for (let newVertexIndex = 0; newVertexIndex < vertexCount; ++newVertexIndex) {
      indexArray[newVertexIndex] = newVertexIndex;
    }
  }
  const indicesBlob = new Blob([indexArray], { type: "application/binary" });
  const indicesURL = URL.createObjectURL(indicesBlob);
  const endIndex = vertexCount;
  const meshPositions = positions.subarray(0, endIndex * 3);
  const positionsBlob = new Blob([meshPositions], {
    type: "application/binary"
  });
  const positionsURL = URL.createObjectURL(positionsBlob);
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < meshPositions.length / 3; i++) {
    minX = Math.min(minX, meshPositions[i * 3 + 0]);
    maxX = Math.max(maxX, meshPositions[i * 3 + 0]);
    minY = Math.min(minY, meshPositions[i * 3 + 1]);
    maxY = Math.max(maxY, meshPositions[i * 3 + 1]);
    minZ = Math.min(minZ, meshPositions[i * 3 + 2]);
    maxZ = Math.max(maxZ, meshPositions[i * 3 + 2]);
  }
  const meshNormals = normals ? normals.subarray(0, endIndex * 3) : void 0;
  let normalsURL;
  if (defined_default(meshNormals)) {
    const normalsBlob = new Blob([meshNormals], {
      type: "application/binary"
    });
    normalsURL = URL.createObjectURL(normalsBlob);
  }
  const meshUv0s = uv0s ? uv0s.subarray(0, endIndex * 2) : void 0;
  let uv0URL;
  if (defined_default(meshUv0s)) {
    const uv0Blob = new Blob([meshUv0s], { type: "application/binary" });
    uv0URL = URL.createObjectURL(uv0Blob);
  }
  const meshColorsInBytes = defined_default(colors) ? colors.subarray(0, endIndex * 4) : void 0;
  let colorsURL;
  if (defined_default(meshColorsInBytes)) {
    const colorsBlob = new Blob([meshColorsInBytes], {
      type: "application/binary"
    });
    colorsURL = URL.createObjectURL(colorsBlob);
  }
  const posIndex = 0;
  let normalIndex = 0;
  let uv0Index = 0;
  let colorIndex = 0;
  let indicesIndex = 0;
  let currentIndex = posIndex;
  const attributes = {};
  attributes.POSITION = posIndex;
  buffers.push({
    uri: positionsURL,
    byteLength: meshPositions.byteLength
  });
  bufferViews.push({
    buffer: posIndex,
    byteOffset: 0,
    byteLength: meshPositions.byteLength,
    target: 34962
  });
  accessors.push({
    bufferView: posIndex,
    byteOffset: 0,
    componentType: 5126,
    count: vertexCount,
    type: "VEC3",
    max: [minX, minY, minZ],
    min: [maxX, maxY, maxZ]
  });
  if (defined_default(normalsURL)) {
    ++currentIndex;
    normalIndex = currentIndex;
    attributes.NORMAL = normalIndex;
    buffers.push({
      uri: normalsURL,
      byteLength: meshNormals.byteLength
    });
    bufferViews.push({
      buffer: normalIndex,
      byteOffset: 0,
      byteLength: meshNormals.byteLength,
      target: 34962
    });
    accessors.push({
      bufferView: normalIndex,
      byteOffset: 0,
      componentType: 5126,
      count: vertexCount,
      type: "VEC3"
    });
  }
  if (defined_default(uv0URL)) {
    ++currentIndex;
    uv0Index = currentIndex;
    attributes.TEXCOORD_0 = uv0Index;
    buffers.push({
      uri: uv0URL,
      byteLength: meshUv0s.byteLength
    });
    bufferViews.push({
      buffer: uv0Index,
      byteOffset: 0,
      byteLength: meshUv0s.byteLength,
      target: 34962
    });
    accessors.push({
      bufferView: uv0Index,
      byteOffset: 0,
      componentType: 5126,
      count: vertexCount,
      type: "VEC2"
    });
  }
  if (defined_default(colorsURL)) {
    ++currentIndex;
    colorIndex = currentIndex;
    attributes.COLOR_0 = colorIndex;
    buffers.push({
      uri: colorsURL,
      byteLength: meshColorsInBytes.byteLength
    });
    bufferViews.push({
      buffer: colorIndex,
      byteOffset: 0,
      byteLength: meshColorsInBytes.byteLength,
      target: 34962
    });
    accessors.push({
      bufferView: colorIndex,
      byteOffset: 0,
      componentType: 5121,
      normalized: true,
      count: vertexCount,
      type: "VEC4"
    });
  }
  ++currentIndex;
  indicesIndex = currentIndex;
  buffers.push({
    uri: indicesURL,
    byteLength: indexArray.byteLength
  });
  bufferViews.push({
    buffer: indicesIndex,
    byteOffset: 0,
    byteLength: indexArray.byteLength,
    target: 34963
  });
  accessors.push({
    bufferView: indicesIndex,
    byteOffset: 0,
    componentType: 5125,
    count: vertexCount,
    type: "SCALAR"
  });
  meshes.push({
    primitives: [
      {
        attributes,
        indices: indicesIndex,
        material: 0
      }
    ]
  });
  nodesInScene.push(0);
  nodes.push({ mesh: 0 });
  return {
    buffers,
    bufferViews,
    accessors,
    meshes,
    nodes,
    nodesInScene
  };
}
function decode(data, schema, bufferInfo, featureData) {
  const magicNumber = new Uint8Array(data, 0, 5);
  if (magicNumber[0] === "D".charCodeAt() && magicNumber[1] === "R".charCodeAt() && magicNumber[2] === "A".charCodeAt() && magicNumber[3] === "C".charCodeAt() && magicNumber[4] === "O".charCodeAt()) {
    return decodeDracoEncodedGeometry(data, bufferInfo);
  }
  return decodeBinaryGeometry(data, schema, bufferInfo, featureData);
}
function decodeDracoEncodedGeometry(data) {
  const dracoDecoderModule = draco;
  const buffer = new dracoDecoderModule.DecoderBuffer();
  const byteArray = new Uint8Array(data);
  buffer.Init(byteArray, byteArray.length);
  const dracoDecoder = new dracoDecoderModule.Decoder();
  const geometryType = dracoDecoder.GetEncodedGeometryType(buffer);
  const metadataQuerier = new dracoDecoderModule.MetadataQuerier();
  let dracoGeometry;
  let status;
  if (geometryType === dracoDecoderModule.TRIANGULAR_MESH) {
    dracoGeometry = new dracoDecoderModule.Mesh();
    status = dracoDecoder.DecodeBufferToMesh(buffer, dracoGeometry);
  }
  const decodedGeometry = {
    vertexCount: [0],
    featureCount: 0
  };
  if (defined_default(status) && status.ok() && dracoGeometry.ptr !== 0) {
    const faceCount = dracoGeometry.num_faces();
    const attributesCount = dracoGeometry.num_attributes();
    const vertexCount = dracoGeometry.num_points();
    decodedGeometry.indices = new Uint32Array(faceCount * 3);
    const faces = decodedGeometry.indices;
    decodedGeometry.vertexCount[0] = vertexCount;
    decodedGeometry.scale_x = 1;
    decodedGeometry.scale_y = 1;
    const face = new dracoDecoderModule.DracoInt32Array(3);
    for (let faceIndex = 0; faceIndex < faceCount; ++faceIndex) {
      dracoDecoder.GetFaceFromMesh(dracoGeometry, faceIndex, face);
      faces[faceIndex * 3] = face.GetValue(0);
      faces[faceIndex * 3 + 1] = face.GetValue(1);
      faces[faceIndex * 3 + 2] = face.GetValue(2);
    }
    dracoDecoderModule.destroy(face);
    for (let attrIndex = 0; attrIndex < attributesCount; ++attrIndex) {
      const dracoAttribute = dracoDecoder.GetAttribute(
        dracoGeometry,
        attrIndex
      );
      const attributeData = decodeDracoAttribute(
        dracoDecoderModule,
        dracoDecoder,
        dracoGeometry,
        dracoAttribute,
        vertexCount
      );
      const dracoAttributeType = dracoAttribute.attribute_type();
      let attributei3sName = "unknown";
      if (dracoAttributeType === dracoDecoderModule.POSITION) {
        attributei3sName = "positions";
      } else if (dracoAttributeType === dracoDecoderModule.NORMAL) {
        attributei3sName = "normals";
      } else if (dracoAttributeType === dracoDecoderModule.COLOR) {
        attributei3sName = "colors";
      } else if (dracoAttributeType === dracoDecoderModule.TEX_COORD) {
        attributei3sName = "uv0s";
      }
      const metadata = dracoDecoder.GetAttributeMetadata(
        dracoGeometry,
        attrIndex
      );
      if (metadata.ptr !== 0) {
        const numEntries = metadataQuerier.NumEntries(metadata);
        for (let entry = 0; entry < numEntries; ++entry) {
          const entryName = metadataQuerier.GetEntryName(metadata, entry);
          if (entryName === "i3s-scale_x") {
            decodedGeometry.scale_x = metadataQuerier.GetDoubleEntry(
              metadata,
              "i3s-scale_x"
            );
          } else if (entryName === "i3s-scale_y") {
            decodedGeometry.scale_y = metadataQuerier.GetDoubleEntry(
              metadata,
              "i3s-scale_y"
            );
          } else if (entryName === "i3s-attribute-type") {
            attributei3sName = metadataQuerier.GetStringEntry(
              metadata,
              "i3s-attribute-type"
            );
          }
        }
      }
      if (defined_default(decodedGeometry[attributei3sName])) {
        console.log("Attribute already exists", attributei3sName);
      }
      decodedGeometry[attributei3sName] = attributeData;
      if (attributei3sName === "feature-index") {
        decodedGeometry.featureCount++;
      }
    }
    dracoDecoderModule.destroy(dracoGeometry);
  }
  dracoDecoderModule.destroy(metadataQuerier);
  dracoDecoderModule.destroy(dracoDecoder);
  return decodedGeometry;
}
function decodeDracoAttribute(dracoDecoderModule, dracoDecoder, dracoGeometry, dracoAttribute, vertexCount) {
  const bufferSize = dracoAttribute.num_components() * vertexCount;
  let dracoAttributeData;
  const handlers = [
    function() {
    },
    // DT_INVALID - 0
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoInt8Array(bufferSize);
      const success = dracoDecoder.GetAttributeInt8ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Int8Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    },
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoInt8Array(bufferSize);
      const success = dracoDecoder.GetAttributeUInt8ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Uint8Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    },
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoInt16Array(bufferSize);
      const success = dracoDecoder.GetAttributeInt16ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Int16Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    },
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoInt16Array(bufferSize);
      const success = dracoDecoder.GetAttributeUInt16ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Uint16Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    },
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoInt32Array(bufferSize);
      const success = dracoDecoder.GetAttributeInt32ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Int32Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    },
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoInt32Array(bufferSize);
      const success = dracoDecoder.GetAttributeUInt32ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Uint32Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    },
    function() {
    },
    function() {
    },
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoFloat32Array(bufferSize);
      const success = dracoDecoder.GetAttributeFloatForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Float32Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    },
    function() {
    },
    function() {
      dracoAttributeData = new dracoDecoderModule.DracoUInt8Array(bufferSize);
      const success = dracoDecoder.GetAttributeUInt8ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        dracoAttributeData
      );
      if (!success) {
        console.error("Bad stream");
      }
      const attributeData2 = new Uint8Array(bufferSize);
      for (let i = 0; i < bufferSize; ++i) {
        attributeData2[i] = dracoAttributeData.GetValue(i);
      }
      return attributeData2;
    }
  ];
  const attributeData = handlers[dracoAttribute.data_type()]();
  if (defined_default(dracoAttributeData)) {
    dracoDecoderModule.destroy(dracoAttributeData);
  }
  return attributeData;
}
var binaryAttributeDecoders = {
  position: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.vertexCount * 3;
    decodedGeometry.positions = new Float32Array(data, offset, count);
    offset += count * 4;
    return offset;
  },
  normal: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.vertexCount * 3;
    decodedGeometry.normals = new Float32Array(data, offset, count);
    offset += count * 4;
    return offset;
  },
  uv0: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.vertexCount * 2;
    decodedGeometry.uv0s = new Float32Array(data, offset, count);
    offset += count * 4;
    return offset;
  },
  color: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.vertexCount * 4;
    decodedGeometry.colors = new Uint8Array(data, offset, count);
    offset += count;
    return offset;
  },
  featureId: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.featureCount;
    offset += count * 8;
    return offset;
  },
  id: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.featureCount;
    offset += count * 8;
    return offset;
  },
  faceRange: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.featureCount * 2;
    decodedGeometry.faceRange = new Uint32Array(data, offset, count);
    offset += count * 4;
    return offset;
  },
  uvRegion: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.vertexCount * 4;
    decodedGeometry["uv-region"] = new Uint16Array(data, offset, count);
    offset += count * 2;
    return offset;
  },
  region: function(decodedGeometry, data, offset) {
    const count = decodedGeometry.vertexCount * 4;
    decodedGeometry["uv-region"] = new Uint16Array(data, offset, count);
    offset += count * 2;
    return offset;
  }
};
function decodeBinaryGeometry(data, schema, bufferInfo, featureData) {
  const decodedGeometry = {
    vertexCount: 0
  };
  const dataView = new DataView(data);
  try {
    let offset = 0;
    decodedGeometry.vertexCount = dataView.getUint32(offset, 1);
    offset += 4;
    decodedGeometry.featureCount = dataView.getUint32(offset, 1);
    offset += 4;
    if (defined_default(bufferInfo)) {
      for (let attrIndex = 0; attrIndex < bufferInfo.attributes.length; attrIndex++) {
        if (defined_default(binaryAttributeDecoders[bufferInfo.attributes[attrIndex]])) {
          offset = binaryAttributeDecoders[bufferInfo.attributes[attrIndex]](
            decodedGeometry,
            data,
            offset
          );
        } else {
          console.error(
            "Unknown decoder for",
            bufferInfo.attributes[attrIndex]
          );
        }
      }
    } else {
      let ordering = schema.ordering;
      let featureAttributeOrder = schema.featureAttributeOrder;
      if (defined_default(featureData) && defined_default(featureData.geometryData) && defined_default(featureData.geometryData[0]) && defined_default(featureData.geometryData[0].params)) {
        ordering = Object.keys(
          featureData.geometryData[0].params.vertexAttributes
        );
        featureAttributeOrder = Object.keys(
          featureData.geometryData[0].params.featureAttributes
        );
      }
      for (let i = 0; i < ordering.length; i++) {
        const decoder = binaryAttributeDecoders[ordering[i]];
        offset = decoder(decodedGeometry, data, offset);
      }
      for (let j = 0; j < featureAttributeOrder.length; j++) {
        const curDecoder = binaryAttributeDecoders[featureAttributeOrder[j]];
        offset = curDecoder(decodedGeometry, data, offset);
      }
    }
  } catch (e) {
    console.error(e);
  }
  decodedGeometry.scale_x = 1;
  decodedGeometry.scale_y = 1;
  return decodedGeometry;
}
function decodeAndCreateGltf(parameters) {
  const geometryData = decode(
    parameters.binaryData,
    parameters.schema,
    parameters.bufferInfo,
    parameters.featureData
  );
  if (defined_default(parameters.geoidDataList) && parameters.geoidDataList.length > 0) {
    orthometricToEllipsoidal(
      geometryData.vertexCount,
      geometryData.positions,
      geometryData.scale_x,
      geometryData.scale_y,
      parameters.cartographicCenter,
      parameters.geoidDataList,
      false
    );
  }
  transformToLocal(
    geometryData.vertexCount,
    geometryData.positions,
    geometryData.normals,
    parameters.cartographicCenter,
    parameters.cartesianCenter,
    parameters.parentRotation,
    parameters.ellipsoidRadiiSquare,
    geometryData.scale_x,
    geometryData.scale_y
  );
  if (defined_default(geometryData.uv0s) && defined_default(geometryData["uv-region"])) {
    cropUVs(
      geometryData.vertexCount,
      geometryData.uv0s,
      geometryData["uv-region"]
    );
  }
  const meshData = generateGltfBuffer(
    geometryData.vertexCount,
    geometryData.indices,
    geometryData.positions,
    geometryData.normals,
    geometryData.uv0s,
    geometryData.colors
  );
  const customAttributes = {};
  if (defined_default(geometryData["feature-index"])) {
    customAttributes.positions = geometryData.positions;
    customAttributes.indices = geometryData.indices;
    customAttributes.featureIndex = geometryData["feature-index"];
    customAttributes.cartesianCenter = parameters.cartesianCenter;
    customAttributes.parentRotation = parameters.parentRotation;
  } else if (defined_default(geometryData["faceRange"])) {
    customAttributes.positions = geometryData.positions;
    customAttributes.indices = geometryData.indices;
    customAttributes.sourceURL = parameters.url;
    customAttributes.cartesianCenter = parameters.cartesianCenter;
    customAttributes.parentRotation = parameters.parentRotation;
    customAttributes.featureIndex = new Array(geometryData.positions.length);
    for (let range = 0; range < geometryData["faceRange"].length - 1; range += 2) {
      const curIndex = range / 2;
      const rangeStart = geometryData["faceRange"][range];
      const rangeEnd = geometryData["faceRange"][range + 1];
      for (let i = rangeStart; i <= rangeEnd; i++) {
        customAttributes.featureIndex[i * 3] = curIndex;
        customAttributes.featureIndex[i * 3 + 1] = curIndex;
        customAttributes.featureIndex[i * 3 + 2] = curIndex;
      }
    }
  }
  meshData._customAttributes = customAttributes;
  const results = {
    meshData
  };
  return results;
}
async function initWorker(parameters, transferableObjects) {
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined_default(wasmConfig) && defined_default(wasmConfig.wasmBinaryFile)) {
    draco = await (0, import_draco_decoder_nodejs.default)(wasmConfig);
  } else {
    draco = await (0, import_draco_decoder_nodejs.default)();
  }
  return true;
}
function decodeI3S(parameters, transferableObjects) {
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined_default(wasmConfig)) {
    return initWorker(parameters, transferableObjects);
  }
  return decodeAndCreateGltf(parameters, transferableObjects);
}
var decodeI3S_default = createTaskProcessorWorker_default(decodeI3S);
export {
  decodeI3S_default as default
};
