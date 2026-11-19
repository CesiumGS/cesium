// @ts-check

import {
  AttributeCompression,
  AttributeType,
  Cartesian2,
  Cartesian3,
  ComponentDatatype,
  DeveloperError,
  Math as CesiumMath,
  PrimitiveType,
  defined,
} from "@cesium/core";
import GeometryAttributeDescriptor from "../GeometryAttributeDescriptor.js";
import GeometryReader from "../GeometryReader.js";
import GeometryWriter from "../GeometryWriter.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/** @import { TypedArray } from "@cesium/core"; */
/** @import Buffer from "../../Renderer/Buffer.js"; */
/** @import { Attribute, Primitive, Quantization } from "../ModelComponents.js"; */
/** @import { GeometryAccessOptions } from "../GeometryReader.js"; */
/** @import { GeometryAttributeReader, GeometryCornerAttributeReader, GeometryPrimitiveReader } from "../GeometryReadSession.js"; */
/** @import GeometryWriteSession, { GeometryAttributeWriter, GeometryCornerAttributeWriter } from "../GeometryWriteSession.js"; */

/**
 * An attribute's components as laid out in its buffer, starting at its first
 * vertex. Values are undefined for attributes with a constant value instead
 * of a buffer.
 *
 * @typedef {object} AttributeValues
 * @property {TypedArray|undefined} values
 * @property {number} stride The distance between vertices, in components.
 * @property {Uint8Array} [bufferBytes] The bytes read back from the attribute's GPU buffer, which <code>values</code> is a view of. Undefined if <code>values</code> was staged from the CPU copy, or the attribute is constant.
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
 * Provides read and write access to the primitive's vertex attributes and
 * index data, decoding and encoding them as needed to translate to and from the GPU's format.
 *
 * Only the requested attributes are read back (unless the attribute buffer is interleaved).
 * If multiple interleaved attributes are requested, they are read back together for efficiency.
 * Read sessions use an attribute's CPU copy if it has one. Write sessions use it only if the attribute
 * isn't interleaved, since writes are uploaded in the GPU buffer's layout. Indices are read only when
 * primitives (points, lines, triangles) are requested.
 *
 * @implements {GeometryWriteSession}
 * @private
 */
class ModelPrimitiveAccessSession {
  static #scratchCartesian2 = new Cartesian2();
  static #scratchCartesian3 = new Cartesian3();

  /** @type {RequestedAttribute[]} */
  #requestedAttributes;
  #vertexCount;
  #indexCount;
  #primitiveCount;
  #primitiveVertexCount;
  /** @type {GeometryPrimitiveReader | undefined} */
  #primitiveReader;
  #writable;
  /** @type {function(): void} */
  #onCommit;
  /** @type {Set<RequestedAttribute>} */
  #writtenAttributes = new Set();
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
        ModelPrimitiveAccessSession.#getDescriptor(attribute),
      ),
      createReadSession: (options) =>
        new ModelPrimitiveAccessSession(primitive, options),
    });
  }

  /**
   * Creates a writer for the primitive's geometry.
   *
   * @param {Primitive} primitive The primitive to write.
   * @param {GeometryReader} reader The primitive's reader.
   * @param {function(): void} onCommit Called after a session's writes are applied.
   * @returns {GeometryWriter} The writer.
   */
  static createGeometryWriter(primitive, reader, onCommit) {
    return new GeometryWriter({
      reader,
      createWriteSession: (options) =>
        new ModelPrimitiveAccessSession(primitive, options, true, onCommit),
    });
  }

  /**
   * @param {Primitive} primitive The primitive whose geometry is being accessed.
   * @param {Required<GeometryAccessOptions>} options The data to stage. All requested attributes must be available.
   * @param {boolean} [writable=false] Whether the session writes. Writable sessions stage copies of the attributes, so writes can be uploaded on commit.
   * @param {function(): void} [onCommit] Called after the session's writes are applied.
   */
  constructor(primitive, options, writable = false, onCommit = () => {}) {
    this.#writable = writable;
    this.#onCommit = onCommit;
    const attributes = primitive.attributes;
    const descriptors = attributes.map((attribute) =>
      ModelPrimitiveAccessSession.#getDescriptor(attribute),
    );

    const requested = options.attributes.map((requestedDescriptor) => {
      const index = descriptors.findIndex((descriptor) =>
        descriptor.equals(requestedDescriptor),
      );
      return { descriptor: descriptors[index], attribute: attributes[index] };
    });

    const attributeValues = ModelPrimitiveAccessSession.#readAttributeValues(
      requested.map(({ attribute }) => attribute),
      writable,
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
        ModelPrimitiveAccessSession.#readIndices(primitive),
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
   * @returns {number}
   */
  cornerCount() {
    return this.#primitiveCount * this.#primitiveVertexCount;
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
    const { attribute, attributeValues } =
      this.#getRequestedAttribute(descriptor);

    let reader = ModelPrimitiveAccessSession.#createDecodedReader(
      attribute,
      attributeValues,
    );

    // Colors always read as RGBA, so RGB colors get an alpha of 1, as in Cesium's shaders.
    if (
      attribute.semantic === VertexAttributeSemantic.COLOR &&
      ModelPrimitiveAccessSession.#getComponentCount(attribute.type) === 3
    ) {
      reader = ModelPrimitiveAccessSession.#createRgbaReader(reader);
    }

    return reader;
  }

  /**
   * Note: Model attributes (being based on glTF) are all per-vertex, so reading a corner's attribute
   * value simply reads the corresponding vertex's attribute value. This does redundant work,
   * so you should always use {@link ModelPrimitiveAccessSession#vertexAttributeReader} instead. This
   * function exists for completeness, but its use is discouraged.
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryCornerAttributeReader}
   */
  cornerAttributeReader(descriptor) {
    return /** @type {GeometryCornerAttributeReader} */ (
      this.#createCornerFunction(this.vertexAttributeReader(descriptor))
    );
  }

  /**
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeWriter}
   */
  vertexAttributeWriter(descriptor) {
    const requested = this.#getRequestedAttribute(descriptor);
    const { attribute, attributeValues } = requested;

    //>>includeStart('debug', pragmas.debug);
    if (!this.#writable) {
      throw new DeveloperError("This session is read-only.");
    }
    if (!defined(attributeValues.values)) {
      throw new DeveloperError(
        `Attribute ${descriptor.semantic} has a constant value and can't be written.`,
      );
    }
    //>>includeEnd('debug');

    this.#writtenAttributes.add(requested);

    return ModelPrimitiveAccessSession.#createEncodedWriter(
      attribute,
      attributeValues,
    );
  }

  /**
   * Note: Model attributes are all per-vertex, so writing a corner's attribute
   * value writes the corresponding vertex's value, which other corners may share.
   * Thus, prefer the vertexAttributeWriter whenever possible; this method is for completeness.
   *
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryCornerAttributeWriter}
   */
  cornerAttributeWriter(descriptor) {
    return this.#createCornerFunction(this.vertexAttributeWriter(descriptor));
  }

  commit() {
    const uploadedBuffers = new Set();
    for (const { attribute, attributeValues } of this.#writtenAttributes) {
      const { bufferBytes, values } = attributeValues;

      // Positions bound the primitive, e.g. for culling.
      // Note: currently, the min/max values of other attributes are not updated.
      // The same function could be used for other attributes, but in some cases it's not possible
      // to determine whether their min/max are in decoded or stored units: glTF stores them in stored
      // units for normalized attributes, but the loader decodes them for KHR_mesh_quantization.
      if (attribute.semantic === VertexAttributeSemantic.POSITION) {
        ModelPrimitiveAccessSession.#updatePositionMinMax(
          attribute,
          attributeValues,
        );
      }

      // When defined, bufferBytes indicates that the attribute has been read back from the GPU.
      // So this check is for attributes that have _not_ been read-back, but rather written to directly via the existing CPU typed arrays.
      // We must update the GPU buffer with the CPU values, and _move_ our the CPU copy we made to the attribute's typed array.
      if (!defined(bufferBytes)) {
        const cpuValues = /** @type {any} */ (values);
        attribute.buffer?.copyFromArrayView(cpuValues, attribute.byteOffset);
        attribute.typedArray = cpuValues;
        continue;
      }

      // Read-back attributes.
      // Staged from the GPU buffer, which may hold other attributes, so it's uploaded whole, once.
      if (!uploadedBuffers.has(attribute.buffer)) {
        attribute.buffer.copyFromArrayView(bufferBytes);
        uploadedBuffers.add(attribute.buffer);
      }

      // Its CPU copy, if it has one (e.g. if it's interleaved), is updated too.
      if (defined(attribute.typedArray)) {
        ModelPrimitiveAccessSession.#packBufferValuesIntoTypedArray(
          attribute,
          attributeValues,
        );
      }
    }

    this.#onCommit();
  }

  destroy() {
    this.#requestedAttributes = [];
    this.#primitiveReader = undefined;
    this.#writtenAttributes.clear();
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
      throw new DeveloperError("The session has ended.");
    }
  }

  /**
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {RequestedAttribute}
   */
  #getRequestedAttribute(descriptor) {
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

    return /** @type {RequestedAttribute} */ (requested);
  }

  /**
   * Wraps a vertex attribute reader or writer to take a corner of a primitive
   * instead of a vertex.
   *
   * @template {GeometryAttributeReader|GeometryAttributeWriter} F
   * @param {F} vertexFunction
   * @returns {function(number, number, (number[]|TypedArray), number=): ReturnType<F>}
   */
  #createCornerFunction(vertexFunction) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this.#primitiveReader)) {
      throw new DeveloperError(
        "Primitives were not requested for this session.",
      );
    }
    //>>includeEnd('debug');

    const readPrimitive = /** @type {GeometryPrimitiveReader} */ (
      this.#primitiveReader
    );
    const vertexIndices = new Array(this.#primitiveVertexCount);

    return (primitiveIndex, cornerIndex, values, offset = 0) => {
      readPrimitive(primitiveIndex, vertexIndices);
      return /** @type {ReturnType<F>} */ (
        vertexFunction(vertexIndices[cornerIndex], values, offset)
      );
    };
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
    const componentDatatype =
      defined(attribute.quantization) || attribute.normalized
        ? ComponentDatatype.FLOAT
        : attribute.componentDatatype;

    if (defined(attribute.semantic)) {
      return new GeometryAttributeDescriptor({
        semantic: /** @type {VertexAttributeSemantic} */ (attribute.semantic),
        setIndex: attribute.setIndex,
        componentDatatype,
      });
    }

    return new GeometryAttributeDescriptor({
      semantic: attribute.name,
      type: attribute.type,
      componentDatatype,
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
    const componentCount = ModelPrimitiveAccessSession.#getComponentCount(type);

    const bytesPerComponent = /** @type {any} */ (
      ComponentDatatype
    ).getSizeInBytes(componentDatatype);

    const byteStride =
      attribute.byteStride ?? componentCount * bytesPerComponent;

    return { componentDatatype, componentCount, bytesPerComponent, byteStride };
  }

  /**
   * Gets the values of each attribute, from its CPU copy if it can be used,
   * otherwise from its GPU buffer. If any attribute is read from a GPU
   * buffer, every attribute in that buffer is, so that each buffer is staged,
   * and uploaded, in one piece.
   *
   * @param {Attribute[]} attributes
   * @param {boolean} writable
   * @returns {AttributeValues[]}
   * @ignore
   */
  static #readAttributeValues(attributes, writable) {
    const readBackBuffers = new Set(
      attributes
        .filter(
          (attribute) =>
            defined(attribute.buffer) &&
            !ModelPrimitiveAccessSession.#canUseCpuCopy(attribute, writable),
        )
        .map((attribute) => attribute.buffer),
    );

    /** @type {Map<Buffer, Uint8Array>} */
    const readBackBytes = new Map();

    return attributes.map((attribute) => {
      if (readBackBuffers.has(attribute.buffer)) {
        return ModelPrimitiveAccessSession.#readGpuValues(
          attribute,
          readBackBytes,
        );
      }

      if (defined(attribute.typedArray)) {
        return ModelPrimitiveAccessSession.#readCpuValues(attribute, writable);
      }

      // Attributes without a buffer or CPU copy have a constant value, e.g. a
      // glTF accessor without a bufferView, whose values are all zero.
      return { values: undefined, stride: 0 };
    });
  }

  /**
   * Determines if an attribute's values can be staged from its CPU copy.
   * Write sessions can't use the CPU copy of an interleaved attribute, since
   * the CPU copy is de-interleaved and writes are uploaded in the GPU
   * buffer's layout.
   *
   * @param {Attribute} attribute
   * @param {boolean} writable
   * @returns {boolean}
   * @ignore
   */
  static #canUseCpuCopy(attribute, writable) {
    if (!defined(attribute.typedArray)) {
      return false;
    }

    const { componentCount, bytesPerComponent, byteStride } =
      ModelPrimitiveAccessSession.#getAttributeLayout(attribute);
    const interleaved = byteStride !== componentCount * bytesPerComponent;

    return !(writable && interleaved);
  }

  /**
   * Gets an attribute's values from its CPU copy. Writable sessions get a
   * copy, so writes aren't applied until they're committed.
   *
   * @param {Attribute} attribute
   * @param {boolean} writable
   * @returns {AttributeValues}
   * @ignore
   */
  static #readCpuValues(attribute, writable) {
    const cpuCopy = /** @type {TypedArray} */ (attribute.typedArray);
    const { componentCount } =
      ModelPrimitiveAccessSession.#getAttributeLayout(attribute);

    return {
      values: writable ? cpuCopy.slice() : cpuCopy,
      stride: componentCount,
    };
  }

  /**
   * Gets an attribute's values from its GPU buffer, reading back each buffer
   * once, even if several attributes are interleaved in it.
   *
   * @param {Attribute} attribute
   * @param {Map<Buffer, Uint8Array>} readBackBytes The bytes of the buffers read back so far.
   * @returns {AttributeValues}
   * @ignore
   */
  static #readGpuValues(attribute, readBackBytes) {
    const { componentDatatype, bytesPerComponent, byteStride } =
      ModelPrimitiveAccessSession.#getAttributeLayout(attribute);
    const buffer = /** @type {Buffer} */ (attribute.buffer);

    let bytes = readBackBytes.get(buffer);
    if (!defined(bytes)) {
      bytes = new Uint8Array(/** @type {any} */ (buffer).sizeInBytes);
      buffer.getBufferData(bytes);
      readBackBytes.set(buffer, bytes);
    }

    // WebGL requires attribute offsets and strides to be multiples of the
    // component size, so the attribute can be viewed in place.
    const values = /** @type {any} */ (ComponentDatatype).createArrayBufferView(
      componentDatatype,
      bytes.buffer,
      attribute.byteOffset,
      Math.floor((bytes.byteLength - attribute.byteOffset) / bytesPerComponent),
    );

    return {
      values,
      stride: byteStride / bytesPerComponent,
      bufferBytes: bytes,
    };
  }

  /**
   * Sets a position attribute's min and max to the bounds of its staged
   * values, decoded.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @ignore
   */
  static #updatePositionMinMax(attribute, attributeValues) {
    const read = ModelPrimitiveAccessSession.#createDecodedReader(
      attribute,
      attributeValues,
    );
    const min = Cartesian3.fromElements(Infinity, Infinity, Infinity);
    const max = Cartesian3.fromElements(-Infinity, -Infinity, -Infinity);
    const position = new Cartesian3();
    const values = new Array(3);

    for (let i = 0; i < attribute.count; ++i) {
      read(i, values);
      Cartesian3.fromArray(values, 0, position);
      Cartesian3.minimumByComponent(min, position, min);
      Cartesian3.maximumByComponent(max, position, max);
    }

    attribute.min = min;
    attribute.max = max;
  }

  /**
   * Packs an attribute's values, as staged from its GPU buffer where they may
   * be interleaved with other attributes, into its CPU typed array.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @ignore
   */
  static #packBufferValuesIntoTypedArray(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const cpuCopy = /** @type {TypedArray} */ (attribute.typedArray);
    const { componentCount } =
      ModelPrimitiveAccessSession.#getAttributeLayout(attribute);

    for (let i = 0; i < attribute.count; ++i) {
      for (let c = 0; c < componentCount; ++c) {
        cpuCopy[i * componentCount + c] = valuesArray[i * stride + c];
      }
    }
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
      return ModelPrimitiveAccessSession.#createConstantReader(attribute);
    }

    if (attribute.quantization?.octEncoded) {
      return ModelPrimitiveAccessSession.#createOctDecodedReader(
        attribute,
        attributeValues,
      );
    }

    if (defined(attribute.quantization)) {
      return ModelPrimitiveAccessSession.#createDequantizedReader(
        attribute,
        attributeValues,
      );
    }

    if (attribute.normalized) {
      return ModelPrimitiveAccessSession.#createNormalizedReader(
        attribute,
        attributeValues,
      );
    }

    return ModelPrimitiveAccessSession.#createRawReader(
      attribute,
      attributeValues,
    );
  }

  /**
   * Creates a writer that encodes values into how the attribute
   * is stored via a specialized writer. The inverse of
   * #createDecodedReader. Writes only the attribute's components, so RGB
   * colors ignore alpha.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeWriter}
   * @ignore
   */
  static #createEncodedWriter(attribute, attributeValues) {
    if (attribute.quantization?.octEncoded) {
      return ModelPrimitiveAccessSession.#createOctEncodedWriter(
        attribute,
        attributeValues,
      );
    }

    if (defined(attribute.quantization)) {
      return ModelPrimitiveAccessSession.#createQuantizedWriter(
        attribute,
        attributeValues,
      );
    }

    if (attribute.normalized) {
      return ModelPrimitiveAccessSession.#createNormalizedWriter(
        attribute,
        attributeValues,
      );
    }

    return ModelPrimitiveAccessSession.#createRawWriter(
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
    const componentCount = ModelPrimitiveAccessSession.#getComponentCount(
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
   * Writes values that are stored ready to use.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeWriter}
   * @ignore
   */
  static #createRawWriter(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const componentCount = ModelPrimitiveAccessSession.#getComponentCount(
      attribute.type,
    );

    return (vertexIndex, source, offset = 0) => {
      const base = vertexIndex * stride;
      for (let i = 0; i < componentCount; ++i) {
        valuesArray[base + i] = source[offset + i];
      }
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
    const componentCount = ModelPrimitiveAccessSession.#getComponentCount(
      attribute.type,
    );
    const { scale, min } =
      ModelPrimitiveAccessSession.#getNormalization(attribute);

    return (vertexIndex, result, offset = 0) => {
      const base = vertexIndex * stride;
      for (let i = 0; i < componentCount; ++i) {
        result[offset + i] = Math.max(valuesArray[base + i] * scale, min);
      }
      return result;
    };
  }

  /**
   * Writes values as integers that the GPU normalizes, rounding and clamping
   * them to the stored type.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeWriter}
   * @ignore
   */
  static #createNormalizedWriter(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const componentCount = ModelPrimitiveAccessSession.#getComponentCount(
      attribute.type,
    );
    const { scale } = ModelPrimitiveAccessSession.#getNormalization(attribute);
    const toStored =
      ModelPrimitiveAccessSession.#createIntegerEncoder(attribute);

    return (vertexIndex, source, offset = 0) => {
      const base = vertexIndex * stride;
      for (let i = 0; i < componentCount; ++i) {
        valuesArray[base + i] = toStored(source[offset + i] / scale);
      }
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
    const componentCount = ModelPrimitiveAccessSession.#getComponentCount(
      attribute.type,
    );
    const { scale, min } =
      ModelPrimitiveAccessSession.#getNormalization(attribute);

    const quantization = /** @type {Quantization} */ (attribute.quantization);
    const stepSizes = ModelPrimitiveAccessSession.#pack(
      quantization.quantizedVolumeStepSize,
      attribute.type,
    );
    const offsets = ModelPrimitiveAccessSession.#pack(
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
   * Writes values as quantized values, rounding and clamping them to the
   * stored type.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeWriter}
   * @ignore
   */
  static #createQuantizedWriter(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const componentCount = ModelPrimitiveAccessSession.#getComponentCount(
      attribute.type,
    );
    const { scale } = ModelPrimitiveAccessSession.#getNormalization(attribute);
    const toStored =
      ModelPrimitiveAccessSession.#createIntegerEncoder(attribute);

    const quantization = /** @type {Quantization} */ (attribute.quantization);
    const stepSizes = ModelPrimitiveAccessSession.#pack(
      quantization.quantizedVolumeStepSize,
      attribute.type,
    );
    const offsets = ModelPrimitiveAccessSession.#pack(
      quantization.quantizedVolumeOffset,
      attribute.type,
    );

    return (vertexIndex, source, offset = 0) => {
      const base = vertexIndex * stride;
      for (let i = 0; i < componentCount; ++i) {
        const value = (source[offset + i] - offsets[i]) / stepSizes[i];
        valuesArray[base + i] = toStored(value / scale);
      }
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
      ModelPrimitiveAccessSession.#getNormalization(attribute);

    const quantization = /** @type {Quantization} */ (attribute.quantization);
    const range = /** @type {number} */ (quantization.normalizationRange);
    const zxy = quantization.octEncodedZXY;
    const decoded = ModelPrimitiveAccessSession.#scratchCartesian3;

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
   * Writes vectors, such as normals, as two oct-encoded components. Vectors
   * are normalized first.
   *
   * @param {Attribute} attribute
   * @param {AttributeValues} attributeValues
   * @returns {GeometryAttributeWriter}
   * @ignore
   */
  static #createOctEncodedWriter(attribute, attributeValues) {
    const { values, stride } = attributeValues;
    const valuesArray = /** @type {TypedArray} */ (values);
    const { scale } = ModelPrimitiveAccessSession.#getNormalization(attribute);
    const toStored =
      ModelPrimitiveAccessSession.#createIntegerEncoder(attribute);

    const quantization = /** @type {Quantization} */ (attribute.quantization);
    const range = /** @type {number} */ (quantization.normalizationRange);
    const zxy = quantization.octEncodedZXY;
    const vector = ModelPrimitiveAccessSession.#scratchCartesian3;
    const encoded = ModelPrimitiveAccessSession.#scratchCartesian2;

    return (vertexIndex, source, offset = 0) => {
      // Undoes the reader's ZXY swizzle.
      if (zxy) {
        vector.x = source[offset + 1];
        vector.y = source[offset + 2];
        vector.z = source[offset];
      } else {
        vector.x = source[offset];
        vector.y = source[offset + 1];
        vector.z = source[offset + 2];
      }

      /** @type {any} */ (AttributeCompression).octEncodeInRange(
        Cartesian3.normalize(vector, vector),
        range,
        encoded,
      );

      const base = vertexIndex * stride;
      valuesArray[base] = toStored(encoded.x / scale);
      valuesArray[base + 1] = toStored(encoded.y / scale);
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
    const values = ModelPrimitiveAccessSession.#pack(
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
      ModelPrimitiveAccessSession.#getAttributeLayout(attribute);

    const divisor = /** @type {any} */ (
      ComponentDatatype
    ).getNormalizationDivisor(componentDatatype);

    return { scale: 1.0 / divisor, min: -1.0 };
  }

  /**
   * Creates a function that rounds a value to the attribute's stored integer
   * type, clamping it to the type's range so it doesn't wrap around.
   *
   * @param {Attribute} attribute
   * @returns {function(number): number}
   * @ignore
   */
  static #createIntegerEncoder(attribute) {
    const { componentDatatype } =
      ModelPrimitiveAccessSession.#getAttributeLayout(attribute);

    const highest = /** @type {any} */ (
      ComponentDatatype
    ).getNormalizationDivisor(componentDatatype);

    const signed =
      componentDatatype === ComponentDatatype.BYTE ||
      componentDatatype === ComponentDatatype.SHORT ||
      componentDatatype === ComponentDatatype.INT;
    const lowest = signed ? -highest - 1 : 0;

    return (value) => CesiumMath.clamp(Math.round(value), lowest, highest);
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

export default ModelPrimitiveAccessSession;
