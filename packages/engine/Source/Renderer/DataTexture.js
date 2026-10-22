// @ts-check

import {
  Check,
  DeveloperError,
  Math as CesiumMath,
  PixelFormat,
  RuntimeError,
  defined,
  destroyObject,
} from "@cesium/core";
import ContextLimits from "./ContextLimits.js";
import Sampler from "./Sampler.js";
import Texture from "./Texture.js";

/** @import { PixelDatatype, TypedArray } from "@cesium/core"; */
/** @import Context from "./Context.js"; */

/**
 * A texture that stores a 1D array of elements, one texel each, in row-major
 * order. Used for emulating texture buffers (e.g. NEAREST filtering, no mipmaps).
 *
 * To use in a shader, read element `i` via `ivec2(i % width, i / width)`,
 * where width comes from the `textureSize` builtin.
 *
 * @private
 */
class DataTexture {
  /**
   * @param {object} options
   * @param {PixelFormat} options.pixelFormat The format of each texel. Sets the number of values per element.
   * @param {PixelDatatype} options.pixelDatatype The type of each value.
   */
  constructor(options) {
    this._pixelFormat = options.pixelFormat;
    this._pixelDatatype = options.pixelDatatype;
    this._componentsPerElement = /** @type {any} */ (
      PixelFormat
    ).componentsLength(options.pixelFormat);

    /** @type {Texture | undefined} */
    this._texture = undefined;
    this._elementCount = 0;
  }

  /**
   * Undefined until the first upload. Replaced when the texture grows, so don't
   * keep a reference.
   *
   * @type {Texture | undefined}
   */
  get texture() {
    return this._texture;
  }

  /**
   * The number of elements in the latest upload.
   *
   * @type {number}
   */
  get elementCount() {
    return this._elementCount;
  }

  /**
   * The number of values per element, from the pixel format.
   *
   * @type {number}
   */
  get componentsPerElement() {
    return this._componentsPerElement;
  }

  /**
   * Uploads elements [start, end) of data. If the texture is created or grows,
   * every element is uploaded instead. If the range is within the existing texture,
   * only that range is updated.
   *
   * @param {Context} context The context to create the texture in.
   * @param {TypedArray} data Every element's values, componentsPerElement each.
   * @param {number} [start=0] The first element to upload.
   * @param {number} [end] One past the last element to upload. Defaults to the element count.
   *
   * @exception {RuntimeError} The elements don't fit in the largest supported texture.
   */
  upload(context, data, start, end) {
    const components = this._componentsPerElement;

    //>>includeStart('debug', pragmas.debug);
    Check.defined("context", context);
    Check.defined("data", data);
    if (data.length % components !== 0) {
      throw new DeveloperError(
        `data.length must be a multiple of componentsPerElement (${components}).`,
      );
    }
    //>>includeEnd('debug');

    const elementCount = data.length / components;
    start = start ?? 0;
    end = end ?? elementCount;

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("start", start, 0);
    Check.typeOf.number.greaterThanOrEquals("end", end, start);
    Check.typeOf.number.lessThanOrEquals("end", end, elementCount);
    //>>includeEnd('debug');

    // Texture defines its getters with Object.defineProperties, which the JSDoc type checker can't see.
    const texture = /** @type {any} */ (this._texture);
    if (!defined(texture) || elementCount > texture.width * texture.height) {
      this.#createTexture(context, elementCount);
      start = 0;
      end = elementCount;
    }

    this._elementCount = elementCount;
    this.#uploadRange(data, start, end);
  }

  /**
   * @returns {boolean}
   */
  isDestroyed() {
    return false;
  }

  destroy() {
    this._texture?.destroy();
    return destroyObject(this);
  }

  /**
   * Replaces the texture with one sized for elementCount elements. Throws before
   * destroying the old texture if the new size is unsupported.
   *
   * @param {Context} context The context to create the texture in.
   * @param {number} elementCount The number of elements the texture must hold.
   */
  #createTexture(context, elementCount) {
    const maximumTextureSize = /** @type {any} */ (ContextLimits)
      .maximumTextureSize;
    const { width, height } = this.#computeDimensions(
      elementCount,
      maximumTextureSize,
    );
    if (height > maximumTextureSize) {
      throw new RuntimeError(
        `${elementCount} elements exceed the capacity of the largest supported texture (${maximumTextureSize} x ${maximumTextureSize}).`,
      );
    }

    this._texture?.destroy();
    this._texture = new Texture({
      context: context,
      width: width,
      height: height,
      pixelFormat: this._pixelFormat,
      pixelDatatype: this._pixelDatatype,
      sampler: Sampler.NEAREST,
      flipY: false,
    });
  }

  /**
   * Uploads elements [start, end) as up to three rectangles: the partial first row,
   * the full rows between, and the partial last row.
   *
   * @param {TypedArray} data Every element's values.
   * @param {number} start The first element to upload.
   * @param {number} end One past the last element to upload.
   */
  #uploadRange(data, start, end) {
    if (start === end) {
      return;
    }

    const width = /** @type {any} */ (this._texture).width;
    const firstRow = Math.floor(start / width);
    const lastRow = Math.floor((end - 1) / width);
    if (firstRow === lastRow) {
      this.#uploadRectangle(data, start, end);
      return;
    }

    let fullRowsStart = start;
    if (start % width !== 0) {
      fullRowsStart = (firstRow + 1) * width;
      this.#uploadRectangle(data, start, fullRowsStart);
    }

    let fullRowsEnd = end;
    if (end % width !== 0) {
      fullRowsEnd = lastRow * width;
    }

    if (fullRowsStart < fullRowsEnd) {
      this.#uploadRectangle(data, fullRowsStart, fullRowsEnd);
    }

    if (fullRowsEnd < end) {
      this.#uploadRectangle(data, fullRowsEnd, end);
    }
  }

  /**
   * Uploads elements [start, end), which must lie within one row or cover whole rows.
   *
   * @param {TypedArray} data Every element's values.
   * @param {number} start The first element to upload.
   * @param {number} end One past the last element to upload.
   */
  #uploadRectangle(data, start, end) {
    const texture = /** @type {any} */ (this._texture);
    const textureWidth = texture.width;
    const components = this._componentsPerElement;
    const count = end - start;
    const width = Math.min(count, textureWidth);

    texture.copyFrom({
      xOffset: start % textureWidth,
      yOffset: Math.floor(start / textureWidth),
      skipColorSpaceConversion: true,
      source: {
        width: width,
        height: count / width,
        arrayBufferView: data.subarray(start * components, end * components),
      },
    });
  }

  /**
   * Computes a texture size holding elementCount elements, rounded up to a power
   * of two, in rows no wider than maximumWidth. The height is unbounded, so check
   * it against the maximum texture size.
   *
   * @param {number} elementCount The number of elements to hold. Zero is treated as one.
   * @param {number} maximumWidth The widest a row can be.
   * @returns {{width: number, height: number}}
   */
  #computeDimensions(elementCount, maximumWidth) {
    const capacity = CesiumMath.nextPowerOfTwo(Math.max(elementCount, 1));
    const width = Math.min(capacity, maximumWidth);
    return {
      width: width,
      height: Math.ceil(capacity / width),
    };
  }
}

export default DataTexture;
