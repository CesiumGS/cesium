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
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import {
  RuntimeError_default
} from "./chunk-JQQW5OSU.js";
import "./chunk-63W23YZY.js";
import "./chunk-J64Y4DQH.js";
import {
  __toESM,
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Workers/decodeDraco.js
var import_draco_decoder_nodejs = __toESM(require_draco_decoder_nodejs(), 1);
var draco;
function decodeIndexArray(dracoGeometry, dracoDecoder) {
  const numPoints = dracoGeometry.num_points();
  const numFaces = dracoGeometry.num_faces();
  const faceIndices = new draco.DracoInt32Array();
  const numIndices = numFaces * 3;
  const indexArray = IndexDatatype_default.createTypedArray(numPoints, numIndices);
  let offset = 0;
  for (let i = 0; i < numFaces; ++i) {
    dracoDecoder.GetFaceFromMesh(dracoGeometry, i, faceIndices);
    indexArray[offset + 0] = faceIndices.GetValue(0);
    indexArray[offset + 1] = faceIndices.GetValue(1);
    indexArray[offset + 2] = faceIndices.GetValue(2);
    offset += 3;
  }
  draco.destroy(faceIndices);
  return {
    typedArray: indexArray,
    numberOfIndices: numIndices
  };
}
function decodeQuantizedDracoTypedArray(dracoGeometry, dracoDecoder, dracoAttribute, quantization, vertexArrayLength) {
  let vertexArray;
  let attributeData;
  if (quantization.quantizationBits <= 8) {
    attributeData = new draco.DracoUInt8Array();
    vertexArray = new Uint8Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt8ForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  } else if (quantization.quantizationBits <= 16) {
    attributeData = new draco.DracoUInt16Array();
    vertexArray = new Uint16Array(vertexArrayLength);
    dracoDecoder.GetAttributeUInt16ForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  } else {
    attributeData = new draco.DracoFloat32Array();
    vertexArray = new Float32Array(vertexArrayLength);
    dracoDecoder.GetAttributeFloatForAllPoints(
      dracoGeometry,
      dracoAttribute,
      attributeData
    );
  }
  for (let i = 0; i < vertexArrayLength; ++i) {
    vertexArray[i] = attributeData.GetValue(i);
  }
  draco.destroy(attributeData);
  return vertexArray;
}
function decodeDracoTypedArray(dracoGeometry, dracoDecoder, dracoAttribute, vertexArrayLength) {
  let vertexArray;
  let attributeData;
  switch (dracoAttribute.data_type()) {
    case 1:
    case 11:
      attributeData = new draco.DracoInt8Array();
      vertexArray = new Int8Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt8ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 2:
      attributeData = new draco.DracoUInt8Array();
      vertexArray = new Uint8Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt8ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 3:
      attributeData = new draco.DracoInt16Array();
      vertexArray = new Int16Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt16ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 4:
      attributeData = new draco.DracoUInt16Array();
      vertexArray = new Uint16Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt16ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 5:
    case 7:
      attributeData = new draco.DracoInt32Array();
      vertexArray = new Int32Array(vertexArrayLength);
      dracoDecoder.GetAttributeInt32ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 6:
    case 8:
      attributeData = new draco.DracoUInt32Array();
      vertexArray = new Uint32Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt32ForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
    case 9:
    case 10:
      attributeData = new draco.DracoFloat32Array();
      vertexArray = new Float32Array(vertexArrayLength);
      dracoDecoder.GetAttributeFloatForAllPoints(
        dracoGeometry,
        dracoAttribute,
        attributeData
      );
      break;
  }
  for (let i = 0; i < vertexArrayLength; ++i) {
    vertexArray[i] = attributeData.GetValue(i);
  }
  draco.destroy(attributeData);
  return vertexArray;
}
function decodeAttribute(dracoGeometry, dracoDecoder, dracoAttribute) {
  const numPoints = dracoGeometry.num_points();
  const numComponents = dracoAttribute.num_components();
  let quantization;
  let transform = new draco.AttributeQuantizationTransform();
  if (transform.InitFromAttribute(dracoAttribute)) {
    const minValues = new Array(numComponents);
    for (let i = 0; i < numComponents; ++i) {
      minValues[i] = transform.min_value(i);
    }
    quantization = {
      quantizationBits: transform.quantization_bits(),
      minValues,
      range: transform.range(),
      octEncoded: false
    };
  }
  draco.destroy(transform);
  transform = new draco.AttributeOctahedronTransform();
  if (transform.InitFromAttribute(dracoAttribute)) {
    quantization = {
      quantizationBits: transform.quantization_bits(),
      octEncoded: true
    };
  }
  draco.destroy(transform);
  const vertexArrayLength = numPoints * numComponents;
  let vertexArray;
  if (defined_default(quantization)) {
    vertexArray = decodeQuantizedDracoTypedArray(
      dracoGeometry,
      dracoDecoder,
      dracoAttribute,
      quantization,
      vertexArrayLength
    );
  } else {
    vertexArray = decodeDracoTypedArray(
      dracoGeometry,
      dracoDecoder,
      dracoAttribute,
      vertexArrayLength
    );
  }
  const componentDatatype = ComponentDatatype_default.fromTypedArray(vertexArray);
  return {
    array: vertexArray,
    data: {
      componentsPerAttribute: numComponents,
      componentDatatype,
      byteOffset: dracoAttribute.byte_offset(),
      byteStride: ComponentDatatype_default.getSizeInBytes(componentDatatype) * numComponents,
      normalized: dracoAttribute.normalized(),
      quantization
    }
  };
}
function decodePointCloud(parameters) {
  const dracoDecoder = new draco.Decoder();
  if (parameters.dequantizeInShader) {
    dracoDecoder.SkipAttributeTransform(draco.POSITION);
    dracoDecoder.SkipAttributeTransform(draco.NORMAL);
  }
  const buffer = new draco.DecoderBuffer();
  buffer.Init(parameters.buffer, parameters.buffer.length);
  const geometryType = dracoDecoder.GetEncodedGeometryType(buffer);
  if (geometryType !== draco.POINT_CLOUD) {
    throw new RuntimeError_default("Draco geometry type must be POINT_CLOUD.");
  }
  const dracoPointCloud = new draco.PointCloud();
  const decodingStatus = dracoDecoder.DecodeBufferToPointCloud(
    buffer,
    dracoPointCloud
  );
  if (!decodingStatus.ok() || dracoPointCloud.ptr === 0) {
    throw new RuntimeError_default(
      `Error decoding draco point cloud: ${decodingStatus.error_msg()}`
    );
  }
  draco.destroy(buffer);
  const result = {};
  const properties = parameters.properties;
  for (const propertyName in properties) {
    if (properties.hasOwnProperty(propertyName)) {
      let dracoAttribute;
      if (propertyName === "POSITION" || propertyName === "NORMAL") {
        const dracoAttributeId = dracoDecoder.GetAttributeId(
          dracoPointCloud,
          draco[propertyName]
        );
        dracoAttribute = dracoDecoder.GetAttribute(
          dracoPointCloud,
          dracoAttributeId
        );
      } else {
        const attributeId = properties[propertyName];
        dracoAttribute = dracoDecoder.GetAttributeByUniqueId(
          dracoPointCloud,
          attributeId
        );
      }
      result[propertyName] = decodeAttribute(
        dracoPointCloud,
        dracoDecoder,
        dracoAttribute
      );
    }
  }
  draco.destroy(dracoPointCloud);
  draco.destroy(dracoDecoder);
  return result;
}
function decodePrimitive(parameters) {
  const dracoDecoder = new draco.Decoder();
  const attributesToSkip = ["POSITION", "NORMAL", "COLOR", "TEX_COORD"];
  if (parameters.dequantizeInShader) {
    for (let i = 0; i < attributesToSkip.length; ++i) {
      dracoDecoder.SkipAttributeTransform(draco[attributesToSkip[i]]);
    }
  }
  const bufferView = parameters.bufferView;
  const buffer = new draco.DecoderBuffer();
  buffer.Init(parameters.array, bufferView.byteLength);
  const geometryType = dracoDecoder.GetEncodedGeometryType(buffer);
  if (geometryType !== draco.TRIANGULAR_MESH) {
    throw new RuntimeError_default("Unsupported draco mesh geometry type.");
  }
  const dracoGeometry = new draco.Mesh();
  const decodingStatus = dracoDecoder.DecodeBufferToMesh(buffer, dracoGeometry);
  if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
    throw new RuntimeError_default(
      `Error decoding draco mesh geometry: ${decodingStatus.error_msg()}`
    );
  }
  draco.destroy(buffer);
  const attributeData = {};
  const compressedAttributes = parameters.compressedAttributes;
  for (const attributeName in compressedAttributes) {
    if (compressedAttributes.hasOwnProperty(attributeName)) {
      const compressedAttribute = compressedAttributes[attributeName];
      const dracoAttribute = dracoDecoder.GetAttributeByUniqueId(
        dracoGeometry,
        compressedAttribute
      );
      attributeData[attributeName] = decodeAttribute(
        dracoGeometry,
        dracoDecoder,
        dracoAttribute
      );
    }
  }
  const result = {
    indexArray: decodeIndexArray(dracoGeometry, dracoDecoder),
    attributeData
  };
  draco.destroy(dracoGeometry);
  draco.destroy(dracoDecoder);
  return result;
}
async function decode(parameters, transferableObjects) {
  if (defined_default(parameters.bufferView)) {
    return decodePrimitive(parameters);
  }
  return decodePointCloud(parameters);
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
async function decodeDraco(parameters, transferableObjects) {
  const wasmConfig = parameters.webAssemblyConfig;
  if (defined_default(wasmConfig)) {
    return initWorker(parameters, transferableObjects);
  }
  return decode(parameters, transferableObjects);
}
var decodeDraco_default = createTaskProcessorWorker_default(decodeDraco);
export {
  decodeDraco_default as default
};
