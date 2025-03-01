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

  this._hasSubregion = false;

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
    // This image has already been loaded
    return;
  }

  const collection = this._billboardCollection;
  const cache = collection.billboardTextureCache;
  let billboardTexture = cache.get(id);
  if (
    (defined(billboardTexture) &&
      image.loadState === BillboardLoadState.LOADING) ||
    image.loadState === BillboardLoadState.LOADED
  ) {
    // Use the cached texture if it is in progress or successful.
    BillboardTexture.clone(billboardTexture, this);
    return;
  }
  // Otherwise, load if not yet assigned an image, and try the load again if anything failed during the last billboard creation
  if (!defined(billboardTexture)) {
    billboardTexture = new BillboardTexture(collection);
    cache.set(id, billboardTexture);
  }

  billboardTexture._id = this._id = id;
  billboardTexture._loadState = this._loadState = BillboardLoadState.LOADING;
  billboardTexture._loadError = this._loadError = undefined;

  let index;
  const atlas = this._billboardCollection.textureAtlas;
  try {
    index = await atlas.addImage(id, image);
  } catch (error) {
    // There was an error loading the image
    billboardTexture._loadState = BillboardLoadState.ERROR;
    billboardTexture._loadError = error;

    if (this._id !== id) {
      // Another load was initiated and resolved resolved before this one. This operation is cancelled.
      return;
    }

    this._loadState = BillboardLoadState.ERROR;
    this._loadError = error;
    return;
  }

  if (!defined(index) || index === -1) {
    // Resources destroyed or otherwise
    billboardTexture._loadState = BillboardLoadState.FAILED;
    billboardTexture._index = -1;

    if (this._id !== id) {
      // Another load was initiated and resolved resolved before this one. This operation is cancelled.
      return;
    }

    this._loadState = BillboardLoadState.FAILED;
    this._index = -1;

    return;
  }

  billboardTexture._index = index;
  billboardTexture._loadState = BillboardLoadState.LOADED;

  const rectangle = atlas.rectangles[index];
  billboardTexture._width = rectangle.width;
  billboardTexture._height = rectangle.height;

  if (this._id !== id) {
    // Another load was initiated and resolved resolved before this one. This operation is cancelled.
    return;
  }

  this._index = index;
  this._loadState = BillboardLoadState.LOADED;
  this._width = rectangle.width;
  this._height = rectangle.height;

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
  this._hasSubregion = true;

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

/**
 * Clones an existing billboard texture, inlcuding any in-flight tracking, into the target billboard texture.
 * @param {BillboardTexture} billboardTexture
 * @param {BillboardTexture} target
 * @returns {BillboardTexture} target
 */
BillboardTexture.clone = function (billboardTexture, target) {
  target._id = billboardTexture._id;
  target._loadState = billboardTexture._loadState;
  target._loadError = undefined;
  target._index = billboardTexture._index;
  target._width = billboardTexture._width;
  target._height = billboardTexture._height;
  target._hasSubregion = billboardTexture._hasSubregion;

  if (billboardTexture.ready) {
    target.dirty = true;
    return;
  }

  const completeLoad = async () => {
    const id = billboardTexture._id;
    const atlas = billboardTexture._billboardCollection.textureAtlas;
    await atlas._indexPromiseById.get(id);

    // Any errors should have already been handled
    if (target._id !== id) {
      // Another load was initiated and resolved resolved before this one. This operation is cancelled.
      return;
    }

    if (billboardTexture._hasSubregion) {
      // Subregions must wait an additional frame to be ready
      await Promise.resolve();
    }

    target._id = id;
    target._loadState = billboardTexture._loadState;
    target._loadError = billboardTexture._loadError;
    target._index = billboardTexture._index;
    target._width = billboardTexture._width;
    target._height = billboardTexture._height;
    target.dirty = true;
  };

  completeLoad();
  return target;
};

export default BillboardTexture;
