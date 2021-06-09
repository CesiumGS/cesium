import AttributeCompression from "./AttributeCompression.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";
import Matrix4 from "./Matrix4.js";
import TerrainExaggeration from "./TerrainExaggeration.js";
import TerrainQuantization from "./TerrainQuantization.js";

var cartesian3Scratch = new Cartesian3();
var cartesian3DimScratch = new Cartesian3();
var cartesian2Scratch = new Cartesian2();
var matrix4Scratch = new Matrix4();
var matrix4Scratch2 = new Matrix4();

var SHIFT_LEFT_12 = Math.pow(2.0, 12.0);

/**
 * Data used to quantize and pack the terrain mesh. The position can be unpacked for picking and all attributes
 * are unpacked in the vertex shader.
 *
 * @alias TerrainEncoding
 * @constructor
 *
 * @param {Cartesian3} center The center point of the vertices.
 * @param {AxisAlignedBoundingBox} axisAlignedBoundingBox The bounds of the tile in the east-north-up coordinates at the tiles center.
 * @param {Number} minimumHeight The minimum height.
 * @param {Number} maximumHeight The maximum height.
 * @param {Matrix4} fromENU The east-north-up to fixed frame matrix at the center of the terrain mesh.
 * @param {Boolean} hasVertexNormals If the mesh has vertex normals.
 * @param {Boolean} [hasWebMercatorT=false] true if the terrain data includes a Web Mercator texture coordinate; otherwise, false.
 * @param {Boolean} [hasGeodeticSurfaceNormals=false] true if the terrain data includes geodetic surface normals; otherwise, false.
 * @param {Number} [exaggeration=1.0] A scalar used to exaggerate terrain.
 * @param {Number} [exaggerationRelativeHeight=0.0] The relative height from which terrain is exaggerated.
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
  var quantization = TerrainQuantization.NONE;
  var toENU;
  var matrix;

  if (
    defined(axisAlignedBoundingBox) &&
    defined(minimumHeight) &&
    defined(maximumHeight) &&
    defined(fromENU)
  ) {
    var minimum = axisAlignedBoundingBox.minimum;
    var maximum = axisAlignedBoundingBox.maximum;

    var dimensions = Cartesian3.subtract(
      maximum,
      minimum,
      cartesian3DimScratch
    );
    var hDim = maximumHeight - minimumHeight;
    var maxDim = Math.max(Cartesian3.maximumComponent(dimensions), hDim);

    if (maxDim < SHIFT_LEFT_12 - 1.0) {
      quantization = TerrainQuantization.BITS12;
    } else {
      quantization = TerrainQuantization.NONE;
    }

    toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());

    var translation = Cartesian3.negate(minimum, cartesian3Scratch);
    Matrix4.multiply(
      Matrix4.fromTranslation(translation, matrix4Scratch),
      toENU,
      toENU
    );

    var scale = cartesian3Scratch;
    scale.x = 1.0 / dimensions.x;
    scale.y = 1.0 / dimensions.y;
    scale.z = 1.0 / dimensions.z;
    Matrix4.multiply(Matrix4.fromScale(scale, matrix4Scratch), toENU, toENU);

    matrix = Matrix4.clone(fromENU);
    Matrix4.setTranslation(matrix, Cartesian3.ZERO, matrix);

    fromENU = Matrix4.clone(fromENU, new Matrix4());

    var translationMatrix = Matrix4.fromTranslation(minimum, matrix4Scratch);
    var scaleMatrix = Matrix4.fromScale(dimensions, matrix4Scratch2);
    var st = Matrix4.multiply(translationMatrix, scaleMatrix, matrix4Scratch);

    Matrix4.multiply(fromENU, st, fromENU);
    Matrix4.multiply(matrix, st, matrix);
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
  var u = uv.x;
  var v = uv.y;

  if (this.quantization === TerrainQuantization.BITS12) {
    position = Matrix4.multiplyByPoint(
      this.toScaledENU,
      position,
      cartesian3Scratch
    );

    position.x = CesiumMath.clamp(position.x, 0.0, 1.0);
    position.y = CesiumMath.clamp(position.y, 0.0, 1.0);
    position.z = CesiumMath.clamp(position.z, 0.0, 1.0);

    var hDim = this.maximumHeight - this.minimumHeight;
    var h = CesiumMath.clamp((height - this.minimumHeight) / hDim, 0.0, 1.0);

    Cartesian2.fromElements(position.x, position.y, cartesian2Scratch);
    var compressed0 = AttributeCompression.compressTextureCoordinates(
      cartesian2Scratch
    );

    Cartesian2.fromElements(position.z, h, cartesian2Scratch);
    var compressed1 = AttributeCompression.compressTextureCoordinates(
      cartesian2Scratch
    );

    Cartesian2.fromElements(u, v, cartesian2Scratch);
    var compressed2 = AttributeCompression.compressTextureCoordinates(
      cartesian2Scratch
    );

    vertexBuffer[bufferIndex++] = compressed0;
    vertexBuffer[bufferIndex++] = compressed1;
    vertexBuffer[bufferIndex++] = compressed2;

    if (this.hasWebMercatorT) {
      Cartesian2.fromElements(webMercatorT, 0.0, cartesian2Scratch);
      var compressed3 = AttributeCompression.compressTextureCoordinates(
        cartesian2Scratch
      );
      vertexBuffer[bufferIndex++] = compressed3;
    }
  } else {
    Cartesian3.subtract(position, this.center, cartesian3Scratch);

    vertexBuffer[bufferIndex++] = cartesian3Scratch.x;
    vertexBuffer[bufferIndex++] = cartesian3Scratch.y;
    vertexBuffer[bufferIndex++] = cartesian3Scratch.z;
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

var scratchPosition = new Cartesian3();
var scratchGeodeticSurfaceNormal = new Cartesian3();

TerrainEncoding.prototype.addGeodeticSurfaceNormals = function (
  oldBuffer,
  newBuffer,
  ellipsoid
) {
  if (this.hasGeodeticSurfaceNormals) {
    return;
  }

  var oldStride = this.stride;
  var vertexCount = oldBuffer.length / oldStride;
  this.hasGeodeticSurfaceNormals = true;
  this._calculateStrideAndOffsets();
  var newStride = this.stride;

  for (var index = 0; index < vertexCount; index++) {
    for (var offset = 0; offset < oldStride; offset++) {
      var oldIndex = index * oldStride + offset;
      var newIndex = index * newStride + offset;
      newBuffer[newIndex] = oldBuffer[oldIndex];
    }
    var position = this.decodePosition(newBuffer, index, scratchPosition);
    var geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
      position,
      scratchGeodeticSurfaceNormal
    );

    var bufferIndex = index * newStride + this._offsetGeodeticSurfaceNormal;
    newBuffer[bufferIndex] = geodeticSurfaceNormal.x;
    newBuffer[bufferIndex + 1] = geodeticSurfaceNormal.y;
    newBuffer[bufferIndex + 2] = geodeticSurfaceNormal.z;
  }
};

TerrainEncoding.prototype.removeGeodeticSurfaceNormals = function (
  oldBuffer,
  newBuffer
) {
  if (!this.hasGeodeticSurfaceNormals) {
    return;
  }

  var oldStride = this.stride;
  var vertexCount = oldBuffer.length / oldStride;
  this.hasGeodeticSurfaceNormals = false;
  this._calculateStrideAndOffsets();
  var newStride = this.stride;

  for (var index = 0; index < vertexCount; index++) {
    for (var offset = 0; offset < newStride; offset++) {
      var oldIndex = index * oldStride + offset;
      var newIndex = index * newStride + offset;
      newBuffer[newIndex] = oldBuffer[oldIndex];
    }
  }
};

TerrainEncoding.prototype.decodePosition = function (buffer, index, result) {
  if (!defined(result)) {
    result = new Cartesian3();
  }

  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    var xy = AttributeCompression.decompressTextureCoordinates(
      buffer[index],
      cartesian2Scratch
    );
    result.x = xy.x;
    result.y = xy.y;

    var zh = AttributeCompression.decompressTextureCoordinates(
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

  var exaggeration = this.exaggeration;
  var exaggerationRelativeHeight = this.exaggerationRelativeHeight;
  var hasExaggeration = exaggeration !== 1.0;
  if (hasExaggeration && this.hasGeodeticSurfaceNormals) {
    var geodeticSurfaceNormal = this.decodeGeodeticSurfaceNormal(
      buffer,
      index,
      scratchGeodeticSurfaceNormal
    );
    var rawHeight = this.decodeHeight(buffer, index);
    var heightDifference =
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

TerrainEncoding.prototype.decodeTextureCoordinates = function (
  buffer,
  index,
  result
) {
  if (!defined(result)) {
    result = new Cartesian2();
  }

  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    return AttributeCompression.decompressTextureCoordinates(
      buffer[index + 2],
      result
    );
  }

  return Cartesian2.fromElements(buffer[index + 4], buffer[index + 5], result);
};

TerrainEncoding.prototype.decodeHeight = function (buffer, index) {
  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    var zh = AttributeCompression.decompressTextureCoordinates(
      buffer[index + 1],
      cartesian2Scratch
    );
    return (
      zh.y * (this.maximumHeight - this.minimumHeight) + this.minimumHeight
    );
  }

  return buffer[index + 3];
};

TerrainEncoding.prototype.decodeWebMercatorT = function (buffer, index) {
  index *= this.stride;

  if (this.quantization === TerrainQuantization.BITS12) {
    return AttributeCompression.decompressTextureCoordinates(
      buffer[index + 3],
      cartesian2Scratch
    ).x;
  }

  return buffer[index + 6];
};

TerrainEncoding.prototype.getOctEncodedNormal = function (
  buffer,
  index,
  result
) {
  index = index * this.stride + this._offsetVertexNormal;

  var temp = buffer[index] / 256.0;
  var x = Math.floor(temp);
  var y = (temp - x) * 256.0;

  return Cartesian2.fromElements(x, y, result);
};

TerrainEncoding.prototype.decodeGeodeticSurfaceNormal = function (
  buffer,
  index,
  result
) {
  index = index * this.stride + this._offsetGeodeticSurfaceNormal;

  result.x = buffer[index];
  result.y = buffer[index + 1];
  result.z = buffer[index + 2];
  return result;
};

TerrainEncoding.prototype._calculateStrideAndOffsets = function () {
  var vertexStride = 0;

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

var attributesIndicesNone = {
  position3DAndHeight: 0,
  textureCoordAndEncodedNormals: 1,
  geodeticSurfaceNormal: 2,
};
var attributesIndicesBits12 = {
  compressed0: 0,
  compressed1: 1,
  geodeticSurfaceNormal: 2,
};

TerrainEncoding.prototype.getAttributes = function (buffer) {
  var datatype = ComponentDatatype.FLOAT;
  var sizeInBytes = ComponentDatatype.getSizeInBytes(datatype);
  var strideInBytes = this.stride * sizeInBytes;
  var offsetInBytes = 0;

  var attributes = [];
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

    var componentsTexCoordAndNormals = 2;
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
    var usingAttribute0Component4 =
      this.hasWebMercatorT || this.hasVertexNormals;
    var usingAttribute1Component1 =
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

TerrainEncoding.prototype.getAttributeLocations = function () {
  if (this.quantization === TerrainQuantization.NONE) {
    return attributesIndicesNone;
  }
  return attributesIndicesBits12;
};

TerrainEncoding.clone = function (encoding, result) {
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
