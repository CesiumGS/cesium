// @ts-check

import {
  AttributeCompression,
  AttributeType,
  Cartesian3,
  ComponentDatatype,
  DeveloperError,
  PrimitiveType,
  defined,
} from "@cesium/core";
import GeometryAttributeDescriptor from "../GeometryAttributeDescriptor.js";
import GeometryReader from "../GeometryReader.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/** @import { TypedArray } from "@cesium/core"; */
/** @import Buffer from "../../Renderer/Buffer.js"; */
/** @import { Attribute, Primitive, Quantization } from "../ModelComponents.js"; */
/** @import { GeometryReadSessionOptions } from "../GeometryReader.js"; */
/** @import GeometryReadSession, { GeometryAttributeReader, GeometryPrimitiveReader } from "../GeometryReadSession.js"; */

/**
 * An attribute's components as laid out in its buffer, starting at its first
 * vertex. Values are undefined for attributes with a constant value instead
 * of a buffer.
 *
 * @typedef {object} AttributeValues
 * @property {TypedArray|undefined} values
 * @property {number} stride The distance between vertices, in components.
 * @private
 */

/**
 * An attribute requested for the session, with its values read for the
 * session's lifetime.
 *
 * @typedef {object} RequestedAttribute
 * @property {GeometryAttributeDescriptor} descriptor
 * @property {Attribute} attribute
 * @property {AttributeValues} attributeValues
 * @private
 */

/**
 * A {@link GeometryReadSession} for a {@link Primitive} of a model. Provides access
 * to the primitive's vertex attributes and index data, decoding them as the GPU would.
 *
 * Only the requested attributes are read back (unless the attribute buffer is interleaved).
 * Multiple interleaved attributes are read back together for efficiency.
 * Attributes that already have a CPU copy aren't read back. Indices are read only when
 * primitives are requested.
 *
 * @implements {GeometryReadSession}
 * @private
 */
class ModelPrimitiveReadSession {
  static #scratchCartesian3 = new Cartesian3();

  /** @type {RequestedAttribute[]} */
  #requestedAttributes;
  #vertexCount;
  #indexCount;
  #primitiveCount;
  #primitiveVertexCount;
  /** @type {GeometryPrimitiveReader | undefined} */
  #primitiveReader;
  #destroyed = false;

  /**
   * Creates a reader for the primitive's geometry.
   *
   * @param {Primitive} primitive The primitive to read.
   * @returns {GeometryReader} The reader.
   */
  static createGeometryReader(primitive) {
    return new GeometryReader({
      availableAttributes: primitive.attributes.map((attribute) =>
        ModelPrimitiveReadSession.#getDescriptor(attribute),
      ),
      createReadSession: (options) =>
        new ModelPrimitiveReadSession(primitive, options),
    });
  }

  /**
   * @param {Primitive} primitive The primitive to read.
   * @param {Required<GeometryReadSessionOptions>} options The data to stage. All requested attributes must be available.
   */
  constructor(primitive, options) {
    const attributes = primitive.attributes;
    const descriptors = attributes.map((attribute) =>
      ModelPrimitiveReadSession.#getDescriptor(attribute),
    );

    const requested = options.attributes.map((requestedDescriptor) => {
      const index = descriptors.findIndex((descriptor) =>
        descriptor.equals(requestedDescriptor),
      );
      return { descriptor: descriptors[index], attribute: attributes[index] };
    });

    const attributeValues = ModelPrimitiveReadSession.#readAttributeValues(
      requested.map(({ attribute }) => attribute),
    );

    this.#requestedAttributes = requested.map(
      ({ descriptor, attribute }, i) => ({
        descriptor,
        attribute,
        attributeValues: attributeValues[i],
      }),
    );

    this.#vertexCount = attributes.length > 0 ? attributes[0].count : 0;

    this.#indexCount = primitive.indices?.count ?? this.#vertexCount;

    this.#primitiveCount = /** @type {any} */ (PrimitiveType).getPrimitiveCount(
      primitive.primitiveType,
      this.#indexCount,
    );

    this.#primitiveVertexCount = /** @type {any} */ (
      PrimitiveType
    ).getVerticesPerPrimitive(primitive.primitiveType);

    if (options.primitives) {
      this.#primitiveReader = /** @type {any} */ (
        PrimitiveType
      ).createPrimitiveReader(
        primitive.primitiveType,
        this.#indexCount,
        ModelPrimitiveReadSession.#readIndices(primitive),
      );
    }
  }

  /**
   * @returns {number}
   */
  vertexCount() {
    return this.#vertexCount;
  }

  /**
   * @returns {number}
   */
  primitiveCount() {
    return this.#primitiveCount;
  }

  /**
   * @param {number} primitiveIndex
   * @returns {number}
   */
  primitiveVertexCount(primitiveIndex) {
    return this.#primitiveVertexCount;
  }

  /**
   * @returns {GeometryPrimitiveReader}
   */
  primitiveReader() {
    //>>includeStart('debug', pragmas.debug);
    this.#checkNotDestroyed();
    if (!defined(this.#primitiveReader)) {
      throw new DeveloperError(
        "Primitives were not requested for this session.",
      );
    }
    //>>includeEnd('debug');

    return /** @type {GeometryPrimitiveReader} */ (this.#primitiveReader);
  }

  /**
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeReader}
   */
  vertexAttributeReader(descriptor) {
    const requested = this.#requestedAttributes.find((requested) =>
      requested.descriptor.equals(descriptor),
    );

    //>>includeStart('debug', pragmas.debug);
    this.#checkNotDestroyed();
    if (!defined(requested)) {
      throw new DeveloperError(
        `Attribute ${descriptor.semantic} was not requested for this session.`,
      );
    }
    //>>includeEnd('debug');

    const { attribute, attributeValues } = /** @type {RequestedAttribute} */ (
      requested
    );

    let reader = ModelPrimitiveReadSession.#createDecodedReader(
      attribute,
      attributeValues,
    );

    // Colors always read as RGBA, so RGB colors get an alpha of 1, as in Cesium's shaders.
    if (
      attribute.semantic === VertexAttributeSemantic.COLOR &&
      ModelPrimitiveReadSession.#getComponentCount(attribute.type) === 3
    ) {
      reader = ModelPrimitiveReadSession.#createRgbaReader(reader);
    }

    return reader;
  }

  destroy() {
    this.#requestedAttributes = [];
    this.#primitiveReader = undefined;
    this.#destroyed = true;
  }

  /**
   * @param {AttributeType} attributeType
   * @returns {number}
   * @ignore
   */
  static #getComponentCount(attributeType) {
    return /** @type {any} */ (AttributeType).getNumberOfComponents(
      attributeType,
    );
  }

  #checkNotDestroyed() {
    if (this.#destroyed) {
      throw new DeveloperError("The read session has ended.");
    }
  }

  /**
   * Gets the descriptor for a model attribute. Custom attributes have no
   * semantic, so their full name, e.g. _TEMPERATURE_0, is the semantic.
   *
   * @param {Attribute} attribute
   * @returns {GeometryAttributeDescriptor}
   * @ignore
   */
  static #getDescriptor(attribute) {
    if (defined(attribute.semantic)) {
      return new GeometryAttributeDescriptor({
        semantic: /** @type {VertexAttributeSemantic} */ (attribute.semantic),
        setIndex: attribute.setIndex,
      });
    }

    return new GeometryAttributeDescriptor({
      semantic: attribute.name,
      type: attribute.type,
    });
  }

  /**
   * Gets how an attribute's components are laid out in its buffer, which
   * differs from how they decode when the attribute is quantized.
   *
   * @param {Attribute} attribute
   * @returns {{componentDatatype: ComponentDatatype, componentCount: number, bytesPerComponent: number, byteStride: number}}
   * @ignore
   */
  static #getAttributeLayout(attribute) {
    const { componentDatatype, type } = attribute.quantization ?? attribute;
    const componentCount = ModelPrimitiveReadSession.#getComponentCount(type);

    const bytesPerComponent = /** @type {any} */ (
      ComponentDatatype
    ).getSizeInBytes(componentDatatype);

    const byteStride =
      attribute.byteStride ?? componentCount * bytesPerComponent;

    return { componentDatatype, componentCount, bytesPerComponent, byteStride };
  }

  /**
   * Gets the values of each attribute. Uses CPU copies where they exist.
   * Otherwise, reads each GPU buffer once, even if several attributes are
   * interleaved in it.
   *
   * @param {Attribute[]} attributes
   * @returns {AttributeValues[]}
   * @ignore
   */
  static #readAttributeValues(attributes) {
    /** @type {Map<Buffer, Uint8Array>} */
    const bufferBytes = new Map();

    return attributes.map((attribute) => {
      const {
        componentDatatype,
        componentCount,
        bytesPerComponent,
        byteStride,
      } = ModelPrimitiveReadSession.#getAttributeLayout(attribute);

      if (defined(attribute.typedArray)) {
        return { values: attribute.typedArray, stride: componentCount };
      }

      // Attributes without a buffer have a constant value, e.g. a glTF
      // accessor without a bufferView, whose values are all zero.
      const buffer = attribute.buffer;
      if (!defined(buffer)) {
        return { values: undefined, stride: 0 };
      }

      let bytes = bufferBytes.get(buffer);
      if (!defined(bytes)) {
        bytes = new Uint8Array(/** @type {any} */ (buffer).sizeInBytes);
        buffer.getBufferData(bytes);
        bufferBytes.set(buffer, bytes);
      }

      // WebGL requires attribute offsets and strides to be multiples of the
      // component size, so the attribute can be viewed in place.
      const values = /** @type {any} */ (
        ComponentDatatype
      ).createArrayBufferView(
        componentDatatype,
        bytes.buffer,
        attribute.byteOffset,
        Math.floor(
          (bytes.byteLength - attribute.byteOffset) / bytesPerComponent,
        ),
      );

      return { values, stride: byteStride / bytesPerComponent };
    });
  }

  /**
   * Creates a reader that decodes the attribute's components into
   * ready-to-use values, picking one specialized reader for how the attribute
   * is stored.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeReader}
   * @ignore
   */
  static #createDecodedReader(attribute, attributeValues) {
    if (!defined(attributeValues.values)) {
      return ModelPrimitiveReadSession.#createConstantReader(attribute);
    }

    if (attribute.quantization?.octEncoded) {
      return ModelPrimitiveReadSession.#createOctDecodedReader(
        attribute,
        attributeValues,
      );
    }

    if (defined(attribute.quantization)) {
      return ModelPrimitiveReadSession.#createDequantizedReader(
        attribute,
        attributeValues,
      );
    }

    if (attribute.normalized) {
      return ModelPrimitiveReadSession.#createNormalizedReader(
        attribute,
        attributeValues,
      );
    }

    return ModelPrimitiveReadSession.#createRawReader(
      attribute,
      attributeValues,
    );
  }

  /**
   * Wraps a reader of RGB colors to read RGBA, with an alpha of 1.
   *
   * @param {GeometryAttributeReader} rgbReader
   * @returns {GeometryAttributeReader}
   * @ignore
   */
  static #createRgbaReader(rgbReader) {
    return (vertexIndex, result, offset = 0) => {
      rgbReader(vertexIndex, result, offset);
      result[offset + 3] = 1.0;
      return result;
    };
  }

  /**
   * Reads values that are stored ready to use, such as floats.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeReader}
   * @ignore
   */
  static #createRawReader(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const componentCount = ModelPrimitiveReadSession.#getComponentCount(
      attribute.type,
    );

    return (vertexIndex, result, offset = 0) => {
      const base = vertexIndex * stride;
      for (let i = 0; i < componentCount; ++i) {
        result[offset + i] = valuesArray[base + i];
      }
      return result;
    };
  }

  /**
   * Reads integers that the GPU normalizes to [0, 1] or [-1, 1].
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeReader}
   * @ignore
   */
  static #createNormalizedReader(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const componentCount = ModelPrimitiveReadSession.#getComponentCount(
      attribute.type,
    );
    const { scale, min } =
      ModelPrimitiveReadSession.#getNormalization(attribute);

    return (vertexIndex, result, offset = 0) => {
      const base = vertexIndex * stride;
      for (let i = 0; i < componentCount; ++i) {
        result[offset + i] = Math.max(valuesArray[base + i] * scale, min);
      }
      return result;
    };
  }

  /**
   * Reads quantized values, scaling and offsetting them back to their original range.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeReader}
   * @ignore
   */
  static #createDequantizedReader(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const componentCount = ModelPrimitiveReadSession.#getComponentCount(
      attribute.type,
    );
    const { scale, min } =
      ModelPrimitiveReadSession.#getNormalization(attribute);

    const quantization = /** @type {Quantization} */ (attribute.quantization);
    const stepSizes = ModelPrimitiveReadSession.#pack(
      quantization.quantizedVolumeStepSize,
      attribute.type,
    );
    const offsets = ModelPrimitiveReadSession.#pack(
      quantization.quantizedVolumeOffset,
      attribute.type,
    );

    return (vertexIndex, result, offset = 0) => {
      const base = vertexIndex * stride;
      for (let i = 0; i < componentCount; ++i) {
        const value = Math.max(valuesArray[base + i] * scale, min);
        result[offset + i] = value * stepSizes[i] + offsets[i];
      }
      return result;
    };
  }

  /**
   * Reads unit vectors, such as normals, stored as two oct-encoded components.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeReader}
   * @ignore
   */
  static #createOctDecodedReader(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const { scale, min } =
      ModelPrimitiveReadSession.#getNormalization(attribute);

    const quantization = /** @type {Quantization} */ (attribute.quantization);
    const range = /** @type {number} */ (quantization.normalizationRange);
    const zxy = quantization.octEncodedZXY;
    const decoded = ModelPrimitiveReadSession.#scratchCartesian3;

    return (vertexIndex, result, offset = 0) => {
      const base = vertexIndex * stride;
      AttributeCompression.octDecodeInRange(
        Math.max(valuesArray[base] * scale, min),
        Math.max(valuesArray[base + 1] * scale, min),
        range,
        decoded,
      );

      // Draco stores oct-encoded vectors as ZXY; this matches the shader's swizzle.
      if (zxy) {
        result[offset] = decoded.z;
        result[offset + 1] = decoded.x;
        result[offset + 2] = decoded.y;
      } else {
        result[offset] = decoded.x;
        result[offset + 1] = decoded.y;
        result[offset + 2] = decoded.z;
      }
      return result;
    };
  }

  /**
   * Reads an attribute that has no buffer, so every vertex has the same value.
   *
   * @param {Attribute} attribute
   * @returns {GeometryAttributeReader}
   * @ignore
   */
  static #createConstantReader(attribute) {
    const values = ModelPrimitiveReadSession.#pack(
      attribute.constant,
      attribute.type,
    );

    return (vertexIndex, result, offset = 0) => {
      for (let i = 0; i < values.length; ++i) {
        result[offset + i] = values[i];
      }
      return result;
    };
  }

  /**
   * Flattens a number or math type, such as a {@link Cartesian3}, into an array.
   *
   * @param {any} value
   * @param {AttributeType} attributeType The type of the value.
   * @returns {number[]}
   * @ignore
   */
  static #pack(value, attributeType) {
    if (typeof value === "number") {
      return [value];
    }

    const MathType = /** @type {any} */ (AttributeType).getMathType(
      attributeType,
    );

    return MathType.pack(value, []);
  }

  /**
   * Gets how the GPU normalizes the attribute's stored integers: multiplying
   * by a scale, then clamping at -1. Leaves values unchanged if the attribute
   * isn't normalized, since quantized values must not be clamped.
   *
   * @param {Attribute} attribute
   * @returns {{scale: number, min: number}}
   * @ignore
   */
  static #getNormalization(attribute) {
    if (!attribute.normalized) {
      return { scale: 1.0, min: -Infinity };
    }

    const { componentDatatype } =
      ModelPrimitiveReadSession.#getAttributeLayout(attribute);

    const divisor = /** @type {any} */ (
      ComponentDatatype
    ).getNormalizationDivisor(componentDatatype);

    return { scale: 1.0 / divisor, min: -1.0 };
  }

  /**
   * Reads the indices, or returns undefined if the primitive isn't indexed.
   *
   * @param {Primitive} primitive
   * @returns {Uint8Array|Uint16Array|Uint32Array|undefined}
   * @ignore
   */
  static #readIndices(primitive) {
    const indices = primitive.indices;
    if (!defined(indices)) {
      return undefined;
    }

    if (defined(indices.typedArray)) {
      return /** @type {Uint8Array|Uint16Array|Uint32Array} */ (
        indices.typedArray
      );
    }

    // IndexDatatype values are the same WebGL constants as their ComponentDatatype counterparts.
    const typedArray = /** @type {any} */ (ComponentDatatype).createTypedArray(
      indices.indexDatatype,
      indices.count,
    );

    indices.buffer.getBufferData(typedArray);
    return typedArray;
  }
}

export default ModelPrimitiveReadSession;
