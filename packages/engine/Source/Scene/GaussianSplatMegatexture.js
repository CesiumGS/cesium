import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import Texture from "../Renderer/Texture.js";
import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import Sampler from "../Renderer/Sampler.js";

// /**
//  * Megatexture for Gaussian splat primitives. Handles splat attributes.
//  * This is used by {@link GaussianSplatPrimitive} to store the splat data in a texture.
//  */

/**
 * Creates a new Gaussian splat megatexture.
 * @param {Object} context
 * @param {Object} options - Object with the following properties:
 * @param {number} options.width The width of the megatexture.
 * @param {number} options.height The height of the megatexture.
 * @param {PixelFormat} options.pixelFormat The pixel format of the megatexture.
 * @param {PixelDatatype} options.pixelDatatype The pixel datatype of the megatexture.
 */
function GaussianSplatMegatexture(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  const {
    context,
    width = 16384,
    height = 16384,
    pixelFormat = PixelFormat.RGBA_INTEGER,
    pixelDatatype = PixelDatatype.UNSIGNED_INT,
  } = options;

  /**
   * @private
   * @type {number}
   * @default 16384
   */
  this._width = width;

  /**
   * @private
   * @type {number}
   * @default 16384
   */
  this._height = height;

  /**
   * @private
   * @type {PixelFormat}
   * @default PixelFormat.RGBA_INTEGER
   */
  this._pixelFormat = pixelFormat;

  /**
   * @private
   * @type {PixelDatatype}
   * @default PixelDatatype.UNSIGNED_INT
   */
  this._pixelDatatype = pixelDatatype;

  this._texture = new Texture({
    context,
    source: {
      width: this._width,
      height: this._height,
    },
    pixelFormat: this._pixelFormat,
    pixelDatatype: this._pixelDatatype,
    preMultiplyAlpha: false,
    skipColorSpaceConversion: true,
    flipY: false,
    sampler: Sampler.NEAREST,
  });
}

Object.defineProperties(GaussianSplatMegatexture.prototype, {
  width: {
    get: function () {
      return this._width;
    },
  },
  height: {
    get: function () {
      return this._height;
    },
  },
  pixelFormat: {
    get: function () {
      return this._pixelFormat;
    },
  },
  pixelDatatype: {
    get: function () {
      return this._pixelDatatype;
    },
  },
  texture: {
    get: function () {
      return this._texture;
    },
  },
});

GaussianSplatMegatexture.prototype.insertTextureData = function (
  data,
  xOffset,
  yOffset,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("data", data);
  Check.typeOf.object("data", data);
  Check.defined("data", data.arrayBufferView);
  Check.typeOf.number.greaterThanOrEquals("xOffset", xOffset, 0);
  Check.typeOf.number.greaterThanOrEquals("yOffset", yOffset, 0);
  Check.typeOf.number.lessThanOrEquals(
    "xOffset + data.width",
    xOffset + data.width,
    this._width,
  );
  Check.typeOf.number.lessThanOrEquals(
    "yOffset + data.height",
    yOffset + data.height,
    this._height,
  );
  //>>includeEnd('debug');

  this._texture.copyFrom({
    source: data,
    xOffset: xOffset,
    yOffset: yOffset,
    skipColorSpaceConversion: true,
  });
};

GaussianSplatMegatexture.prototype.insertTextureDataMultiple = function (
  dataArray,
  startTexelOffset = 0,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("dataArray", dataArray);
  Check.typeOf.object("dataArray", dataArray);
  Check.typeOf.number.greaterThanOrEquals(
    "startTexelOffset",
    startTexelOffset,
    0,
  );
  //>>includeEnd('debug');

  const texelsPerRow = this.texture.width;
  let totalTexels = 0;
  const texelSize = PixelFormat.componentsLength(this._pixelFormat);
  const offsets = [];

  for (let i = 0; i < dataArray.length; i++) {
    const data = dataArray[i];
    const texels = data.width * data.height;
    offsets.push({
      index: i,
      texelOffset: totalTexels + startTexelOffset,
      texelCount: texels,
    });
    totalTexels += texels;
  }

  const TypedArrayConstructor = dataArray[0].arrayBufferView.constructor;
  const bigArray = new TypedArrayConstructor(totalTexels * texelSize);

  let dstOffset = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const src = dataArray[i].arrayBufferView;
    bigArray.set(src, dstOffset);
    dstOffset += src.length;
  }

  const startY = Math.floor(startTexelOffset / texelsPerRow);
  const rowsNeeded = Math.ceil(totalTexels / texelsPerRow);

  const paddedTexels = rowsNeeded * texelsPerRow;
  const finalArray =
    totalTexels < paddedTexels
      ? (() => {
          const padded = new TypedArrayConstructor(paddedTexels * texelSize);
          padded.set(bigArray);
          return padded;
        })()
      : bigArray;

  this.texture.copyFrom({
    source: {
      width: texelsPerRow,
      height: rowsNeeded,
      arrayBufferView: finalArray,
    },
    xOffset: 0,
    yOffset: startY,
  });

  return offsets;
};

export default GaussianSplatMegatexture;
