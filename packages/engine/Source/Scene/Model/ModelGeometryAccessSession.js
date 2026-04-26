import { destroyObject } from "@cesium/engine";
import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import oneTimeWarning from "../../Core/oneTimeWarning.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import AttributeType from "../AttributeType.js";
import { GeometryAccessSession } from "../GeometryAccessor.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/** @import { Attribute, Primitive } from "../ModelComponents.js"; */

// Scratch Cartesian3 used by oct-decoding before the result is written back
// into the caller-provided components array.
const scratchOctDecoded = new Cartesian3();

/**
 * A {@link GeometryAccessSession} implementation for {@link ModelComponents.Primitive}.
 *
 * On construction, the session resolves the attributes named by the requested
 * read/write scopes against the primitive and pulls the underlying vertex
 * buffers from the GPU into CPU-side typed arrays. Buffers shared between
 * interleaved attributes are loaded only once.
 *
 * If the requested scopes include topology read access, the index buffer is
 * also loaded into a CPU-side typed array, and a primitive-type-specific
 * layout is selected for resolving primitive vertex indices.
 *
 * Currently only attribute reading and topology reading are supported.
 * Topology writing and vertex attribute writing are not yet implemented.
 *
 * @private
 */
class ModelGeometryAccessSession extends GeometryAccessSession {
  /**
   * @param {import("../GeometryAccessor.js").default} accessor The parent accessor.
   * @param {import("../GeometryAccessor.js").GeometryAccessScopes} scopes The requested access scopes.
   * @param {Primitive} primitive The primitive whose geometry is being accessed.
   */
  constructor(accessor, scopes, primitive) {
    super(accessor, scopes);

    //>>includeStart('debug', pragmas.debug);
    if (!defined(primitive)) {
      throw new DeveloperError("primitive is required.");
    }
    //>>includeEnd('debug');

    this._primitive = primitive;

    // Build a lookup from variable name (semantic + set index) to attribute.
    /** @type {Map<string, Attribute>} */
    const attributesByKey = new Map();
    const attributes = primitive.attributes;
    for (let i = 0; i < attributes.length; ++i) {
      const attribute = attributes[i];
      const key = VertexAttributeSemantic.getVariableName(
        attribute.semantic,
        attribute.setIndex,
      );
      attributesByKey.set(key, attribute);
    }
    this._attributesByKey = attributesByKey;

    // Determine the union of attributes needed by the read/write scopes.
    const neededKeys = new Set();
    this._readAttributeKeys.forEach((key) => neededKeys.add(key));
    this._writeAttributeKeys.forEach((key) => neededKeys.add(key));

    // Load each needed attribute's data into a Uint8Array, sharing the
    // typed array between attributes that reference the same GPU buffer (e.g. interleaved attributes).
    /** @type {Map<*, Uint8Array>} */
    const dataByBuffer = new Map();
    /** @type {Map<Attribute, Uint8Array>} */
    const attributeData = new Map();

    for (const key of neededKeys) {
      const attribute = attributesByKey.get(key);
      if (!defined(attribute)) {
        oneTimeWarning(
          `ModelGeometryAccessSession:primitiveMissingAttribute:${key}`,
          `Requested access to attribute ${key}, but the primitive does not have this attribute.`,
        );
        continue;
      }

      const buffer = attribute.buffer;
      let data = dataByBuffer.get(buffer);
      if (!defined(data)) {
        data = new Uint8Array(buffer.sizeInBytes);
        buffer.getBufferData(data);
        dataByBuffer.set(buffer, data);
      }

      attributeData.set(attribute, data);
    }

    this._attributeData = attributeData;

    // Cache vertex count from any attribute (all attributes of a primitive
    // share the same vertex count).
    this._vertexCount = attributes.length > 0 ? attributes[0].count : 0;

    // Topology setup. Only load the index buffer (and select a layout) if the
    // caller asked for topology read access; otherwise the inherited stubs
    // already throw on use.
    this._indexTypedArray = undefined;
    this._indexReader = undefined;
    this._indexCount = 0;
    this._primitiveLayout = undefined;

    if (scopes.read && scopes.read.topology) {
      const indices = primitive.indices;
      this._indexTypedArray = defined(indices)
        ? readIndicesAsTypedArray(indices)
        : undefined;
      this._indexCount = defined(indices) ? indices.count : this._vertexCount;
      this._indexReader = createIndexReader(this._indexTypedArray);
      this._primitiveLayout = createPrimitiveLayout(
        primitive.primitiveType,
        this._indexCount,
      );
    }
  }

  /**
   * Releases the CPU-side copies of the loaded attribute buffers.
   */
  destroy() {
    this._attributeData.clear();
    this._indexTypedArray = undefined;
    this._indexReader = undefined;
    this._primitiveLayout = undefined;
    destroyObject(this);
  }

  /**
   * No-op until write support is added.
   */
  commit() {}

  /**
   * Gets the number of vertices in the primitive.
   *
   * @returns {number} The vertex count.
   */
  vertexCount() {
    return this._vertexCount;
  }

  /**
   * Gets the number of vertices that compose a single primitive (e.g. 3 for
   * triangle-based primitives, 2 for line-based primitives, 1 for points).
   *
   * @returns {number}
   */
  primitiveVertexCount() {
    return this._primitiveLayout.verticesPerPrimitive;
  }

  /**
   * Gets the number of primitives represented by the geometry, taking the
   * primitive type into account (e.g. an indexed triangle list with N indices
   * has N/3 primitives, while a triangle strip with N indices has N-2).
   *
   * @returns {number}
   */
  primitiveCount() {
    return this._primitiveLayout.getPrimitiveCount(this._indexCount);
  }

  /**
   * Gets the vertex indices that compose the primitive at the given index.
   *
   * @param {number} primitiveIndex The primitive index.
   * @param {number[]} results The array to populate with vertex indices.
   * @returns {number[]} The populated results array.
   */
  getPrimitive(primitiveIndex, results) {
    return this._primitiveLayout.readPrimitive(
      primitiveIndex,
      this._indexReader,
      results,
    );
  }

  /**
   * @param {import("../GeometryAccessor.js").GeometryAttributeDescriptor} descriptor
   * @returns {import("../GeometryAccessor.js").GeometryAttributeReader}
   * @protected
   */
  _createVertexAttributeReader(descriptor) {
    const key = VertexAttributeSemantic.getVariableName(
      descriptor.semantic,
      descriptor.setIndex,
    );
    const attribute = this._attributesByKey.get(key);
    const data = this._attributeData.get(attribute);

    const dataView = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );

    // Per-attribute branching decisions (interleaving, normalization,
    // dequantization/oct-decoding) are made once here so the per-element
    // hot path stays branch-free.
    const readRawComponents = createRawComponentsReader(attribute, dataView);

    /** @type {Array<function(number[]): void>} */
    const processingSteps = [];

    if (attribute.normalized) {
      processingSteps.push(createNormalizeComponentsStep(attribute));
    }

    if (defined(attribute.quantization)) {
      processingSteps.push(createDequantizeComponentsStep(attribute));
    }

    const stepCount = processingSteps.length;

    return function (vertexIndex, components) {
      readRawComponents(vertexIndex, components);
      for (let i = 0; i < stepCount; ++i) {
        processingSteps[i](components);
      }
      return components;
    };
  }
}

/**
 * @param {Attribute} attribute
 * @param {DataView} dataView
 * @returns {function(number, number[]): void}
 * @private
 */
function createRawComponentsReader(attribute, dataView) {
  const elementType = attribute.type;
  const componentsPerElement = AttributeType.getNumberOfComponents(elementType);

  const quantization = attribute.quantization;
  const componentType = defined(quantization)
    ? quantization.componentDatatype
    : attribute.componentDatatype;
  const bytesPerComponent = ComponentDatatype.getSizeInBytes(componentType);

  const defaultByteStride = componentsPerElement * bytesPerComponent;
  const byteStride = attribute.byteStride ?? defaultByteStride;
  const baseByteOffset = attribute.byteOffset;

  const componentReader = createDataViewComponentReader(componentType);

  return function (elementIndex, components) {
    const elementByteOffset = baseByteOffset + elementIndex * byteStride;
    for (let i = 0; i < componentsPerElement; ++i) {
      components[i] = componentReader(
        dataView,
        elementByteOffset + i * bytesPerComponent,
      );
    }
  };
}

/**
 * @param {Attribute} attribute
 * @returns {function(number[]): void}
 * @private
 */
function createNormalizeComponentsStep(attribute) {
  const componentsPerElement = AttributeType.getNumberOfComponents(
    attribute.type,
  );
  const quantization = attribute.quantization;
  const componentType = defined(quantization)
    ? quantization.componentDatatype
    : attribute.componentDatatype;
  const divisor = normalizationDivisor(componentType);
  return function (components) {
    for (let i = 0; i < componentsPerElement; ++i) {
      components[i] = Math.max(components[i] / divisor, -1.0);
    }
  };
}

/**
 * @param {Attribute} attribute
 * @returns {function(number[]): void}
 * @private
 */
function createDequantizeComponentsStep(attribute) {
  const quantization = attribute.quantization;

  if (quantization.octEncoded) {
    const normalizationRange = quantization.normalizationRange;
    if (quantization.octEncodedZXY) {
      // (z, x, y) -> (x, y, z)
      return function (components) {
        const c = scratchOctDecoded;
        AttributeCompression.octDecodeInRange(
          components[0],
          components[1],
          normalizationRange,
          c,
        );
        components[0] = c.y;
        components[1] = c.z;
        components[2] = c.x;
      };
    }
    return function (components) {
      const c = scratchOctDecoded;
      AttributeCompression.octDecodeInRange(
        components[0],
        components[1],
        normalizationRange,
        c,
      );
      components[0] = c.x;
      components[1] = c.y;
      components[2] = c.z;
    };
  }

  const step = quantization.quantizedVolumeStepSize;
  const offset = quantization.quantizedVolumeOffset;
  const elementType = attribute.type;
  if (elementType === AttributeType.SCALAR) {
    return function (components) {
      components[0] = components[0] * step + offset;
    };
  }
  if (elementType === AttributeType.VEC2) {
    return function (components) {
      components[0] = components[0] * step.x + offset.x;
      components[1] = components[1] * step.y + offset.y;
    };
  }
  if (elementType === AttributeType.VEC3) {
    return function (components) {
      components[0] = components[0] * step.x + offset.x;
      components[1] = components[1] * step.y + offset.y;
      components[2] = components[2] * step.z + offset.z;
    };
  }
  if (elementType === AttributeType.VEC4) {
    return function (components) {
      components[0] = components[0] * step.x + offset.x;
      components[1] = components[1] * step.y + offset.y;
      components[2] = components[2] * step.z + offset.z;
      components[3] = components[3] * step.w + offset.w;
    };
  }
  throw new DeveloperError(
    `Element type for dequantization must be SCALAR, VEC2, VEC3, or VEC4, but is ${elementType}`,
  );
}

/**
 * @param {number} componentType A {@link ComponentDatatype} value.
 * @returns {number}
 * @private
 */
function normalizationDivisor(componentType) {
  switch (componentType) {
    case ComponentDatatype.BYTE:
      return 127.0;
    case ComponentDatatype.UNSIGNED_BYTE:
      return 255.0;
    case ComponentDatatype.SHORT:
      return 32767.0;
    case ComponentDatatype.UNSIGNED_SHORT:
      return 65535.0;
    case ComponentDatatype.INT:
      return 2147483647.0;
    case ComponentDatatype.UNSIGNED_INT:
      return 4294967295.0;
  }
  throw new DeveloperError(
    `Cannot normalize component datatype: ${componentType}`,
  );
}

/**
 * Returns a function that reads a single component value of the given
 * datatype from a <code>DataView</code> at a given byte offset, in
 * little-endian order.
 *
 * @param {number} componentType A {@link ComponentDatatype} value.
 * @returns {function(DataView, number): number}
 * @private
 */
function createDataViewComponentReader(componentType) {
  switch (componentType) {
    case ComponentDatatype.BYTE:
      return function (dataView, byteOffset) {
        return dataView.getInt8(byteOffset);
      };
    case ComponentDatatype.UNSIGNED_BYTE:
      return function (dataView, byteOffset) {
        return dataView.getUint8(byteOffset);
      };
    case ComponentDatatype.SHORT:
      return function (dataView, byteOffset) {
        return dataView.getInt16(byteOffset, true);
      };
    case ComponentDatatype.UNSIGNED_SHORT:
      return function (dataView, byteOffset) {
        return dataView.getUint16(byteOffset, true);
      };
    case ComponentDatatype.INT:
      return function (dataView, byteOffset) {
        return dataView.getInt32(byteOffset, true);
      };
    case ComponentDatatype.UNSIGNED_INT:
      return function (dataView, byteOffset) {
        return dataView.getUint32(byteOffset, true);
      };
    case ComponentDatatype.FLOAT:
      return function (dataView, byteOffset) {
        return dataView.getFloat32(byteOffset, true);
      };
    case ComponentDatatype.DOUBLE:
      return function (dataView, byteOffset) {
        return dataView.getFloat64(byteOffset, true);
      };
  }
  throw new DeveloperError(
    `The componentType must be a valid ComponentDatatype, but is ${componentType}`,
  );
}

/**
 * @typedef {object} PrimitiveLayout
 * @property {number} verticesPerPrimitive The number of vertices per primitive.
 * @property {function(number): number} getPrimitiveCount Returns the number
 *   of primitives the geometry represents, given the index/vertex stream length.
 * @property {function(number, function(number): number, number[]): number[]} readPrimitive
 *   Populates the results array with the vertex indices of the primitive at the
 *   given primitive index, using the provided index reader to translate each
 *   slot in the index stream to a vertex index.
 * @ignore
 */

/** @type {PrimitiveLayout} */
const POINTS_LAYOUT = {
  verticesPerPrimitive: 1,
  getPrimitiveCount: (n) => n,
  readPrimitive: (i, readIndex, results) => {
    results[0] = readIndex(i);
    return results;
  },
};

/** @type {PrimitiveLayout} */
const LINES_LAYOUT = {
  verticesPerPrimitive: 2,
  getPrimitiveCount: (n) => Math.floor(n / 2),
  readPrimitive: (i, readIndex, results) => {
    const base = i * 2;
    results[0] = readIndex(base);
    results[1] = readIndex(base + 1);
    return results;
  },
};

/** @type {PrimitiveLayout} */
const LINE_STRIP_LAYOUT = {
  verticesPerPrimitive: 2,
  getPrimitiveCount: (n) => Math.max(0, n - 1),
  readPrimitive: (i, readIndex, results) => {
    results[0] = readIndex(i);
    results[1] = readIndex(i + 1);
    return results;
  },
};

/** @type {PrimitiveLayout} */
const TRIANGLES_LAYOUT = {
  verticesPerPrimitive: 3,
  getPrimitiveCount: (n) => Math.floor(n / 3),
  readPrimitive: (i, readIndex, results) => {
    const base = i * 3;
    results[0] = readIndex(base);
    results[1] = readIndex(base + 1);
    results[2] = readIndex(base + 2);
    return results;
  },
};

/** @type {PrimitiveLayout} */
const TRIANGLE_STRIP_LAYOUT = {
  verticesPerPrimitive: 3,
  getPrimitiveCount: (n) => Math.max(0, n - 2),
  // For odd-indexed triangles the second and third vertices are swapped
  // to preserve consistent winding.
  readPrimitive: (i, readIndex, results) => {
    results[0] = readIndex(i);
    if (i & 1) {
      results[1] = readIndex(i + 2);
      results[2] = readIndex(i + 1);
    } else {
      results[1] = readIndex(i + 1);
      results[2] = readIndex(i + 2);
    }
    return results;
  },
};

/** @type {PrimitiveLayout} */
const TRIANGLE_FAN_LAYOUT = {
  verticesPerPrimitive: 3,
  getPrimitiveCount: (n) => Math.max(0, n - 2),
  readPrimitive: (i, readIndex, results) => {
    results[0] = readIndex(0);
    results[1] = readIndex(i + 1);
    results[2] = readIndex(i + 2);
    return results;
  },
};

/**
 * Creates a layout for <code>LINE_LOOP</code>, which needs to know the index
 * stream length in order to wrap the last segment back to the start.
 *
 * @param {number} indexCount The length of the index stream.
 * @returns {PrimitiveLayout}
 * @private
 */
function createLineLoopLayout(indexCount) {
  return {
    verticesPerPrimitive: 2,
    getPrimitiveCount: (n) => n,
    readPrimitive: (i, readIndex, results) => {
      results[0] = readIndex(i);
      results[1] = readIndex((i + 1) % indexCount);
      return results;
    },
  };
}

/**
 * Selects a {@link PrimitiveLayout} for the given primitive type.
 *
 * @param {number} primitiveType A {@link PrimitiveType} value.
 * @param {number} indexCount The length of the index stream (or the vertex
 *   count for non-indexed primitives).
 * @returns {PrimitiveLayout}
 * @private
 */
function createPrimitiveLayout(primitiveType, indexCount) {
  switch (primitiveType) {
    case PrimitiveType.POINTS:
      return POINTS_LAYOUT;
    case PrimitiveType.LINES:
      return LINES_LAYOUT;
    case PrimitiveType.LINE_STRIP:
      return LINE_STRIP_LAYOUT;
    case PrimitiveType.LINE_LOOP:
      return createLineLoopLayout(indexCount);
    case PrimitiveType.TRIANGLES:
      return TRIANGLES_LAYOUT;
    case PrimitiveType.TRIANGLE_STRIP:
      return TRIANGLE_STRIP_LAYOUT;
    case PrimitiveType.TRIANGLE_FAN:
      return TRIANGLE_FAN_LAYOUT;
  }
  throw new DeveloperError(
    `Unsupported primitiveType for geometry access: ${primitiveType}`,
  );
}

/**
 * Creates a function that resolves a slot in the index stream to a vertex
 * index. For non-indexed geometry the typed array is undefined and the index
 * stream is the identity function.
 *
 * @param {Uint8Array|Uint16Array|Uint32Array|undefined} indexTypedArray
 * @returns {function(number): number}
 * @private
 */
function createIndexReader(indexTypedArray) {
  if (!defined(indexTypedArray)) {
    return (i) => i;
  }
  return (i) => indexTypedArray[i];
}

/**
 * Reads a primitive's indices into a typed array, reusing the existing
 * <code>typedArray</code> on the indices object when available.
 *
 * @param {import("../ModelComponents.js").Indices} indices
 * @returns {Uint8Array|Uint16Array|Uint32Array}
 * @private
 */
function readIndicesAsTypedArray(indices) {
  if (defined(indices.typedArray)) {
    return indices.typedArray;
  }
  const indexTypedArray = createIndexTypedArray(
    indices.indexDatatype,
    indices.count,
  );
  indices.buffer.getBufferData(indexTypedArray);
  return indexTypedArray;
}

/**
 * Creates a typed array sized for the given index datatype and element count.
 *
 * @param {number} indexDatatype A {@link IndexDatatype} value.
 * @param {number} size The number of elements.
 * @returns {Uint8Array|Uint16Array|Uint32Array}
 * @private
 */
function createIndexTypedArray(indexDatatype, size) {
  switch (indexDatatype) {
    case IndexDatatype.UNSIGNED_BYTE:
      return new Uint8Array(size);
    case IndexDatatype.UNSIGNED_SHORT:
      return new Uint16Array(size);
    case IndexDatatype.UNSIGNED_INT:
      return new Uint32Array(size);
  }
  throw new DeveloperError(
    `The indexDatatype must be UNSIGNED_BYTE, UNSIGNED_SHORT, or UNSIGNED_INT, but is ${indexDatatype}`,
  );
}

export default ModelGeometryAccessSession;
