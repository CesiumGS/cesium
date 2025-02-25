import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import BillboardLoadState from "./BillboardLoadState.js";

/**
 * Tracks a reference to an image and it's loading state, as used in a BillboardCollection and stored in a texture atlas.
 * @constructor
 * @private
 * @see BillboardCollection
 * @see Billboard#image
 * @alias BillboardTexture
 * @param {BillboardCollection} billboardCollection The associated billboard collecion.
 */
function BillboardTexture(billboardCollection) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("billboardCollection", billboardCollection);
  //>>includeEnd('debug');

  this._billboardCollection = billboardCollection;

  this._id = undefined;
  this._loadState = BillboardLoadState.NONE;
  this._loadError = undefined;

  this._index = -1;
  this._width = undefined;
  this._height = undefined;

  /**
   * Used by billboardCollection to track whcih billboards to update.
   * @type {boolean}
   * @private
   */
  this.dirty = false;
}

Object.defineProperties(BillboardTexture.prototype, {
  /**
   * If defined, this error was encountered during the loading process.
   * @memberof BillboardTexture.prototype
   * @type {Error|undefined}
   * @readonly
   * @private
   */
  loadError: {
    get: function () {
      return this._loadError;
    },
  },

  /**
   * The current status of the image load. When <code>BillboardLoadState.LOADED</code>, this billboard is ready to render, i.e., the image
   * has been downloaded and the WebGL resources are created.
   * @memberof BillboardTexture.prototype
   * @type {BillboardLoadState}
   * @readonly
   * @default BillboardLoadState.NONE
   * @private
   */
  loadState: {
    get: function () {
      return this._loadState;
    },
  },

  /**
   * When <code>true</code>, this texture is ready to render, i.e., the image
   * has been downloaded and the WebGL resources are created.
   * @memberof BillboardTexture.prototype
   * @type {boolean}
   * @readonly
   * @default false
   * @private
   */
  ready: {
    get: function () {
      return this._loadState === BillboardLoadState.LOADED;
    },
  },

  /**
   * Returns <code>true</code> if there is image data associated with this instance.
   * @memberof BillboardTexture.prototype
   * @type {boolean}
   * @readonly
   * @private
   */
  hasImage: {
    get: function () {
      return this._loadState !== BillboardLoadState.NONE;
    },
  },

  /**
   * A unique identifier for the image, or undefined if no image data has been associated with this instance.
   * @memberof BillboardTexture.prototype
   * @type {string|undefined}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The width of the associated image. Before the instance is <code>ready</code>, this will be <code>undefined</code>.
   * @memberof BillboardTexture.prototype
   * @type {number|undefined}
   * @readonly
   * @private
   */
  width: {
    get: function () {
      return this._width;
    },
  },

  /**
   * The height of the associated image. Before the instance is <code>ready</code>, this will be <code>undefined</code>.
   * @memberof BillboardTexture.prototype
   * @type {number|undefined}
   * @readonly
   * @private
   */
  height: {
    get: function () {
      return this._height;
    },
  },
});

/**
 * Releases reference to any associated image data.
 * @private
 */
BillboardTexture.prototype.unload = async function () {
  if (this._loadState === BillboardLoadState.NONE) {
    return;
  }

  this._id = undefined;
  this._loadError = undefined;
  this._loadState = BillboardLoadState.NONE;

  this._index = -1;
  this._width = undefined;
  this._height = undefined;

  this.dirty = true;
};

/**
 * Starts loading an image into the texture atlas.
 * @see {TextureAtlas#addImage}
 * @private
 * @param {string} id An identifier to detect whether the image already exists in the atlas.
 * @param {HTMLImageElement|HTMLCanvasElement|string|Resource|Promise|TextureAtlas.CreateImageCallback} image An image or canvas to add to the texture atlas,
 *        or a URL to an Image, or a Promise for an image, or a function that creates an image.
 */
BillboardTexture.prototype.loadImage = async function (id, image) {
  if (this._id === id) {
    // Image has already been loaded
    return;
  }

  this._id = id;
  this._loadState = BillboardLoadState.LOADING;
  this._loadError = undefined;

  let index;
  const atlas = this._billboardCollection.textureAtlas;
  try {
    index = await atlas.addImage(id, image);
  } catch (error) {
    if (this._id !== id) {
      // Another load was initiated and resolved resolved before this one. This operation is cancelled.
      return;
    }

    // There was an error loading the image
    this._loadState = BillboardLoadState.ERROR;
    this._loadError = error;
    return;
  }

  if (this._id !== id) {
    // Another load was initiated and resolved resolved before this one. This operation is cancelled.
    return;
  }

  if (!defined(index) || index === -1) {
    this._loadState = BillboardLoadState.FAILED;
    this._index = -1;
    this._width = undefined;
    this._height = undefined;
    return;
  }

  const rectangle = atlas.rectangles[index];
  this._width = rectangle.width;
  this._height = rectangle.height;

  this._index = index;
  this._loadState = BillboardLoadState.LOADED;

  this.dirty = true;
};

/**
 * Track a reference to a sub-region of an existing image.
 * @see {TextureAtlas#addImageSubRegion}
 * @private
 * @param {string} id An identifier to detect whether the image already exists in the atlas.
 * @param {BoundingRectangle} subRegion An {@link BoundingRectangle} defining a region of an existing image, measured in pixels from the bottom-left of the image.
 */
BillboardTexture.prototype.addImageSubRegion = async function (id, subRegion) {
  this._id = id;
  this._loadState = BillboardLoadState.LOADING;
  this._loadError = undefined;

  let index;
  const atlas = this._billboardCollection.textureAtlas;
  try {
    index = await atlas.addImageSubRegion(id, subRegion);
  } catch (error) {
    // There was an error loading the referenced image
    this._loadState = BillboardLoadState.ERROR;
    this._loadError = error;
    return;
  }

  if (!defined(index) || index === -1) {
    this._loadState = BillboardLoadState.FAILED;
    this._index = -1;
    this._width = undefined;
    this._height = undefined;
    return;
  }

  this._width = subRegion.width;
  this._height = subRegion.height;

  this._index = index;
  this._loadState = BillboardLoadState.LOADED;

  this.dirty = true;
};

/**
 * Get the texture coordinates for reading the loaded texture in shaders.
 * @private
 * @param {BoundingRectangle} [result] The modified result parameter or a new BoundingRectangle instance if one was not provided.
 * @return {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
 */
BillboardTexture.prototype.computeTextureCoordinates = function (result) {
  const atlas = this._billboardCollection.textureAtlas;
  return atlas.computeTextureCoordinates(this._index, result);
};

export default BillboardTexture;
