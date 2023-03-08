define(['./ComponentDatatype-f7b11d02', './defaultValue-0a909f67', './IndexDatatype-a55ceaa1', './RuntimeError-06c93819', './createTaskProcessorWorker', './Check-666ab1a0', './WebGLConstants-a8cc3e8c', './Math-2dbd6b93'], (function (ComponentDatatype, defaultValue, IndexDatatype, RuntimeError, createTaskProcessorWorker, Check, WebGLConstants, Math) { 'use strict';

  /* global require */

  let draco;

  function decodeIndexArray(dracoGeometry, dracoDecoder) {
    const numPoints = dracoGeometry.num_points();
    const numFaces = dracoGeometry.num_faces();
    const faceIndices = new draco.DracoInt32Array();
    const numIndices = numFaces * 3;
    const indexArray = IndexDatatype.IndexDatatype.createTypedArray(numPoints, numIndices);

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
      numberOfIndices: numIndices,
    };
  }

  function decodeQuantizedDracoTypedArray(
    dracoGeometry,
    dracoDecoder,
    dracoAttribute,
    quantization,
    vertexArrayLength
  ) {
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
    } else {
      attributeData = new draco.DracoUInt16Array();
      vertexArray = new Uint16Array(vertexArrayLength);
      dracoDecoder.GetAttributeUInt16ForAllPoints(
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

  function decodeDracoTypedArray(
    dracoGeometry,
    dracoDecoder,
    dracoAttribute,
    vertexArrayLength
  ) {
    let vertexArray;
    let attributeData;

    // Some attribute types are casted down to 32 bit since Draco only returns 32 bit values
    switch (dracoAttribute.data_type()) {
      case 1:
      case 11: // DT_INT8 or DT_BOOL
        attributeData = new draco.DracoInt8Array();
        vertexArray = new Int8Array(vertexArrayLength);
        dracoDecoder.GetAttributeInt8ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          attributeData
        );
        break;
      case 2: // DT_UINT8
        attributeData = new draco.DracoUInt8Array();
        vertexArray = new Uint8Array(vertexArrayLength);
        dracoDecoder.GetAttributeUInt8ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          attributeData
        );
        break;
      case 3: // DT_INT16
        attributeData = new draco.DracoInt16Array();
        vertexArray = new Int16Array(vertexArrayLength);
        dracoDecoder.GetAttributeInt16ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          attributeData
        );
        break;
      case 4: // DT_UINT16
        attributeData = new draco.DracoUInt16Array();
        vertexArray = new Uint16Array(vertexArrayLength);
        dracoDecoder.GetAttributeUInt16ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          attributeData
        );
        break;
      case 5:
      case 7: // DT_INT32 or DT_INT64
        attributeData = new draco.DracoInt32Array();
        vertexArray = new Int32Array(vertexArrayLength);
        dracoDecoder.GetAttributeInt32ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          attributeData
        );
        break;
      case 6:
      case 8: // DT_UINT32 or DT_UINT64
        attributeData = new draco.DracoUInt32Array();
        vertexArray = new Uint32Array(vertexArrayLength);
        dracoDecoder.GetAttributeUInt32ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          attributeData
        );
        break;
      case 9:
      case 10: // DT_FLOAT32 or DT_FLOAT64
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
        minValues: minValues,
        range: transform.range(),
        octEncoded: false,
      };
    }
    draco.destroy(transform);

    transform = new draco.AttributeOctahedronTransform();
    if (transform.InitFromAttribute(dracoAttribute)) {
      quantization = {
        quantizationBits: transform.quantization_bits(),
        octEncoded: true,
      };
    }
    draco.destroy(transform);

    const vertexArrayLength = numPoints * numComponents;
    let vertexArray;
    if (defaultValue.defined(quantization)) {
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

    const componentDatatype = ComponentDatatype.ComponentDatatype.fromTypedArray(vertexArray);

    return {
      array: vertexArray,
      data: {
        componentsPerAttribute: numComponents,
        componentDatatype: componentDatatype,
        byteOffset: dracoAttribute.byte_offset(),
        byteStride:
          ComponentDatatype.ComponentDatatype.getSizeInBytes(componentDatatype) * numComponents,
        normalized: dracoAttribute.normalized(),
        quantization: quantization,
      },
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
      throw new RuntimeError.RuntimeError("Draco geometry type must be POINT_CLOUD.");
    }

    const dracoPointCloud = new draco.PointCloud();
    const decodingStatus = dracoDecoder.DecodeBufferToPointCloud(
      buffer,
      dracoPointCloud
    );
    if (!decodingStatus.ok() || dracoPointCloud.ptr === 0) {
      throw new RuntimeError.RuntimeError(
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

    // Skip all parameter types except generic
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
      throw new RuntimeError.RuntimeError("Unsupported draco mesh geometry type.");
    }

    const dracoGeometry = new draco.Mesh();
    const decodingStatus = dracoDecoder.DecodeBufferToMesh(buffer, dracoGeometry);
    if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
      throw new RuntimeError.RuntimeError(
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
      attributeData: attributeData,
    };

    draco.destroy(dracoGeometry);
    draco.destroy(dracoDecoder);

    return result;
  }

  function decode(parameters) {
    if (defaultValue.defined(parameters.bufferView)) {
      return decodePrimitive(parameters);
    }
    return decodePointCloud(parameters);
  }

  function initWorker(dracoModule) {
    draco = dracoModule;
    self.onmessage = createTaskProcessorWorker(decode);
    self.postMessage(true);
  }

  function decodeDraco(event) {
    const data = event.data;

    // Expect the first message to be to load a web assembly module
    const wasmConfig = data.webAssemblyConfig;
    if (defaultValue.defined(wasmConfig)) {
      // Require and compile WebAssembly module, or use fallback if not supported
      return require([wasmConfig.modulePath], function (dracoModule) {
        if (defaultValue.defined(wasmConfig.wasmBinaryFile)) {
          if (!defaultValue.defined(dracoModule)) {
            dracoModule = self.DracoDecoderModule;
          }

          dracoModule(wasmConfig).then(function (compiledModule) {
            initWorker(compiledModule);
          });
        } else {
          initWorker(dracoModule());
        }
      });
    }
  }

  return decodeDraco;

}));
