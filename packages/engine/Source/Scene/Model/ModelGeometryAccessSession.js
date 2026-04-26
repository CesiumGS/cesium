import { destroyObject } from "@cesium/engine";
import AttributeCompression from "../../Core/AttributeCompression.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import oneTimeWarning from "../../Core/oneTimeWarning.js";
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
 * Currently only attribute reading is supported. Topology operations and
 * vertex attribute writing are not yet implemented.
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
  }

  /**
   * Releases the CPU-side copies of the loaded attribute buffers.
   */
  destroy() {
    this._attributeData.clear();
    destroyObject(this);
  }

  /**
   * No-op until write support is added.
   */
  commit() {}

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

export default ModelGeometryAccessSession;
