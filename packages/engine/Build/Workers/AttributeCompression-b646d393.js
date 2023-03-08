define(['exports', './Matrix2-13178034', './Matrix3-315394f6', './ComponentDatatype-f7b11d02', './Check-666ab1a0', './defaultValue-0a909f67', './Math-2dbd6b93'], (function (exports, Matrix2, Matrix3, ComponentDatatype, Check, defaultValue, Math$1) { 'use strict';

  /**
   * An enum describing the attribute type for glTF and 3D Tiles.
   *
   * @enum {String}
   *
   * @private
   */
  const AttributeType = {
    /**
     * The attribute is a single component.
     *
     * @type {String}
     * @constant
     */
    SCALAR: "SCALAR",

    /**
     * The attribute is a two-component vector.
     *
     * @type {String}
     * @constant
     */
    VEC2: "VEC2",

    /**
     * The attribute is a three-component vector.
     *
     * @type {String}
     * @constant
     */
    VEC3: "VEC3",

    /**
     * The attribute is a four-component vector.
     *
     * @type {String}
     * @constant
     */
    VEC4: "VEC4",

    /**
     * The attribute is a 2x2 matrix.
     *
     * @type {String}
     * @constant
     */
    MAT2: "MAT2",

    /**
     * The attribute is a 3x3 matrix.
     *
     * @type {String}
     * @constant
     */
    MAT3: "MAT3",

    /**
     * The attribute is a 4x4 matrix.
     *
     * @type {String}
     * @constant
     */
    MAT4: "MAT4",
  };

  /**
   * Gets the scalar, vector, or matrix type for the attribute type.
   *
   * @param {AttributeType} attributeType The attribute type.
   * @returns {*} The math type.
   *
   * @private
   */
  AttributeType.getMathType = function (attributeType) {
    switch (attributeType) {
      case AttributeType.SCALAR:
        return Number;
      case AttributeType.VEC2:
        return Matrix2.Cartesian2;
      case AttributeType.VEC3:
        return Matrix3.Cartesian3;
      case AttributeType.VEC4:
        return Matrix2.Cartesian4;
      case AttributeType.MAT2:
        return Matrix2.Matrix2;
      case AttributeType.MAT3:
        return Matrix3.Matrix3;
      case AttributeType.MAT4:
        return Matrix2.Matrix4;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new Check.DeveloperError("attributeType is not a valid value.");
      //>>includeEnd('debug');
    }
  };

  /**
   * Gets the number of components per attribute.
   *
   * @param {AttributeType} attributeType The attribute type.
   * @returns {Number} The number of components.
   *
   * @private
   */
  AttributeType.getNumberOfComponents = function (attributeType) {
    switch (attributeType) {
      case AttributeType.SCALAR:
        return 1;
      case AttributeType.VEC2:
        return 2;
      case AttributeType.VEC3:
        return 3;
      case AttributeType.VEC4:
      case AttributeType.MAT2:
        return 4;
      case AttributeType.MAT3:
        return 9;
      case AttributeType.MAT4:
        return 16;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new Check.DeveloperError("attributeType is not a valid value.");
      //>>includeEnd('debug');
    }
  };

  /**
   * Get the number of attribute locations needed to fit this attribute. Most
   * types require one, but matrices require multiple attribute locations.
   *
   * @param {AttributeType} attributeType The attribute type.
   * @returns {Number} The number of attribute locations needed in the shader
   *
   * @private
   */
  AttributeType.getAttributeLocationCount = function (attributeType) {
    switch (attributeType) {
      case AttributeType.SCALAR:
      case AttributeType.VEC2:
      case AttributeType.VEC3:
      case AttributeType.VEC4:
        return 1;
      case AttributeType.MAT2:
        return 2;
      case AttributeType.MAT3:
        return 3;
      case AttributeType.MAT4:
        return 4;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new Check.DeveloperError("attributeType is not a valid value.");
      //>>includeEnd('debug');
    }
  };

  /**
   * Gets the GLSL type for the attribute type.
   *
   * @param {AttributeType} attributeType The attribute type.
   * @returns {String} The GLSL type for the attribute type.
   *
   * @private
   */
  AttributeType.getGlslType = function (attributeType) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.string("attributeType", attributeType);
    //>>includeEnd('debug');

    switch (attributeType) {
      case AttributeType.SCALAR:
        return "float";
      case AttributeType.VEC2:
        return "vec2";
      case AttributeType.VEC3:
        return "vec3";
      case AttributeType.VEC4:
        return "vec4";
      case AttributeType.MAT2:
        return "mat2";
      case AttributeType.MAT3:
        return "mat3";
      case AttributeType.MAT4:
        return "mat4";
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new Check.DeveloperError("attributeType is not a valid value.");
      //>>includeEnd('debug');
    }
  };

  var AttributeType$1 = Object.freeze(AttributeType);

  const RIGHT_SHIFT = 1.0 / 256.0;
  const LEFT_SHIFT = 256.0;

  /**
   * Attribute compression and decompression functions.
   *
   * @namespace AttributeCompression
   *
   * @private
   */
  const AttributeCompression = {};

  /**
   * Encodes a normalized vector into 2 SNORM values in the range of [0-rangeMax] following the 'oct' encoding.
   *
   * Oct encoding is a compact representation of unit length vectors.
   * The 'oct' encoding is described in "A Survey of Efficient Representations of Independent Unit Vectors",
   * Cigolle et al 2014: {@link http://jcgt.org/published/0003/02/01/}
   *
   * @param {Cartesian3} vector The normalized vector to be compressed into 2 component 'oct' encoding.
   * @param {Cartesian2} result The 2 component oct-encoded unit length vector.
   * @param {Number} rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
   * @returns {Cartesian2} The 2 component oct-encoded unit length vector.
   *
   * @exception {DeveloperError} vector must be normalized.
   *
   * @see AttributeCompression.octDecodeInRange
   */
  AttributeCompression.octEncodeInRange = function (vector, rangeMax, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("vector", vector);
    Check.Check.defined("result", result);
    const magSquared = Matrix3.Cartesian3.magnitudeSquared(vector);
    if (Math.abs(magSquared - 1.0) > Math$1.CesiumMath.EPSILON6) {
      throw new Check.DeveloperError("vector must be normalized.");
    }
    //>>includeEnd('debug');

    result.x =
      vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
    result.y =
      vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
    if (vector.z < 0) {
      const x = result.x;
      const y = result.y;
      result.x = (1.0 - Math.abs(y)) * Math$1.CesiumMath.signNotZero(x);
      result.y = (1.0 - Math.abs(x)) * Math$1.CesiumMath.signNotZero(y);
    }

    result.x = Math$1.CesiumMath.toSNorm(result.x, rangeMax);
    result.y = Math$1.CesiumMath.toSNorm(result.y, rangeMax);

    return result;
  };

  /**
   * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding.
   *
   * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
   * @param {Cartesian2} result The 2 byte oct-encoded unit length vector.
   * @returns {Cartesian2} The 2 byte oct-encoded unit length vector.
   *
   * @exception {DeveloperError} vector must be normalized.
   *
   * @see AttributeCompression.octEncodeInRange
   * @see AttributeCompression.octDecode
   */
  AttributeCompression.octEncode = function (vector, result) {
    return AttributeCompression.octEncodeInRange(vector, 255, result);
  };

  const octEncodeScratch = new Matrix2.Cartesian2();
  const uint8ForceArray = new Uint8Array(1);
  function forceUint8(value) {
    uint8ForceArray[0] = value;
    return uint8ForceArray[0];
  }
  /**
   * @param {Cartesian3} vector The normalized vector to be compressed into 4 byte 'oct' encoding.
   * @param {Cartesian4} result The 4 byte oct-encoded unit length vector.
   * @returns {Cartesian4} The 4 byte oct-encoded unit length vector.
   *
   * @exception {DeveloperError} vector must be normalized.
   *
   * @see AttributeCompression.octEncodeInRange
   * @see AttributeCompression.octDecodeFromCartesian4
   */
  AttributeCompression.octEncodeToCartesian4 = function (vector, result) {
    AttributeCompression.octEncodeInRange(vector, 65535, octEncodeScratch);
    result.x = forceUint8(octEncodeScratch.x * RIGHT_SHIFT);
    result.y = forceUint8(octEncodeScratch.x);
    result.z = forceUint8(octEncodeScratch.y * RIGHT_SHIFT);
    result.w = forceUint8(octEncodeScratch.y);
    return result;
  };

  /**
   * Decodes a unit-length vector in 'oct' encoding to a normalized 3-component vector.
   *
   * @param {Number} x The x component of the oct-encoded unit length vector.
   * @param {Number} y The y component of the oct-encoded unit length vector.
   * @param {Number} rangeMax The maximum value of the SNORM range. The encoded vector is stored in log2(rangeMax+1) bits.
   * @param {Cartesian3} result The decoded and normalized vector
   * @returns {Cartesian3} The decoded and normalized vector.
   *
   * @exception {DeveloperError} x and y must be unsigned normalized integers between 0 and rangeMax.
   *
   * @see AttributeCompression.octEncodeInRange
   */
  AttributeCompression.octDecodeInRange = function (x, y, rangeMax, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("result", result);
    if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
      throw new Check.DeveloperError(
        `x and y must be unsigned normalized integers between 0 and ${rangeMax}`
      );
    }
    //>>includeEnd('debug');

    result.x = Math$1.CesiumMath.fromSNorm(x, rangeMax);
    result.y = Math$1.CesiumMath.fromSNorm(y, rangeMax);
    result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));

    if (result.z < 0.0) {
      const oldVX = result.x;
      result.x = (1.0 - Math.abs(result.y)) * Math$1.CesiumMath.signNotZero(oldVX);
      result.y = (1.0 - Math.abs(oldVX)) * Math$1.CesiumMath.signNotZero(result.y);
    }

    return Matrix3.Cartesian3.normalize(result, result);
  };

  /**
   * Decodes a unit-length vector in 2 byte 'oct' encoding to a normalized 3-component vector.
   *
   * @param {Number} x The x component of the oct-encoded unit length vector.
   * @param {Number} y The y component of the oct-encoded unit length vector.
   * @param {Cartesian3} result The decoded and normalized vector.
   * @returns {Cartesian3} The decoded and normalized vector.
   *
   * @exception {DeveloperError} x and y must be an unsigned normalized integer between 0 and 255.
   *
   * @see AttributeCompression.octDecodeInRange
   */
  AttributeCompression.octDecode = function (x, y, result) {
    return AttributeCompression.octDecodeInRange(x, y, 255, result);
  };

  /**
   * Decodes a unit-length vector in 4 byte 'oct' encoding to a normalized 3-component vector.
   *
   * @param {Cartesian4} encoded The oct-encoded unit length vector.
   * @param {Cartesian3} result The decoded and normalized vector.
   * @returns {Cartesian3} The decoded and normalized vector.
   *
   * @exception {DeveloperError} x, y, z, and w must be unsigned normalized integers between 0 and 255.
   *
   * @see AttributeCompression.octDecodeInRange
   * @see AttributeCompression.octEncodeToCartesian4
   */
  AttributeCompression.octDecodeFromCartesian4 = function (encoded, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("encoded", encoded);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');
    const x = encoded.x;
    const y = encoded.y;
    const z = encoded.z;
    const w = encoded.w;
    //>>includeStart('debug', pragmas.debug);
    if (
      x < 0 ||
      x > 255 ||
      y < 0 ||
      y > 255 ||
      z < 0 ||
      z > 255 ||
      w < 0 ||
      w > 255
    ) {
      throw new Check.DeveloperError(
        "x, y, z, and w must be unsigned normalized integers between 0 and 255"
      );
    }
    //>>includeEnd('debug');

    const xOct16 = x * LEFT_SHIFT + y;
    const yOct16 = z * LEFT_SHIFT + w;
    return AttributeCompression.octDecodeInRange(xOct16, yOct16, 65535, result);
  };

  /**
   * Packs an oct encoded vector into a single floating-point number.
   *
   * @param {Cartesian2} encoded The oct encoded vector.
   * @returns {Number} The oct encoded vector packed into a single float.
   *
   */
  AttributeCompression.octPackFloat = function (encoded) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("encoded", encoded);
    //>>includeEnd('debug');
    return 256.0 * encoded.x + encoded.y;
  };

  const scratchEncodeCart2 = new Matrix2.Cartesian2();

  /**
   * Encodes a normalized vector into 2 SNORM values in the range of [0-255] following the 'oct' encoding and
   * stores those values in a single float-point number.
   *
   * @param {Cartesian3} vector The normalized vector to be compressed into 2 byte 'oct' encoding.
   * @returns {Number} The 2 byte oct-encoded unit length vector.
   *
   * @exception {DeveloperError} vector must be normalized.
   */
  AttributeCompression.octEncodeFloat = function (vector) {
    AttributeCompression.octEncode(vector, scratchEncodeCart2);
    return AttributeCompression.octPackFloat(scratchEncodeCart2);
  };

  /**
   * Decodes a unit-length vector in 'oct' encoding packed in a floating-point number to a normalized 3-component vector.
   *
   * @param {Number} value The oct-encoded unit length vector stored as a single floating-point number.
   * @param {Cartesian3} result The decoded and normalized vector
   * @returns {Cartesian3} The decoded and normalized vector.
   *
   */
  AttributeCompression.octDecodeFloat = function (value, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("value", value);
    //>>includeEnd('debug');

    const temp = value / 256.0;
    const x = Math.floor(temp);
    const y = (temp - x) * 256.0;

    return AttributeCompression.octDecode(x, y, result);
  };

  /**
   * Encodes three normalized vectors into 6 SNORM values in the range of [0-255] following the 'oct' encoding and
   * packs those into two floating-point numbers.
   *
   * @param {Cartesian3} v1 A normalized vector to be compressed.
   * @param {Cartesian3} v2 A normalized vector to be compressed.
   * @param {Cartesian3} v3 A normalized vector to be compressed.
   * @param {Cartesian2} result The 'oct' encoded vectors packed into two floating-point numbers.
   * @returns {Cartesian2} The 'oct' encoded vectors packed into two floating-point numbers.
   *
   */
  AttributeCompression.octPack = function (v1, v2, v3, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("v1", v1);
    Check.Check.defined("v2", v2);
    Check.Check.defined("v3", v3);
    Check.Check.defined("result", result);
    //>>includeEnd('debug');

    const encoded1 = AttributeCompression.octEncodeFloat(v1);
    const encoded2 = AttributeCompression.octEncodeFloat(v2);

    const encoded3 = AttributeCompression.octEncode(v3, scratchEncodeCart2);
    result.x = 65536.0 * encoded3.x + encoded1;
    result.y = 65536.0 * encoded3.y + encoded2;
    return result;
  };

  /**
   * Decodes three unit-length vectors in 'oct' encoding packed into a floating-point number to a normalized 3-component vector.
   *
   * @param {Cartesian2} packed The three oct-encoded unit length vectors stored as two floating-point number.
   * @param {Cartesian3} v1 One decoded and normalized vector.
   * @param {Cartesian3} v2 One decoded and normalized vector.
   * @param {Cartesian3} v3 One decoded and normalized vector.
   */
  AttributeCompression.octUnpack = function (packed, v1, v2, v3) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("packed", packed);
    Check.Check.defined("v1", v1);
    Check.Check.defined("v2", v2);
    Check.Check.defined("v3", v3);
    //>>includeEnd('debug');

    let temp = packed.x / 65536.0;
    const x = Math.floor(temp);
    const encodedFloat1 = (temp - x) * 65536.0;

    temp = packed.y / 65536.0;
    const y = Math.floor(temp);
    const encodedFloat2 = (temp - y) * 65536.0;

    AttributeCompression.octDecodeFloat(encodedFloat1, v1);
    AttributeCompression.octDecodeFloat(encodedFloat2, v2);
    AttributeCompression.octDecode(x, y, v3);
  };

  /**
   * Pack texture coordinates into a single float. The texture coordinates will only preserve 12 bits of precision.
   *
   * @param {Cartesian2} textureCoordinates The texture coordinates to compress.  Both coordinates must be in the range 0.0-1.0.
   * @returns {Number} The packed texture coordinates.
   *
   */
  AttributeCompression.compressTextureCoordinates = function (
    textureCoordinates
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("textureCoordinates", textureCoordinates);
    //>>includeEnd('debug');

    // Move x and y to the range 0-4095;
    const x = (textureCoordinates.x * 4095.0) | 0;
    const y = (textureCoordinates.y * 4095.0) | 0;
    return 4096.0 * x + y;
  };

  /**
   * Decompresses texture coordinates that were packed into a single float.
   *
   * @param {Number} compressed The compressed texture coordinates.
   * @param {Cartesian2} result The decompressed texture coordinates.
   * @returns {Cartesian2} The modified result parameter.
   *
   */
  AttributeCompression.decompressTextureCoordinates = function (
    compressed,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("compressed", compressed);
    Check.Check.defined("result", result);
    //>>includeEnd('debug');

    const temp = compressed / 4096.0;
    const xZeroTo4095 = Math.floor(temp);
    result.x = xZeroTo4095 / 4095.0;
    result.y = (compressed - xZeroTo4095 * 4096) / 4095;
    return result;
  };

  function zigZagDecode(value) {
    return (value >> 1) ^ -(value & 1);
  }

  /**
   * Decodes delta and ZigZag encoded vertices. This modifies the buffers in place.
   *
   * @param {Uint16Array} uBuffer The buffer view of u values.
   * @param {Uint16Array} vBuffer The buffer view of v values.
   * @param {Uint16Array} [heightBuffer] The buffer view of height values.
   *
   * @see {@link https://github.com/CesiumGS/quantized-mesh|quantized-mesh-1.0 terrain format}
   */
  AttributeCompression.zigZagDeltaDecode = function (
    uBuffer,
    vBuffer,
    heightBuffer
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("uBuffer", uBuffer);
    Check.Check.defined("vBuffer", vBuffer);
    Check.Check.typeOf.number.equals(
      "uBuffer.length",
      "vBuffer.length",
      uBuffer.length,
      vBuffer.length
    );
    if (defaultValue.defined(heightBuffer)) {
      Check.Check.typeOf.number.equals(
        "uBuffer.length",
        "heightBuffer.length",
        uBuffer.length,
        heightBuffer.length
      );
    }
    //>>includeEnd('debug');

    const count = uBuffer.length;

    let u = 0;
    let v = 0;
    let height = 0;

    for (let i = 0; i < count; ++i) {
      u += zigZagDecode(uBuffer[i]);
      v += zigZagDecode(vBuffer[i]);

      uBuffer[i] = u;
      vBuffer[i] = v;

      if (defaultValue.defined(heightBuffer)) {
        height += zigZagDecode(heightBuffer[i]);
        heightBuffer[i] = height;
      }
    }
  };

  /**
   * Dequantizes a quantized typed array into a floating point typed array.
   *
   * @see {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization#encoding-quantized-data}
   *
   * @param {Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array} typedArray The typed array for the quantized data.
   * @param {ComponentDatatype} componentDatatype The component datatype of the quantized data.
   * @param {AttributeType} type The attribute type of the quantized data.
   * @param {Number} count The number of attributes referenced in the dequantized array.
   *
   * @returns {Float32Array} The dequantized array.
   */
  AttributeCompression.dequantize = function (
    typedArray,
    componentDatatype,
    type,
    count
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("typedArray", typedArray);
    Check.Check.defined("componentDatatype", componentDatatype);
    Check.Check.defined("type", type);
    Check.Check.defined("count", count);
    //>>includeEnd('debug');

    const componentsPerAttribute = AttributeType$1.getNumberOfComponents(type);

    let divisor;
    switch (componentDatatype) {
      case ComponentDatatype.ComponentDatatype.BYTE:
        divisor = 127.0;
        break;
      case ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE:
        divisor = 255.0;
        break;
      case ComponentDatatype.ComponentDatatype.SHORT:
        divisor = 32767.0;
        break;
      case ComponentDatatype.ComponentDatatype.UNSIGNED_SHORT:
        divisor = 65535.0;
        break;
      case ComponentDatatype.ComponentDatatype.INT:
        divisor = 2147483647.0;
        break;
      case ComponentDatatype.ComponentDatatype.UNSIGNED_INT:
        divisor = 4294967295.0;
        break;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new Check.DeveloperError(
          `Cannot dequantize component datatype: ${componentDatatype}`
        );
      //>>includeEnd('debug');
    }

    const dequantizedTypedArray = new Float32Array(
      count * componentsPerAttribute
    );

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < componentsPerAttribute; j++) {
        const index = i * componentsPerAttribute + j;
        dequantizedTypedArray[index] = Math.max(
          typedArray[index] / divisor,
          -1.0
        );
      }
    }

    return dequantizedTypedArray;
  };

  /**
   * Decode RGB565-encoded colors into a floating point typed array containing
   * normalized RGB values.
   *
   * @param {Uint16Array} typedArray Array of RGB565 values
   * @param {Float32Array} [result] Array to store the normalized VEC3 result
   */
  AttributeCompression.decodeRGB565 = function (typedArray, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("typedArray", typedArray);

    const expectedLength = typedArray.length * 3;
    if (defaultValue.defined(result)) {
      Check.Check.typeOf.number.equals(
        "result.length",
        "typedArray.length * 3",
        result.length,
        expectedLength
      );
    }
    //>>includeEnd('debug');

    const count = typedArray.length;
    if (!defaultValue.defined(result)) {
      result = new Float32Array(count * 3);
    }

    const mask5 = (1 << 5) - 1;
    const mask6 = (1 << 6) - 1;
    const normalize5 = 1.0 / 31.0;
    const normalize6 = 1.0 / 63.0;
    for (let i = 0; i < count; i++) {
      const value = typedArray[i];
      const red = value >> 11;
      const green = (value >> 5) & mask6;
      const blue = value & mask5;

      const offset = 3 * i;
      result[offset] = red * normalize5;
      result[offset + 1] = green * normalize6;
      result[offset + 2] = blue * normalize5;
    }

    return result;
  };

  var AttributeCompression$1 = AttributeCompression;

  exports.AttributeCompression = AttributeCompression$1;

}));
