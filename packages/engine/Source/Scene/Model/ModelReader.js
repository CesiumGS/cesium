import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import DeveloperError from "../../Core/DeveloperError.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import AttributeCompression from "../../Core/AttributeCompression.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import Matrix4 from "../../Core/Matrix4.js";

import AttributeType from "../AttributeType.js";

/**
 * A class for reading the data from a <code>ModelComponents.Attribute</code>.
 *
 * NOTE: Much of the functionality here already exists, scattered in many places.
 * In most cases, the functionality is tailored for "one case" (like only handling
 * positions, or only normals, or not considering quantization, or not handling
 * interleaved buffers, ...). In many cases, the functionality is tailored for an
 * 'accessor' (and often, the functions also expect the 'gltf' to be given).
 * Most of what is done here (and in the existing functions) is pretty low-level
 * and generic, though: The functions could often be fed with some (count, type,
 * componentType), and there could be convenience functions that EITHER take these
 * values from an 'accessor' OR from an 'attribute'. The tl;dr: Large parts of
 * this could be "nicer", or "more generic", and "better" along all dimensions
 * of this term. Just give me time...
 *
 * NOTE: The fact that all this has to operate on TypedArray is unfortunate.
 * Most of the subsequent processing could operate on some abstraction of
 * that. The fact that that TypedArrays can be read/written as "bulk", and
 * then offer access that is "as efficient as it can be" could be a
 * justification, as part of the performance-genericity trade-off
 *
 * NOTE: All this does not properly handle MATn types. There should be SOME
 * abstraction for element- and component-wise access of the data. See
 * https://github.com/javagl/JglTF/blob/84ce6d019fec3b75b6af1649bbe834005b2c620f/jgltf-model/src/main/java/de/javagl/jgltf/model/AbstractAccessorData.java#L149
 *
 * @private
 */
class ModelReader {
  /**
   * Reads the data of the given atttribute into a typed array.
   *
   * This will read the data into a compact, flat array with the data
   * type corresponding to the data type of the attribute.
   *
   * If the attribute is contained in an interleaved buffer, marked as
   * 'normalized', quantized, or oct-encoded, then it will be deinterleaved,
   * normalization will be applied, it will be dequantized and oct-decoded
   * as necessary.
   *
   * The result will be THE actual attribute data.
   *
   * @param {ModelComponents.Attribute} attribute The attribute
   * @returns {TypedArray} The attribute data
   */
  static readAttributeAsTypedArray(attribute) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("attribute", attribute);
    //>>includeEnd('debug');

    // Obtain a compact (non-interleaved) typed array that contains
    // the components.
    const compactTypedArray =
      ModelReader.readAttributeAsRawCompactTypedArray(attribute);

    // If the attribute is not normalized and the data is not quantized
    // and not normalized, then this can be returned directly
    const normalized = attribute.normalized;
    const quantization = attribute.quantization;
    if (!defined(quantization) && !normalized) {
      return compactTypedArray;
    }

    const elementType = attribute.type;
    const elementCount = attribute.count;

    // If the attribute is normalized, normalize the data from
    // the typed array
    let normalizedTypedArray = compactTypedArray;
    if (normalized) {
      // Note that although this is called "dequantize", it does
      // not really "dequantize" based on the quantization. It only
      // performs the conversion from the (normalized) integer
      // component types into floating point.
      normalizedTypedArray = AttributeCompression.dequantize(
        compactTypedArray,
        attribute.componentDatatype,
        elementType,
        elementCount,
      );
    }

    if (!defined(quantization)) {
      return normalizedTypedArray;
    }
    // Now, this one actually DOES dequantize...
    const dequantizedTypedArray = ModelReader.dequantize(
      normalizedTypedArray,
      elementCount,
      elementType,
      quantization,
    );
    return dequantizedTypedArray;
  }

  /**
   * Read the data of the given attribute into a compact typed array.
   *
   * If the attribute is stored as interleaved data, then the result
   * will be the deinterleaved data. If the data is quantized or
   * normalized, then the resulting data will be the "raw" data,
   * without applying normalization or dequantization.
   *
   * @param {ModelComponents.Attribute} attribute The attribute
   * @returns {TypedArray} The raw attribute data
   */
  static readAttributeAsRawCompactTypedArray(attribute) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("attribute", attribute);
    //>>includeEnd('debug');

    const elementType = attribute.type;
    const elementCount = attribute.count;

    const componentsPerElement =
      AttributeType.getNumberOfComponents(elementType);
    const totalComponentCount = elementCount * componentsPerElement;

    // If the data is quantized, use the quantized component type
    let componentType = attribute.componentDatatype;
    const quantization = attribute.quantization;
    if (defined(quantization)) {
      componentType = quantization.componentDatatype;
    }
    const buffer = attribute.buffer;

    // If the byte stride is the default (i.e. the total element size),
    // then just fetch the whole buffer data into a typed array of the
    // desired target type, and return it
    const byteOffset = attribute.byteOffset;
    const byteStride = attribute.byteStride;
    const bytesPerComponent = ComponentDatatype.getSizeInBytes(componentType);
    const defaultByteStride = componentsPerElement * bytesPerComponent;
    if (!defined(byteStride) || byteStride === defaultByteStride) {
      const typedArray = ComponentDatatype.createTypedArray(
        componentType,
        totalComponentCount,
      );
      buffer.getBufferData(typedArray, byteOffset);
      return typedArray;
    }

    // Fetch the whole buffer in its raw form, to pick out the
    // interleaved values.
    // Note: When ALL attributes have to be fetched from an
    // interleaved buffer, then this getBufferData call will
    // be performed multiple times. It would be preferable to
    // have ONE "TypedArray[] getThemFrom(buffer)" call that
    // returns all of the (interleaved) attributes at once,
    // but this requires abstractions that we don't have.
    const fullTypedArray = new Uint8Array(buffer.sizeInBytes);
    buffer.getBufferData(fullTypedArray);

    // Read the components of each element, and write them into
    // a typed array in a compact form
    const compactTypedArray = ComponentDatatype.createTypedArray(
      componentType,
      totalComponentCount,
    );
    const elementByteStride = byteStride ?? defaultByteStride;
    const dataView = new DataView(
      fullTypedArray.buffer,
      fullTypedArray.byteOffset,
      fullTypedArray.byteLength,
    );
    const components = new Array(componentsPerElement);
    const componentsReader = ModelReader.createComponentsReader(componentType);
    for (let i = 0; i < elementCount; ++i) {
      const elementByteOffset = byteOffset + i * elementByteStride;
      componentsReader(
        dataView,
        elementByteOffset,
        componentsPerElement,
        components,
      );
      for (let j = 0; j < componentsPerElement; ++j) {
        compactTypedArray[i * componentsPerElement + j] = components[j];
      }
    }
    return compactTypedArray;
  }

  /**
   * Dequantize the data from the given input array, based on the given
   * quantization information, and return the result.
   *
   * This assumes that normalization has already been applied. This means that
   * when the <code>quantization.normalized</code> flag is <code>true</code>,
   * then the input is assumed to contain floating point values in the range
   * [-1, 1].
   *
   * @param {TypedArray} quantizedTypedArray The quantized typed array
   * @param {number} elementCount The number of elements
   * @param {AttributeType} elementType The element type
   * @param {ModelComponents.Quantization} quantization The quantization
   * @returns {TypedArray} The result
   * @throws DeveloperError When the element type is not SCALAR, VEC2,
   * VEC3, or VEC4
   */
  static dequantize(
    quantizedTypedArray,
    elementCount,
    elementType,
    quantization,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("quantizedTypedArray", quantizedTypedArray);
    Check.typeOf.number.greaterThanOrEquals("elementCount", elementCount, 0);
    Check.defined("elementType", elementType);
    Check.defined("quantization", quantization);
    //>>includeEnd('debug');

    if (quantization.octEncoded) {
      const dequantizedTypedArray = ModelReader.octDecode(
        quantizedTypedArray,
        elementCount,
        quantization.normalizationRange,
        undefined,
      );
      if (quantization.octEncodedZXY) {
        ModelReader.convertZxyToXyz(
          dequantizedTypedArray,
          dequantizedTypedArray,
        );
      }
      return dequantizedTypedArray;
    }

    // These could be generalized, if the offset/stepSize were not
    // CartesianX objects, but arrays...
    const stepSize = quantization.quantizedVolumeStepSize;
    const offset = quantization.quantizedVolumeOffset;
    if (elementType === AttributeType.SCALAR) {
      return ModelReader.dequantize1D(
        quantizedTypedArray,
        elementCount,
        stepSize,
        offset,
        undefined,
      );
    }
    if (elementType === AttributeType.VEC2) {
      return ModelReader.dequantize2D(
        quantizedTypedArray,
        elementCount,
        stepSize,
        offset,
        undefined,
      );
    }
    if (elementType === AttributeType.VEC3) {
      return ModelReader.dequantize3D(
        quantizedTypedArray,
        elementCount,
        stepSize,
        offset,
        undefined,
      );
    }
    if (elementType === AttributeType.VEC4) {
      return ModelReader.dequantize4D(
        quantizedTypedArray,
        elementCount,
        stepSize,
        offset,
        undefined,
      );
    }
    throw new DeveloperError(
      `Element type for dequantization must be SCALAR, VEC2, VEC3, or VEC4, but is ${elementType}`,
    );
  }

  /**
   * Decode oct-encoded normals from the given input, and write the
   * result into the given output, allocating and returning a new
   * array if the result was undefined.
   *
   * This will apply the <code>AttributeCompression.octDecodeInRange</code>
   * function to each three components of the input.
   *
   * @param {TypedArray} quantizedTypedArray The input
   * @param {number} elementCount The number of elements
   * @param {number} normalizationRange The normalization range
   * @param {TypedArray} [dequantizedTypedArray] The result
   * @returns {TypedArray} The result
   */
  static octDecode(
    quantizedTypedArray,
    elementCount,
    normalizationRange,
    dequantizedTypedArray,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("quantizedTypedArray", quantizedTypedArray);
    Check.typeOf.number.greaterThanOrEquals("elementCount", elementCount, 0);
    Check.typeOf.number.greaterThan(
      "normalizationRange",
      normalizationRange,
      0,
    );
    //>>includeEnd('debug');

    if (!defined(dequantizedTypedArray)) {
      dequantizedTypedArray = new Float32Array(quantizedTypedArray.length);
    }
    const c = new Cartesian3();
    for (let i = 0; i < elementCount; i++) {
      Cartesian3.unpack(quantizedTypedArray, i * 3, c);
      AttributeCompression.octDecodeInRange(c, normalizationRange, c);
      Cartesian3.pack(dequantizedTypedArray, c, i * 3);
    }
    return dequantizedTypedArray;
  }

  /**
   * Swizzle all three consecutive elements in the given input array
   * from (z, x, y) to (x, y, z), and write the result into the
   * given output array, creating a new array if the given output
   * array was undefined.
   *
   * @param {TypedArray} input The input
   * @param {number} elementCount The number of elements
   * @param {TypedArray} [output] The result
   * @returns {TypedArray} The result
   */
  static convertZxyToXyz(input, elementCount, output) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("input", input);
    Check.typeOf.number.greaterThanOrEquals("elementCount", elementCount, 0);
    //>>includeEnd('debug');

    if (!defined(output)) {
      output = new Float32Array(input.length);
    }
    let offset = 0;
    for (let i = 0; i < elementCount; i++, offset += 3) {
      const z = input[offset + 0];
      const x = input[offset + 1];
      const y = input[offset + 2];
      output[offset + 0] = x;
      output[offset + 1] = y;
      output[offset + 2] = z;
    }
    return output;
  }

  /**
   * Dequantize the given quantized array, based on the given quantization
   * information, and write the result into the given output array, creating
   * the output array if it was undefined.
   *
   * This will simply fill the output array with
   * <code>output[i] = input[i] * stepSize + offset</code>
   *
   * @param {TypedArray} quantizedTypedArray The quantized array
   * @param {number} elementCount The number of elements
   * @param {number} stepSize The quantization step size
   * @param {number} offset The quantization offset
   * @param {TypedArray} [dequantizedTypedArray] The result
   * @returns {TypedArray} The result
   */
  static dequantize1D(
    quantizedTypedArray,
    elementCount,
    stepSize,
    offset,
    dequantizedTypedArray,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("quantizedTypedArray", quantizedTypedArray);
    Check.typeOf.number.greaterThanOrEquals("elementCount", elementCount, 0);
    Check.defined("stepSize", stepSize);
    Check.defined("offset", offset);
    //>>includeEnd('debug');

    if (!defined(dequantizedTypedArray)) {
      dequantizedTypedArray = new Float32Array(quantizedTypedArray.length);
    }
    for (let i = 0; i < elementCount; i++) {
      const q = quantizedTypedArray[i];
      const d = q * stepSize + offset;
      dequantizedTypedArray[i] = d;
    }
    return dequantizedTypedArray;
  }

  /**
   * Dequantize the given quantized array, based on the given quantization
   * information, and write the result into the given output array, creating
   * the output array if it was undefined.
   *
   * This will simply fill the output array with
   * <code>output[i] = input[i] * stepSize + offset</code>
   * when interpreting the input and output as arrays of Cartesian2.
   *
   * @param {TypedArray} quantizedTypedArray The quantized array
   * @param {number} elementCount The number of elements
   * @param {Cartesian2} stepSize The quantization step size
   * @param {Cartesian2} offset The quantization offset
   * @param {TypedArray} [dequantizedTypedArray] The result
   * @returns {TypedArray} The result
   */
  static dequantize2D(
    quantizedTypedArray,
    elementCount,
    stepSize,
    offset,
    dequantizedTypedArray,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("quantizedTypedArray", quantizedTypedArray);
    Check.typeOf.number.greaterThanOrEquals("elementCount", elementCount, 0);
    Check.defined("stepSize", stepSize);
    Check.defined("offset", offset);
    //>>includeEnd('debug');

    if (!defined(dequantizedTypedArray)) {
      dequantizedTypedArray = new Float32Array(quantizedTypedArray.length);
    }
    const c = new Cartesian2();
    for (let i = 0; i < elementCount; i++) {
      Cartesian2.unpack(quantizedTypedArray, i * 2, c);
      Cartesian2.multiplyComponents(c, stepSize, c);
      Cartesian2.add(c, offset, c);
      Cartesian2.pack(c, dequantizedTypedArray, i * 2);
    }
    return dequantizedTypedArray;
  }

  /**
   * Dequantize the given quantized array, based on the given quantization
   * information, and write the result into the given output array, creating
   * the output array if it was undefined.
   *
   * This will simply fill the output array with
   * <code>output[i] = input[i] * stepSize + offset</code>
   * when interpreting the input and output as arrays of Cartesian3.
   *
   * @param {TypedArray} quantizedTypedArray The quantized array
   * @param {number} elementCount The number of elements
   * @param {Cartesian3} stepSize The quantization step size
   * @param {Cartesian3} offset The quantization offset
   * @param {TypedArray} [dequantizedTypedArray] The result
   * @returns {TypedArray} The result
   */
  static dequantize3D(
    quantizedTypedArray,
    elementCount,
    stepSize,
    offset,
    dequantizedTypedArray,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("quantizedTypedArray", quantizedTypedArray);
    Check.typeOf.number.greaterThanOrEquals("elementCount", elementCount, 0);
    Check.defined("stepSize", stepSize);
    Check.defined("offset", offset);
    //>>includeEnd('debug');

    if (!defined(dequantizedTypedArray)) {
      dequantizedTypedArray = new Float32Array(quantizedTypedArray.length);
    }
    const c = new Cartesian3();
    for (let i = 0; i < elementCount; i++) {
      Cartesian3.unpack(quantizedTypedArray, i * 3, c);
      Cartesian3.multiplyComponents(c, stepSize, c);
      Cartesian3.add(c, offset, c);
      Cartesian3.pack(c, dequantizedTypedArray, i * 3);
    }
    return dequantizedTypedArray;
  }

  /**
   * Dequantize the given quantized array, based on the given quantization
   * information, and write the result into the given output array, creating
   * the output array if it was undefined.
   *
   * This will simply fill the output array with
   * <code>output[i] = input[i] * stepSize + offset</code>
   * when interpreting the input and output as arrays of Cartesian4.
   *
   * @param {TypedArray} quantizedTypedArray The quantized array
   * @param {number} elementCount The number of elements
   * @param {Cartesian4} stepSize The quantization step size
   * @param {Cartesian4} offset The quantization offset
   * @param {TypedArray} [dequantizedTypedArray] The result
   * @returns {TypedArray} The result
   */
  static dequantize4D(
    quantizedTypedArray,
    elementCount,
    stepSize,
    offset,
    dequantizedTypedArray,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("quantizedTypedArray", quantizedTypedArray);
    Check.typeOf.number.greaterThanOrEquals("elementCount", elementCount, 0);
    Check.defined("stepSize", stepSize);
    Check.defined("offset", offset);
    //>>includeEnd('debug');

    if (!defined(dequantizedTypedArray)) {
      dequantizedTypedArray = new Float32Array(quantizedTypedArray.length);
    }
    const c = new Cartesian4();
    for (let i = 0; i < elementCount; i++) {
      Cartesian4.unpack(quantizedTypedArray, i * 4, c);
      Cartesian4.multiplyComponents(c, stepSize, c);
      Cartesian4.add(c, offset, c);
      Cartesian4.pack(c, dequantizedTypedArray, i * 4);
    }
    return dequantizedTypedArray;
  }

  /**
   * Reads and returns a value with the given type
   * at the given byte offset from the data view, in little-endian
   * order
   * @callback ComponentsReaderCallback
   * @param {DataView} dataView Typed data view into a binary buffer
   * @param {number} byteOffset The offset, in bytes, from the start of the view to read the data from
   * @param {number} numberOfComponents The number of components to read
   * @param {number[]} result The array in which to read the result
   */

  /**
   * Creates a function that reads the specified number of components with
   * the given type from the given data view, in little-endian
   * order, and writes them into a given result array.
   *
   * @param {ComponentDatatype} componentType The component type
   * @returns {ComponentsReaderCallback} The reader
   */
  static createComponentsReader(componentType) {
    const componentReader = ModelReader.createComponentReader(componentType);
    const sizeInBytes = ComponentDatatype.getSizeInBytes(componentType);
    return function (dataView, byteOffset, numberOfComponents, result) {
      let offset = byteOffset;
      for (let i = 0; i < numberOfComponents; ++i) {
        result[i] = componentReader(dataView, offset);
        offset += sizeInBytes;
      }
    };
  }

  /**
   * Reads and returns a value with the given type
   * at the given byte offset from the data view, in little-endian
   * order
   * @callback ComponentReaderCallback
   * @param {DataView} dataView Typed data view into a binary buffer
   * @param {number} byteOffset The offset, in bytes, from the start of the view to read the data from
   * @returns {number|BigInt} The value read from the dataView
   */

  /**
   * Creates a function that reads and returns a value with the given type
   * at the given byte offset from the data view, in little-endian
   * order
   * @param {ComponentDatatype} componentType The component type
   * @returns {ComponentReaderCallback} The reader
   */
  static createComponentReader(componentType) {
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
   * Transform the elements of the given array with the given 4x4 matrix,
   * interpreting each 3 consecutive elements as a 3D point, and write
   * the result into the given result array, creating the result array
   * if it was undefined.
   *
   * @param {TypedArray} input The input array
   * @param {Matrix4} matrix The matrix
   * @param {TypedArray} [result] The result
   * @returns {TypedArray} The result
   */
  static transform3D(input, matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("input", input);
    Check.defined("matrix", matrix);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Float32Array(input.length);
    }
    const c = new Cartesian3();
    const elementCount = input.length / 3;
    for (let i = 0; i < elementCount; i++) {
      Cartesian3.unpack(input, i * 3, c);
      Matrix4.multiplyByPoint(matrix, c, c);
      Cartesian3.pack(c, result, i * 3);
    }
    return result;
  }

  /**
   * Read the indices values from the given primitive indices, and
   * return them as a typed array.
   *
   * If the given object already has a <code>typedArray/code> property, then it
   * is assumed that this contains the proper indices, and they are returned.
   *
   * Otherwise, this reads the data from the <code>buffer</code> of the given
   * primitive indices object, into a typed array with a type that matches the
   * <code>indexDataType</code>, and returns it.
   *
   * Clients may not modify the returned typed array.
   *
   * @param {ModelComponents.Indices} primitiveIndices The primitive indices
   * @returns {TypedArray} The indices values
   * @throws {DeveloperError} If the <code>indexDataType</code> of the given
   * object is neither <code>UNSIGNED_BYTE</code>, nor <code>UNSIGNED_SHORT</code>,
   * nor <code>UNSIGNED_INT</code>
   */
  static readIndicesAsTypedArray(primitiveIndices) {
    const existingIndices = primitiveIndices.typedArray;
    if (defined(existingIndices)) {
      return existingIndices;
    }
    const indicesBuffer = primitiveIndices.buffer;
    const indicesCount = primitiveIndices.count;
    const indexDatatype = primitiveIndices.indexDatatype;
    const indices = ModelReader.createIndexTypedArray(
      indexDatatype,
      indicesCount,
    );
    indicesBuffer.getBufferData(indices);
    return indices;
  }

  /**
   * Read the indices values from the given primitive indices object, and return
   * them as a typed array of triangle vertex indices.
   *
   * If the given primitive type is <code>TRIANGLES</code>, then the indices
   * values will be read from the given object, and returned.
   *
   * If the primitive type is <code>TRIANGLE_STRIP</code> or <code>TRIANGLE_FAN</code>,
   * then the original indices values, will be read, converted into triangle indices
   * (i.e. their equivalent <code>TRIANGLES</code> representation), and the result
   * will be returned.
   *
   * The type of the returned array will match the <code>indexDataType</code>
   * of the given object.
   *
   * Clients may not modify the returned typed array.
   *
   * @param {ModelComponents.Indices} primitiveIndices The primitive indices
   * @returns {TypedArray} The indices, converted to triangle indices if necessary
   * @throws {DeveloperError} If the <code>indexDataType</code> of the given
   * object is neither <code>UNSIGNED_BYTE</code>, nor <code>UNSIGNED_SHORT</code>,
   * nor <code>UNSIGNED_INT</code>, or the given <code>primitiveType</code>
   * is neither <code>TRIANGLES</code>, nor <code>TRIANGLE_STRIP</code>,
   * nor <code>TRIANGLE_FAN</code>
   */
  static readIndicesAsTriangleIndicesTypedArray(
    primitiveIndices,
    primitiveType,
  ) {
    const originalIndices =
      ModelReader.readIndicesAsTypedArray(primitiveIndices);
    if (primitiveType === PrimitiveType.TRIANGLES) {
      return originalIndices;
    }
    if (primitiveType === PrimitiveType.TRIANGLE_STRIP) {
      const triangleIndices =
        ModelReader.convertTriangleStripToTriangleIndices(originalIndices);
      return triangleIndices;
    }
    if (primitiveType === PrimitiveType.TRIANGLE_FAN) {
      const triangleIndices =
        ModelReader.convertTriangleFanToTriangleIndices(originalIndices);
      return triangleIndices;
    }
    throw new DeveloperError(
      `The primitiveType must be TRIANGLES (${PrimitiveType.TRIANGLES}, ` +
        `TRIANGLE_STRIP (${PrimitiveType.TRIANGLE_STRIP}, or ` +
        `TRIANGLE_FAN (${PrimitiveType.TRIANGLE_FAN}, but is ${primitiveType}`,
    );
  }

  /**
   * Converts the given indices from a <code>TRIANGLE_STRIP</code> representation
   * into a <code>TRIANGLES</code> representation, and returns the result.
   *
   * The type of the result will be the same as the type of the input array.
   *
   * @param {TypedArray} indices The input indices
   * @returns {TypedArray} The resulting triangle indices
   */
  static convertTriangleStripToTriangleIndices(indices) {
    const triangleIndices = indices.constructor((indices.length - 2) * 3);
    for (let i = 0; i < indices.length - 2; i++) {
      if (i % 2 === 1) {
        triangleIndices[i * 3 + 0] = indices[i + 0];
        triangleIndices[i * 3 + 1] = indices[i + 2];
        triangleIndices[i * 3 + 2] = indices[i + 1];
      } else {
        triangleIndices[i * 3 + 0] = indices[i + 0];
        triangleIndices[i * 3 + 1] = indices[i + 1];
        triangleIndices[i * 3 + 2] = indices[i + 2];
      }
    }
    return triangleIndices;
  }

  /**
   * Converts the given indices from a <code>TRIANGLE_FAN</code> representation
   * into a <code>TRIANGLES</code> representation, and returns the result.
   *
   * The type of the result will be the same as the type of the input array.
   *
   * @param {TypedArray} indices The input indices
   * @returns {TypedArray} The resulting triangle indices
   */
  static convertTriangleFanToTriangleIndices(indices) {
    const triangleIndices = indices.constructor((indices.length - 2) * 3);
    for (let i = 0; i < indices.length - 2; i++) {
      triangleIndices[i * 3 + 0] = indices[i + 0];
      triangleIndices[i * 3 + 1] = indices[i + 1];
      triangleIndices[i * 3 + 2] = indices[i + 2];
    }
    return triangleIndices;
  }

  /**
   * Create a typed array with a type that matches the given index data type,
   * and the given size.
   *
   * @param {number} indexDatatype The <code>IndexDataType</code>
   * @param {number} size The size of the array that will be created
   * @returns {TypedArray} The typed array
   * @throws {DeveloperError} If the <code>indexDataType</code> is neither
   * <code>UNSIGNED_BYTE</code>, nor <code>UNSIGNED_SHORT</code>,
   * nor <code>UNSIGNED_INT</code>, or the size is negative.
   */
  static createIndexTypedArray(indexDatatype, size) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("size", size, 0);
    //>>includeEnd('debug');

    switch (indexDatatype) {
      case IndexDatatype.UNSIGNED_BYTE:
        return new Uint8Array(size);
      case IndexDatatype.UNSIGNED_SHORT:
        return new Uint16Array(size);
      case IndexDatatype.UNSIGNED_INT:
        return new Uint32Array(size);
    }
    throw new DeveloperError(
      `The indexDatatype must be UNSIGNED_BYTE (${IndexDatatype.UNSIGNED_BYTE}, ` +
        `UNSIGNED_SHORT (${IndexDatatype.UNSIGNED_SHORT}, or ` +
        `UNSIGNED_INT (${IndexDatatype.UNSIGNED_INT}, but is ${indexDatatype}`,
    );
  }
}

export default ModelReader;
