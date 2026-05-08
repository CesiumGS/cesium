import Cartesian2 from "../Core/Cartesian2.js";
import Sampler from "./Sampler.js";
import Texture from "./Texture.js";
import TextureMagnificationFilter from "./TextureMagnificationFilter.js";
import TextureMinificationFilter from "./TextureMinificationFilter.js";

/** @import Context from "./Context.js"; */
/** @import PixelFormat from "../Core/PixelFormat.js"; */
/** @import PixelDatatype from "./PixelDatatype.js"; */

/**
 * A wrapper around a Texture that allows for dynamic updates,
 * with tracking of a range of dirty data that needs updating.
 *
 * Texels are addressed by their linear row-major index in
 * `[0, width * height)`. Each texel spans `componentsPerTexel` entries
 * in the backing array.
 *
 * @experimental This feature is not final and is subject to change without
 *   Cesium's standard deprecation policy.
 */
class DynamicTexture {
  /**
   * @param {object} options
   * @param {Float32Array | Uint32Array | Uint8Array} options.texels
   *   CPU-side backing array, sized to
   *   `width * height * componentsPerTexel`. Used as the initial
   *   contents of the GPU texture.
   * @param {number} options.width
   * @param {number} options.height
   * @param {number} options.componentsPerTexel
   *   Number of typed-array entries per texel (e.g. 4 for RGBA, 1 for R).
   * @param {PixelFormat} options.pixelFormat
   * @param {PixelDatatype} options.pixelDatatype
   * @param {boolean} [options.flipY] Whether to flip the texture vertically on upload. Defaults to true.
   * @param {object} [options.sampler] Defaults to NEAREST/NEAREST.
   */
  constructor(options) {
    this._texels = options.texels;
    this._width = options.width;
    this._height = options.height;
    this._componentsPerTexel = options.componentsPerTexel;
    this._pixelFormat = options.pixelFormat;
    this._pixelDatatype = options.pixelDatatype;
    this._sampler = options.sampler ?? DynamicTexture.NEAREST_SAMPLER;
    this._flipY = options.flipY ?? true;

    /** @type {object | undefined} */
    this._texture = undefined;

    // Dirty range over texel indices, [start, end). Empty when end <= start.
    this._dirtyStart = Infinity;
    this._dirtyEnd = 0;
  }

  /** @returns {number} */
  get width() {
    return this._width;
  }

  /** @returns {number} */
  get height() {
    return this._height;
  }

  /**
   * Texture size as a fresh Cartesian2, suitable for use as a uniform
   * value.
   * @returns {Cartesian2}
   */
  get size() {
    return new Cartesian2(this._width, this._height);
  }

  /**
   * The GPU texture, or undefined until {@link DynamicTexture#update} has
   * been called at least once.
   * @returns {object | undefined} Texture
   */
  get texture() {
    return this._texture;
  }

  /**
   * Write `componentsPerTexel` values into the texel at the given index
   * and mark it dirty so the corresponding row is re-uploaded on the
   * next {@link DynamicTexture#update}.
   *
   * @param {number} index Linear row-major index of the texel to write.
   * @param {ArrayLike<number>} values
   *   Length must equal `componentsPerTexel`.
   */
  set(index, values) {
    const cpt = this._componentsPerTexel;
    const dst = index * cpt;
    const texels = this._texels;
    for (let i = 0; i < cpt; i++) {
      texels[dst + i] = values[i];
    }
    if (index < this._dirtyStart) {
      this._dirtyStart = index;
    }
    if (index + 1 > this._dirtyEnd) {
      this._dirtyEnd = index + 1;
    }
  }

  /**
   * Lazily create the GPU texture on first call, and re-upload any dirty rows on
   * subsequent calls.
   *
   * @param {object} context Context
   */
  update(context) {
    if (this._texture === undefined) {
      this._texture = new Texture({
        context,
        width: this._width,
        height: this._height,
        pixelFormat: this._pixelFormat,
        pixelDatatype: this._pixelDatatype,
        sampler: this._sampler,
        flipY: this._flipY,
        source: {
          width: this._width,
          height: this._height,
          arrayBufferView: this._texels,
        },
      });
      this._dirtyStart = Infinity;
      this._dirtyEnd = 0;
      return;
    }

    if (this._dirtyEnd <= this._dirtyStart) {
      return;
    }

    const width = this._width;
    const cpt = this._componentsPerTexel;
    const startRow = Math.floor(this._dirtyStart / width);
    const endRow = Math.ceil(this._dirtyEnd / width);
    const subTexels = this._texels.subarray(
      startRow * width * cpt,
      endRow * width * cpt,
    );
    this._texture.copyFrom({
      xOffset: 0,
      yOffset: startRow,
      source: {
        width,
        height: endRow - startRow,
        arrayBufferView: subTexels,
      },
    });

    this._dirtyStart = Infinity;
    this._dirtyEnd = 0;
  }

  /**
   * Releases the GPU texture, if it was allocated.
   */
  destroy() {
    if (this._texture !== undefined) {
      this._texture.destroy();
      this._texture = undefined;
    }
  }
}

/**
 * Default sampler shared across all DynamicTexture instances.
 * @type {object} Sampler
 */
DynamicTexture.NEAREST_SAMPLER = new Sampler({
  minificationFilter: TextureMinificationFilter.NEAREST,
  magnificationFilter: TextureMagnificationFilter.NEAREST,
});

export default DynamicTexture;
