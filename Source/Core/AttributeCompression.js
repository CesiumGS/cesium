import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import ComponentDatatype from "./ComponentDatatype.js";
import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import AttributeType from "../Scene/AttributeType.js";

var RIGHT_SHIFT = 1.0 / 256.0;
var LEFT_SHIFT = 256.0;

/**
 * Attribute compression and decompression functions.
 *
 * @namespace AttributeCompression
 *
 * @private
 */
var AttributeCompression = {};

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
  Check.defined("vector", vector);
  Check.defined("result", result);
  var magSquared = Cartesian3.magnitudeSquared(vector);
  if (Math.abs(magSquared - 1.0) > CesiumMath.EPSILON6) {
    throw new DeveloperError("vector must be normalized.");
  }
  //>>includeEnd('debug');

  result.x =
    vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
  result.y =
    vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
  if (vector.z < 0) {
    var x = result.x;
    var y = result.y;
    result.x = (1.0 - Math.abs(y)) * CesiumMath.signNotZero(x);
    result.y = (1.0 - Math.abs(x)) * CesiumMath.signNotZero(y);
  }

  result.x = CesiumMath.toSNorm(result.x, rangeMax);
  result.y = CesiumMath.toSNorm(result.y, rangeMax);

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

var octEncodeScratch = new Cartesian2();
var uint8ForceArray = new Uint8Array(1);
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
  Check.defined("result", result);
  if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
    throw new DeveloperError(
      "x and y must be unsigned normalized integers between 0 and " + rangeMax
    );
  }
  //>>includeEnd('debug');

  result.x = CesiumMath.fromSNorm(x, rangeMax);
  result.y = CesiumMath.fromSNorm(y, rangeMax);
  result.z = 1.0 - (Math.abs(result.x) + Math.abs(result.y));

  if (result.z < 0.0) {
    var oldVX = result.x;
    result.x = (1.0 - Math.abs(result.y)) * CesiumMath.signNotZero(oldVX);
    result.y = (1.0 - Math.abs(oldVX)) * CesiumMath.signNotZero(result.y);
  }

  return Cartesian3.normalize(result, result);
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
  Check.typeOf.object("encoded", encoded);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');
  var x = encoded.x;
  var y = encoded.y;
  var z = encoded.z;
  var w = encoded.w;
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
    throw new DeveloperError(
      "x, y, z, and w must be unsigned normalized integers between 0 and 255"
    );
  }
  //>>includeEnd('debug');

  var xOct16 = x * LEFT_SHIFT + y;
  var yOct16 = z * LEFT_SHIFT + w;
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
  Check.defined("encoded", encoded);
  //>>includeEnd('debug');
  return 256.0 * encoded.x + encoded.y;
};

var scratchEncodeCart2 = new Cartesian2();

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
  Check.defined("value", value);
  //>>includeEnd('debug');

  var temp = value / 256.0;
  var x = Math.floor(temp);
  var y = (temp - x) * 256.0;

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
  Check.defined("v1", v1);
  Check.defined("v2", v2);
  Check.defined("v3", v3);
  Check.defined("result", result);
  //>>includeEnd('debug');

  var encoded1 = AttributeCompression.octEncodeFloat(v1);
  var encoded2 = AttributeCompression.octEncodeFloat(v2);

  var encoded3 = AttributeCompression.octEncode(v3, scratchEncodeCart2);
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
  Check.defined("packed", packed);
  Check.defined("v1", v1);
  Check.defined("v2", v2);
  Check.defined("v3", v3);
  //>>includeEnd('debug');

  var temp = packed.x / 65536.0;
  var x = Math.floor(temp);
  var encodedFloat1 = (temp - x) * 65536.0;

  temp = packed.y / 65536.0;
  var y = Math.floor(temp);
  var encodedFloat2 = (temp - y) * 65536.0;

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
  Check.defined("textureCoordinates", textureCoordinates);
  //>>includeEnd('debug');

  // Move x and y to the range 0-4095;
  var x = (textureCoordinates.x * 4095.0) | 0;
  var y = (textureCoordinates.y * 4095.0) | 0;
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
  Check.defined("compressed", compressed);
  Check.defined("result", result);
  //>>includeEnd('debug');

  var temp = compressed / 4096.0;
  var xZeroTo4095 = Math.floor(temp);
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
  Check.defined("uBuffer", uBuffer);
  Check.defined("vBuffer", vBuffer);
  Check.typeOf.number.equals(
    "uBuffer.length",
    "vBuffer.length",
    uBuffer.length,
    vBuffer.length
  );
  if (defined(heightBuffer)) {
    Check.typeOf.number.equals(
      "uBuffer.length",
      "heightBuffer.length",
      uBuffer.length,
      heightBuffer.length
    );
  }
  //>>includeEnd('debug');

  var count = uBuffer.length;

  var u = 0;
  var v = 0;
  var height = 0;

  for (var i = 0; i < count; ++i) {
    u += zigZagDecode(uBuffer[i]);
    v += zigZagDecode(vBuffer[i]);

    uBuffer[i] = u;
    vBuffer[i] = v;

    if (defined(heightBuffer)) {
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
  Check.defined("typedArray", typedArray);
  Check.defined("componentDatatype", componentDatatype);
  Check.defined("type", type);
  Check.defined("count", count);
  //>>includeEnd('debug');

  var componentsPerAttribute = AttributeType.getNumberOfComponents(type);

  var divisor;
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      divisor = 127.0;
      break;
    case ComponentDatatype.UNSIGNED_BYTE:
      divisor = 255.0;
      break;
    case ComponentDatatype.SHORT:
      divisor = 32767.0;
      break;
    case ComponentDatatype.UNSIGNED_SHORT:
      divisor = 65535.0;
      break;
    case ComponentDatatype.INT:
      divisor = 2147483647.0;
      break;
    case ComponentDatatype.UNSIGNED_INT:
      divisor = 4294967295.0;
      break;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(
        "Cannot dequantize component datatype: " + componentDatatype
      );
    //>>includeEnd('debug');
  }

  var dequantizedTypedArray = new Float32Array(count * componentsPerAttribute);

  for (var i = 0; i < count; i++) {
    for (var j = 0; j < componentsPerAttribute; j++) {
      var index = i * componentsPerAttribute + j;
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
  Check.defined("typedArray", typedArray);

  var expectedLength = typedArray.length * 3;
  if (defined(result)) {
    Check.typeOf.number.equals(
      "result.length",
      "typedArray.length * 3",
      result.length,
      expectedLength
    );
  }
  //>>includeEnd('debug');

  var count = typedArray.length;
  if (!defined(result)) {
    result = new Float32Array(count * 3);
  }

  var mask5 = (1 << 5) - 1;
  var mask6 = (1 << 6) - 1;
  var normalize5 = 1.0 / 31.0;
  var normalize6 = 1.0 / 63.0;
  for (var i = 0; i < count; i++) {
    var value = typedArray[i];
    var red = value >> 11;
    var green = (value >> 5) & mask6;
    var blue = value & mask5;

    var offset = 3 * i;
    result[offset] = red * normalize5;
    result[offset + 1] = green * normalize6;
    result[offset + 2] = blue * normalize5;
  }

  return result;
};

export default AttributeCompression;
