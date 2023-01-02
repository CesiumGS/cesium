import AttributeCompression from "./AttributeCompression.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";
import Matrix4 from "./Matrix4.js";
import TerrainExaggeration from "./TerrainExaggeration.js";
import TerrainQuantization from "./TerrainQuantization.js";

const cartesian3Scratch = new Cartesian3();
const cartesian3DimScratch = new Cartesian3();
const cartesian2Scratch = new Cartesian2();
const matrix4Scratch = new Matrix4();
const matrix4Scratch2 = new Matrix4();

const SHIFT_LEFT_12 = Math.pow(2.0, 12.0);

/**
 * Data used to quantize and pack the terrain mesh. The position can be unpacked for picking and all attributes
 * are unpacked in the vertex shader.
 *
 * @alias TerrainEncoding
 * @constructor
 *
 * @param {Cartesian3} [center] The center point of the vertices.
 * @param {AxisAlignedBoundingBox} [axisAlignedBoundingBox] The bounds of the tile in the east-north-up coordinates at the tiles center.
 * @param {Number} [minimumHeight] The minimum height.
 * @param {Number} [maximumHeight] The maximum height.
 * @param {Matrix4} [fromENU] The east-north-up to fixed frame matrix at the center of the terrain mesh.
 * @param {Boolean} [hasVertexNormals] If the mesh has vertex normals.
 * @param {Boolean} [hasWebMercatorT] true if the terrain data includes a Web Mercator texture coordinate; otherwise, false.
 * @param {Boolean} [hasGeodeticSurfaceNormals] true if the terrain data includes geodetic surface normals; otherwise, false.
 * @param {Number} [exaggeration] A scalar used to exaggerate terrain.
 * @param {Number} [exaggerationRelativeHeight] The relative height from which terrain is exaggerated.
 *
 * @private
 */
function TerrainEncoding(
  center,
  axisAlignedBoundingBox,
  minimumHeight,
  maximumHeight,
  fromENU,
  hasVertexNormals,
  hasWebMercatorT,
  hasGeodeticSurfaceNormals,
  exaggeration,
  exaggerationRelativeHeight
) {
  let quantization = TerrainQuantization.NONE;
  let toENU;
  let matrix;

  if (
    defined(axisAlignedBoundingBox) &&
    defined(minimumHeight) &&
    defined(maximumHeight) &&
    defined(fromENU)
  ) {
    const minimum = axisAlignedBoundingBox.minimum;
    const maximum = axisAlignedBoundingBox.maximum;

    const dimensions = Cartesian3.subtract(
      maximum,
      minimum,
      cartesian3DimScratch
    );
    const hDim = maximumHeight - minimumHeight;
    const maxDim = Math.max(Cartesian3.maximumComponent(dimensions), hDim);

    if (maxDim < SHIFT_LEFT_12 - 1.0) {
      quantization = TerrainQuantization.BITS12;
    } else {
      quantization = TerrainQuantization.NONE;
    }

    // Scale and bias from [0,1] to [ENU min, ENU max]
    // Also compute the inverse of the scale and bias
    let st = Matrix4.fromScale(dimensions, matrix4Scratch);
    st = Matrix4.setTranslation(st, minimum, st);

    let invSt = Matrix4.fromScale(
      Cartesian3.fromElements(
        1.0 / dimensions.x,
        1.0 / dimensions.y,
        1.0 / dimensions.z,
        cartesian3Scratch
      ),
      matrix4Scratch2
    );
    invSt = Matrix4.multiplyByTranslation(
      invSt,
      Cartesian3.negate(minimum, cartesian3Scratch),
      invSt
    );

    matrix = Matrix4.clone(fromENU, new Matrix4());
    let rtcOffset = Matrix4.getTranslation(fromENU, cartesian3Scratch);
    rtcOffset = Cartesian3.subtract(rtcOffset, center, cartesian3Scratch);
    matrix = Matrix4.setTranslation(matrix, rtcOffset, matrix);
    matrix = Matrix4.multiply(matrix, st, matrix);

    toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());
    toENU = Matrix4.multiply(invSt, toENU, toENU);

    fromENU = Matrix4.multiply(fromENU, st, new Matrix4());
  }

  /**
   * How the vertices of the mesh were compressed.
   * @type {TerrainQuantization}
   */
  this.quantization = quantization;

  /**
   * The minimum height of the tile including the skirts.
   * @type {Number}
   */
  this.minimumHeight = minimumHeight;

  /**
   * The maximum height of the tile.
   * @type {Number}
   */
  this.maximumHeight = maximumHeight;

  /**
   * The center of the tile.
   * @type {Cartesian3}
   */
  this.center = Cartesian3.clone(center);

  /**
   * A matrix that takes a vertex from the tile, transforms it to east-north-up at the center and scales
   * it so each component is in the [0, 1] range.
   * @type {Matrix4}
   */
  this.toScaledENU = toENU;

  /**
   * A matrix that restores a vertex transformed with toScaledENU back to the earth fixed reference frame
   * @type {Matrix4}
   */
  this.fromScaledENU = fromENU;

  /**
   * The matrix used to decompress the terrain vertices in the shader for RTE rendering.
   * @type {Matrix4}
   */
  this.matrix = matrix;

  /**
   * The terrain mesh contains normals.
   * @type {Boolean}
   */
  this.hasVertexNormals = hasVertexNormals;

  /**
   * The terrain mesh contains a vertical texture coordinate following the Web Mercator projection.
   * @type {Boolean}
   */
  this.hasWebMercatorT = defaultValue(hasWebMercatorT, false);

  /**
   * The terrain mesh contains geodetic surface normals, used for terrain exaggeration.
   * @type {Boolean}
   */
  this.hasGeodeticSurfaceNormals = defaultValue(
    hasGeodeticSurfaceNormals,
    false
  );

  /**
   * A scalar used to exaggerate terrain.
   * @type {Number}
   */
  this.exaggeration = defaultValue(exaggeration, 1.0);

  /**
   * The relative height from which terrain is exaggerated.
   */
  this.exaggerationRelativeHeight = defaultValue(
    exaggerationRelativeHeight,
    0.0
  );

  /**
   * The number of components in each vertex. This value can differ with different quantizations.
   * @type {Number}
   */
  this.stride = 0;

  this._offsetGeodeticSurfaceNormal = 0;
  this._offsetVertexNormal = 0;

  // Calculate the stride and offsets declared above
  this._calculateStrideAndOffsets();
}

/**
 * @param {Float32Array} vertexBuffer
 * @param {Number} bufferIndex
 * @param {Cartesian3} position
 * @param {Cartesian2} uv
 * @param {Number} height
 * @param {Cartesian2} [normalToPack]
 * @param {Number} [webMercatorT]
 * @param {Cartesian3} [geodeticSurfaceNormal]
 */
TerrainEncoding.prototype.encode = function (
  vertexBuffer,
  bufferIndex,
  position,
  uv,
  height,
  normalToPack,
  webMercatorT,
  geodeticSurfaceNormal
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("vertexBuffer", vertexBuffer);
  Check.typeOf.number("bufferIndex", bufferIndex);
  Check.typeOf.object("position", position);
  Check.typeOf.object("uv", uv);
  Check.typeOf.number("height", height);
  //>>includeEnd('debug');

  const u = uv.x;
  const v = uv.y;

  if (this.quantization === TerrainQuantization.BITS12) {
    position = Matrix4.multiplyByPoint(
      this.toScaledENU,
      position,
      cartesian3Scratch
    );

    position.x = CesiumMath.clamp(position.x, 0.0, 1.0);
    position.y = CesiumMath.clamp(position.y, 0.0, 1.0);
    position.z = CesiumMath.clamp(position.z, 0.0, 1.0);

    const hDim = this.maximumHeight - this.minimumHeight;
    const h = CesiumMath.clamp((height - this.minimumHeight) / hDim, 0.0, 1.0);

    Cartesian2.fromElements(position.x, position.y, cartesian2Scratch);
    const compressed0 = AttributeCompression.compressTextureCoordinates(
      cartesian2Scratch
    );

    Cartesian2.fromElements(position.z, h, cartesian2Scratch);
    const compressed1 = AttributeCompression.compressTextureCoordinates(
      cartesian2Scratch
    );

    Cartesian2.fromElements(u, v, cartesian2Scratch);
    const compressed2 = AttributeCompression.compressTextureCoordinates(
      cartesian2Scratch
    );

    vertexBuffer[bufferIndex++] = compressed0;
    vertexBuffer[bufferIndex++] = compressed1;
    vertexBuffer[bufferIndex++] = compressed2;

    if (this.hasWebMercatorT) {
      Cartesian2.fromElements(webMercatorT, 0.0, cartesian2Scratch);
      const compressed3 = AttributeCompression.compressTextureCoordinates(
        cartesian2Scratch
      );
      vertexBuffer[bufferIndex++] = compressed3;
    }
  } else {
    vertexBuffer[bufferIndex++] = position.x - this.center.x;
    vertexBuffer[bufferIndex++] = position.y - this.center.y;
    vertexBuffer[bufferIndex++] = position.z - this.center.z;
    vertexBuffer[bufferIndex++] = height;
    vertexBuffer[bufferIndex++] = u;
    vertexBuffer[bufferIndex++] = v;

    if (this.hasWebMercatorT) {
      vertexBuffer[bufferIndex++] = webMercatorT;
    }
  }

  if (this.hasVertexNormals) {
    vertexBuffer[bufferIndex++] = AttributeCompression.octPackFloat(
      normalToPack
    );
  }

  if (this.hasGeodeticSurfaceNormals) {
    vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.x;
    vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.y;
    vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.z;
  }

  return bufferIndex;
};

const scratchPosition = new Cartesian3();
const scratchGeodeticSurfaceNormal = new Cartesian3();

/**
 * @param {Float32Array} oldBuffer
 * @param {Float32Array} newBuffer
 * @param {Ellipsoid} ellipsoid
 */
TerrainEncoding.prototype.addGeodeticSurfaceNormals = function (
  oldBuffer,
  newBuffer,
  ellipsoid
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("oldBuffer", oldBuffer);
  Check.typeOf.object("newBuffer", newBuffer);
  Check.typeOf.object("ellipsoid", ellipsoid);
  //>>includeEnd('debug');

  if (this.hasGeodeticSurfaceNormals) {
    return;
  }

  const oldStride = this.stride;
  const vertexCount = oldBuffer.length / oldStride;
  this.hasGeodeticSurfaceNormals = true;
  this._calculateStrideAndOffsets();
  const newStride = this.stride;

  for (let index = 0; index < vertexCount; index++) {
    for (let offset = 0; offset < oldStride; offset++) {
      const oldIndex = index * oldStride + offset;
      const newIndex = index * newStride + offset;
      newBuffer[newIndex] = oldBuffer[oldIndex];
    }
    const position = this.decodePosition(newBuffer, index, scratchPosition);
    const geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
      position,
      scratchGeodeticSurfaceNormal
    );

    const bufferIndex = index * newStride + this._offsetGeodeticSurfaceNormal;
    newBuffer[bufferIndex] = geodeticSurfaceNormal.x;
    newBuffer[bufferIndex + 1] = geodeticSurfaceNormal.y;
    newBuffer[bufferIndex + 2] = geodeticSurfaceNormal.z;
  }
};

/**
 * @param {Float32Array} oldBuffer
 * @param {Float32Array} newBuffer
 */
TerrainEncoding.prototype.removeGeodeticSurfaceNormals = function (
  oldBuffer,
  newBuffer
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("oldBuffer", oldBuffer);
  Check.typeOf.object("newBuffer", newBuffer);
  //>>includeEnd('debug');

  if (!this.hasGeodeticSurfaceNormals) {
    return;
  }

  const oldStride = this.stride;
  const vertexCount = oldBuffer.length / oldStride;
  this.hasGeodeticSurfaceNormals = false;
  this._calculateStrideAndOffsets();
  const newStride = this.stride;

  for (let index = 0; index < vertexCount; index++) {
    for (let offset = 0; offset < newStride; offset++) {
      const oldIndex = index * oldStride + offset;
      const newIndex = index * newStride + offset;
      newBuffer[newIndex] = oldBuffer[oldIndex];
    }
  }
};

/**
 * @param {Float32Array} buffer
 * @param {Number} index
 * @param {Cartesian3} result
 * @returns {Cartesian3}
 */
TerrainEncoding.prototype.decodePosition = function (buffer, index, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("index", index);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    const xy = AttributeCompression.decompressTextureCoordinates(
      buffer[index],
      cartesian2Scratch
    );
    result.x = xy.x;
    result.y = xy.y;

    const zh = AttributeCompression.decompressTextureCoordinates(
      buffer[index + 1],
      cartesian2Scratch
    );
    result.z = zh.x;

    return Matrix4.multiplyByPoint(this.fromScaledENU, result, result);
  }

  result.x = buffer[index];
  result.y = buffer[index + 1];
  result.z = buffer[index + 2];
  return Cartesian3.add(result, this.center, result);
};

TerrainEncoding.prototype.getExaggeratedPosition = function (
  buffer,
  index,
  result
) {
  result = this.decodePosition(buffer, index, result);

  const exaggeration = this.exaggeration;
  const exaggerationRelativeHeight = this.exaggerationRelativeHeight;
  const hasExaggeration = exaggeration !== 1.0;
  if (hasExaggeration && this.hasGeodeticSurfaceNormals) {
    const geodeticSurfaceNormal = this.decodeGeodeticSurfaceNormal(
      buffer,
      index,
      scratchGeodeticSurfaceNormal
    );
    const rawHeight = this.decodeHeight(buffer, index);
    const heightDifference =
      TerrainExaggeration.getHeight(
        rawHeight,
        exaggeration,
        exaggerationRelativeHeight
      ) - rawHeight;

    // some math is unrolled for better performance
    result.x += geodeticSurfaceNormal.x * heightDifference;
    result.y += geodeticSurfaceNormal.y * heightDifference;
    result.z += geodeticSurfaceNormal.z * heightDifference;
  }

  return result;
};

/**
 * @param {Float32Array} buffer
 * @param {Number} index
 * @param {Cartesian2} result
 * @returns {Cartesian2}
 */
TerrainEncoding.prototype.decodeTextureCoordinates = function (
  buffer,
  index,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("index", index);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    return AttributeCompression.decompressTextureCoordinates(
      buffer[index + 2],
      result
    );
  }

  return Cartesian2.fromElements(buffer[index + 4], buffer[index + 5], result);
};

/**
 * @param {Float32Array} buffer
 * @param {Number} index
 * @returns {Number}
 */
TerrainEncoding.prototype.decodeHeight = function (buffer, index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    const zh = AttributeCompression.decompressTextureCoordinates(
      buffer[index + 1],
      cartesian2Scratch
    );
    return (
      zh.y * (this.maximumHeight - this.minimumHeight) + this.minimumHeight
    );
  }

  return buffer[index + 3];
};

/**
 * @param {Float32Array} buffer
 * @param {Number} index
 * @returns {Number}
 */
TerrainEncoding.prototype.decodeWebMercatorT = function (buffer, index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    return AttributeCompression.decompressTextureCoordinates(
      buffer[index + 3],
      cartesian2Scratch
    ).x;
  }

  return buffer[index + 6];
};

/**
 * @param {Float32Array} buffer
 * @param {Number} index
 * @param {Cartesian2} result
 * @returns {Cartesian2}
 */
TerrainEncoding.prototype.getOctEncodedNormal = function (
  buffer,
  index,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("index", index);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  index = index * this.stride + this._offsetVertexNormal;

  const temp = buffer[index] / 256.0;
  const x = Math.floor(temp);
  const y = (temp - x) * 256.0;

  return Cartesian2.fromElements(x, y, result);
};

/**
 * @param {Float32Array} buffer
 * @param {Number} index
 * @param {Cartesian3} result
 * @returns {Cartesian3}
 */
TerrainEncoding.prototype.decodeNormal = function (buffer, index, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("index", index);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const bufferIndex = (index = index * this.stride + this._offsetVertexNormal);
  return AttributeCompression.octDecodeFloat(buffer[bufferIndex], result);
};

/**
 * @param {Float32Array} buffer
 * @param {Number} index
 * @param {Cartesian3} result
 * @returns {Cartesian3}
 */
TerrainEncoding.prototype.decodeGeodeticSurfaceNormal = function (
  buffer,
  index,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  Check.typeOf.number("index", index);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  index = index * this.stride + this._offsetGeodeticSurfaceNormal;

  result.x = buffer[index];
  result.y = buffer[index + 1];
  result.z = buffer[index + 2];
  return result;
};

TerrainEncoding.prototype._calculateStrideAndOffsets = function () {
  let vertexStride = 0;

  switch (this.quantization) {
    case TerrainQuantization.BITS12:
      vertexStride += 3;
      break;
    default:
      vertexStride += 6;
  }
  if (this.hasWebMercatorT) {
    vertexStride += 1;
  }
  if (this.hasVertexNormals) {
    this._offsetVertexNormal = vertexStride;
    vertexStride += 1;
  }
  if (this.hasGeodeticSurfaceNormals) {
    this._offsetGeodeticSurfaceNormal = vertexStride;
    vertexStride += 3;
  }

  this.stride = vertexStride;
};

const attributesIndicesNone = {
  position3DAndHeight: 0,
  textureCoordAndEncodedNormals: 1,
  geodeticSurfaceNormal: 2,
};
const attributesIndicesBits12 = {
  compressed0: 0,
  compressed1: 1,
  geodeticSurfaceNormal: 2,
};

/**
 * @param {Float32Array} buffer
 * @returns {Object[]}
 */
TerrainEncoding.prototype.getAttributes = function (buffer) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("buffer", buffer);
  //>>includeEnd('debug');

  const datatype = ComponentDatatype.FLOAT;
  const sizeInBytes = ComponentDatatype.getSizeInBytes(datatype);
  const strideInBytes = this.stride * sizeInBytes;
  let offsetInBytes = 0;

  const attributes = [];
  function addAttribute(index, componentsPerAttribute) {
    attributes.push({
      index: index,
      vertexBuffer: buffer,
      componentDatatype: datatype,
      componentsPerAttribute: componentsPerAttribute,
      offsetInBytes: offsetInBytes,
      strideInBytes: strideInBytes,
    });
    offsetInBytes += componentsPerAttribute * sizeInBytes;
  }

  if (this.quantization === TerrainQuantization.NONE) {
    addAttribute(attributesIndicesNone.position3DAndHeight, 4);

    let componentsTexCoordAndNormals = 2;
    componentsTexCoordAndNormals += this.hasWebMercatorT ? 1 : 0;
    componentsTexCoordAndNormals += this.hasVertexNormals ? 1 : 0;
    addAttribute(
      attributesIndicesNone.textureCoordAndEncodedNormals,
      componentsTexCoordAndNormals
    );

    if (this.hasGeodeticSurfaceNormals) {
      addAttribute(attributesIndicesNone.geodeticSurfaceNormal, 3);
    }
  } else {
    // When there is no webMercatorT or vertex normals, the attribute only needs 3 components: x/y, z/h, u/v.
    // WebMercatorT and vertex normals each take up one component, so if only one of them is present the first
    // attribute gets a 4th component. If both are present, we need an additional attribute that has 1 component.
    const usingAttribute0Component4 =
      this.hasWebMercatorT || this.hasVertexNormals;
    const usingAttribute1Component1 =
      this.hasWebMercatorT && this.hasVertexNormals;
    addAttribute(
      attributesIndicesBits12.compressed0,
      usingAttribute0Component4 ? 4 : 3
    );

    if (usingAttribute1Component1) {
      addAttribute(attributesIndicesBits12.compressed1, 1);
    }

    if (this.hasGeodeticSurfaceNormals) {
      addAttribute(attributesIndicesBits12.geodeticSurfaceNormal, 3);
    }
  }

  return attributes;
};

/**
 * @returns {Object}
 */
TerrainEncoding.prototype.getAttributeLocations = function () {
  if (this.quantization === TerrainQuantization.NONE) {
    return attributesIndicesNone;
  }
  return attributesIndicesBits12;
};

/**
 * @param {TerrainEncoding} encoding
 * @param {TerrainEncoding} [result]
 * @returns {Object|undefined}
 */
TerrainEncoding.clone = function (encoding, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("encoding", encoding);
  //>>includeEnd('debug');

  if (!defined(encoding)) {
    return undefined;
  }
  if (!defined(result)) {
    result = new TerrainEncoding();
  }

  result.quantization = encoding.quantization;
  result.minimumHeight = encoding.minimumHeight;
  result.maximumHeight = encoding.maximumHeight;
  result.center = Cartesian3.clone(encoding.center);
  result.toScaledENU = Matrix4.clone(encoding.toScaledENU);
  result.fromScaledENU = Matrix4.clone(encoding.fromScaledENU);
  result.matrix = Matrix4.clone(encoding.matrix);
  result.hasVertexNormals = encoding.hasVertexNormals;
  result.hasWebMercatorT = encoding.hasWebMercatorT;
  result.hasGeodeticSurfaceNormals = encoding.hasGeodeticSurfaceNormals;
  result.exaggeration = encoding.exaggeration;
  result.exaggerationRelativeHeight = encoding.exaggerationRelativeHeight;

  result._calculateStrideAndOffsets();

  return result;
};
export default TerrainEncoding;
