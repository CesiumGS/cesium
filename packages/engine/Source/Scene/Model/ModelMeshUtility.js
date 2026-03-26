import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Color from "../../Core/Color.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import ModelUtility from "./ModelUtility.js";

/**
 * Shared utilities for traversing model scene graphs.
 * Used by pickModel and ModelGeometryExtractor.
 *
 * @namespace ModelMeshUtility
 * @private
 */
const ModelMeshUtility = {};

/**
 * Reads the position attribute data from a primitive, including
 * quantization metadata and stride/offset info.
 *
 * @param {object} primitive The model primitive.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of vertex buffers.
 * @returns {object|undefined} An object with { typedArray, numComponents, elementStride, offset, quantization, count }, or undefined if data is unavailable.
 *
 * @private
 */
ModelMeshUtility.readPositionData = function (primitive, frameState) {
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION,
  );

  if (!defined(positionAttribute)) {
    return undefined;
  }

  const byteOffset = positionAttribute.byteOffset;
  const byteStride = positionAttribute.byteStride;
  const vertexCount = positionAttribute.count;

  let vertices = positionAttribute.typedArray;
  let componentDatatype = positionAttribute.componentDatatype;
  let attributeType = positionAttribute.type;

  const quantization = positionAttribute.quantization;
  if (defined(quantization)) {
    componentDatatype = quantization.componentDatatype;
    attributeType = quantization.type;
  }

  const numComponents = AttributeType.getNumberOfComponents(attributeType);
  const bytes = ComponentDatatype.getSizeInBytes(componentDatatype);
  const isInterleaved =
    !defined(vertices) &&
    defined(byteStride) &&
    byteStride !== numComponents * bytes;

  let elementStride = numComponents;
  let offset = 0;
  if (isInterleaved) {
    elementStride = byteStride / bytes;
    offset = byteOffset / bytes;
  }
  const elementCount = vertexCount * elementStride;

  if (!defined(vertices)) {
    const verticesBuffer = positionAttribute.buffer;

    if (
      defined(verticesBuffer) &&
      defined(frameState) &&
      frameState.context.webgl2
    ) {
      vertices = ComponentDatatype.createTypedArray(
        componentDatatype,
        elementCount,
      );
      verticesBuffer.getBufferData(
        vertices,
        isInterleaved ? 0 : byteOffset,
        0,
        elementCount,
      );
    }

    if (quantization && positionAttribute.normalized) {
      vertices = AttributeCompression.dequantize(
        vertices,
        componentDatatype,
        attributeType,
        vertexCount,
      );
    }
  }

  if (!defined(vertices)) {
    return undefined;
  }

  return {
    typedArray: vertices,
    numComponents: numComponents,
    elementStride: elementStride,
    offset: offset,
    quantization: quantization,
    count: vertexCount,
  };
};

/**
 * Reads the index data from a primitive, falling back to GPU readback
 * when the CPU typed array is not available.
 *
 * @param {object} primitive The model primitive.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of index buffers.
 * @returns {object|undefined} An object with { typedArray, count }, or undefined if data is unavailable.
 *
 * @private
 */
ModelMeshUtility.readIndices = function (primitive, frameState) {
  if (!defined(primitive.indices)) {
    return undefined;
  }

  let typedArray = primitive.indices.typedArray;
  const count = primitive.indices.count;

  if (!defined(typedArray)) {
    const indicesBuffer = primitive.indices.buffer;
    const indexDatatype = primitive.indices.indexDatatype;

    if (
      defined(indicesBuffer) &&
      defined(frameState) &&
      frameState.context.webgl2
    ) {
      if (indexDatatype === IndexDatatype.UNSIGNED_BYTE) {
        typedArray = new Uint8Array(count);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_SHORT) {
        typedArray = new Uint16Array(count);
      } else if (indexDatatype === IndexDatatype.UNSIGNED_INT) {
        typedArray = new Uint32Array(count);
      }

      indicesBuffer.getBufferData(typedArray);
    }
  }

  if (!defined(typedArray)) {
    return undefined;
  }

  return {
    typedArray: typedArray,
    count: count,
  };
};

/**
 * Reads the color attribute data from a primitive, falling back to GPU
 * readback when the CPU typed array is not available.
 *
 * @param {object} primitive The model primitive.
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of vertex buffers.
 * @returns {object|undefined} An object with { typedArray, numComponents, elementStride, offset, normalized, count }, or undefined if unavailable.
 *
 * @private
 */
ModelMeshUtility.readColorData = function (primitive, frameState) {
  const colorAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.COLOR,
    0,
  );

  if (!defined(colorAttribute)) {
    return undefined;
  }

  const numComponents = AttributeType.getNumberOfComponents(
    colorAttribute.type,
  );
  const count = colorAttribute.count;

  let typedArray = colorAttribute.typedArray;
  let elementStride = numComponents;
  let offset = 0;

  if (!defined(typedArray)) {
    const colorBuffer = colorAttribute.buffer;
    const componentDatatype = colorAttribute.componentDatatype;
    const bytes = ComponentDatatype.getSizeInBytes(componentDatatype);
    const byteStride = colorAttribute.byteStride;
    const byteOffset = colorAttribute.byteOffset;

    const isInterleaved =
      defined(byteStride) && byteStride !== numComponents * bytes;

    if (isInterleaved) {
      elementStride = byteStride / bytes;
      offset = byteOffset / bytes;
    }
    const elementCount = count * elementStride;

    if (
      defined(colorBuffer) &&
      defined(frameState) &&
      frameState.context.webgl2
    ) {
      typedArray = ComponentDatatype.createTypedArray(
        componentDatatype,
        elementCount,
      );
      colorBuffer.getBufferData(
        typedArray,
        isInterleaved ? 0 : byteOffset,
        0,
        elementCount,
      );
    }
  }

  if (!defined(typedArray)) {
    return undefined;
  }

  return {
    typedArray: typedArray,
    numComponents: numComponents,
    elementStride: elementStride,
    offset: offset,
    normalized: colorAttribute.normalized,
    count: count,
  };
};

/**
 * Reads per-vertex feature ID data from a primitive for a given feature ID definition.
 * Currently supports FeatureIdAttribute (vertex attributes with a setIndex).
 * Falls back to GPU readback when the CPU typed array is not available.
 *
 * @param {object} primitive The model primitive.
 * @param {object} featureId The feature ID definition (must have a setIndex property).
 * @param {FrameState} [frameState] Frame state, needed for GPU readback of vertex buffers.
 * @returns {object|undefined} An object with { typedArray, count }, or undefined if no matching feature ID attribute is found.
 *
 * @private
 */
ModelMeshUtility.readFeatureIdData = function (
  primitive,
  featureId,
  frameState,
) {
  if (!defined(featureId) || !defined(featureId.setIndex)) {
    return undefined;
  }

  const featureIdAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.FEATURE_ID,
    featureId.setIndex,
  );

  if (!defined(featureIdAttribute)) {
    return undefined;
  }

  const count = featureIdAttribute.count;
  let typedArray = featureIdAttribute.typedArray;

  if (!defined(typedArray)) {
    const buffer = featureIdAttribute.buffer;
    const componentDatatype = featureIdAttribute.componentDatatype;
    const numComponents = AttributeType.getNumberOfComponents(
      featureIdAttribute.type,
    );
    const bytes = ComponentDatatype.getSizeInBytes(componentDatatype);
    const byteStride = featureIdAttribute.byteStride;
    const byteOffset = featureIdAttribute.byteOffset;

    const isInterleaved =
      defined(byteStride) && byteStride !== numComponents * bytes;

    const elementStride = isInterleaved ? byteStride / bytes : numComponents;
    const elementCount = count * elementStride;

    if (defined(buffer) && defined(frameState) && frameState.context.webgl2) {
      typedArray = ComponentDatatype.createTypedArray(
        componentDatatype,
        elementCount,
      );
      buffer.getBufferData(
        typedArray,
        isInterleaved ? 0 : byteOffset,
        0,
        elementCount,
      );
    }
  }

  if (!defined(typedArray)) {
    return undefined;
  }

  return {
    typedArray: typedArray,
    count: count,
  };
};

/**
 * Decodes a vertex position from the position data, applying quantization
 * dequantization if necessary.
 *
 * @param {Float32Array|Uint16Array|Uint8Array} vertices The vertex data array.
 * @param {number} index The vertex index.
 * @param {number} offset Element offset within a stride for interleaved data.
 * @param {number} elementStride Number of elements per vertex (may be larger than 3 for interleaved).
 * @param {object} [quantization] Quantization metadata from the position attribute.
 * @param {Cartesian3} result Scratch Cartesian3 to store the result.
 * @returns {Cartesian3} The decoded position in local space.
 *
 * @private
 */
ModelMeshUtility.decodePosition = function (
  vertices,
  index,
  offset,
  elementStride,
  quantization,
  result,
) {
  const i = offset + index * elementStride;
  result.x = vertices[i];
  result.y = vertices[i + 1];
  result.z = vertices[i + 2];

  if (defined(quantization)) {
    if (quantization.octEncoded) {
      result = AttributeCompression.octDecodeInRange(
        result.x, // 260309 Fixes a bug from pickModel.js where parameter was mistakenly sent as a vector instead of expanded floats
        result.y,
        quantization.normalizationRange,
        result,
      );

      if (quantization.octEncodedZXY) {
        const x = result.x;
        result.x = result.z;
        result.z = result.y;
        result.y = x;
      }
    } else {
      result = Cartesian3.multiplyComponents(
        result,
        quantization.quantizedVolumeStepSize,
        result,
      );

      result = Cartesian3.add(
        result,
        quantization.quantizedVolumeOffset,
        result,
      );
    }
  }

  return result;
};

/**
 * Reads a single vertex color from the typed array and returns a new {@link Color}.
 * Handles both normalized integer (e.g. UNSIGNED_BYTE) and float data.
 *
 * @param {TypedArray} typedArray The color data array.
 * @param {number} index The vertex index.
 * @param {number} offset Element offset within a stride for interleaved data.
 * @param {number} elementStride Number of elements per vertex (may be larger than numComponents for interleaved data).
 * @param {number} numComponents Number of color components (3 or 4).
 * @param {boolean} normalized Whether the data is normalized integer.
 * @returns {Color} The decoded color.
 *
 * @private
 */
ModelMeshUtility.decodeColor = function (
  typedArray,
  index,
  offset,
  elementStride,
  numComponents,
  normalized,
) {
  const i = offset + index * elementStride;
  let r = typedArray[i];
  let g = typedArray[i + 1];
  let b = typedArray[i + 2];
  let a = numComponents === 4 ? typedArray[i + 3] : 1.0;

  if (normalized) {
    const max = typedArray instanceof Uint16Array ? 65535.0 : 255.0;
    r /= max;
    g /= max;
    b /= max;
    if (numComponents === 4) {
      a /= max;
    }
  }

  return new Color(r, g, b, a);
};

export default ModelMeshUtility;
