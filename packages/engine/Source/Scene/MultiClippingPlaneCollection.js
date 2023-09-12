import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelFormat from "../Core/PixelFormat.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";

/**
 * Specifies a set of ClippingPlaneCollections. ClippingPlaneCollections selectively disable rendering in a region on the
 * outside of the specified list of {@link ClippingPlaneCollections} objects for the globe, it has not been tested on models nor 3D Tilesets.
 * MultiClippingPlaneCollection is now not abled to deal with unionClippingRegions.
 *
 * <p>
 * In general the clipping planes' coordinates are relative to the object they're attached to, so a plane with distance set to 0 will clip
 * through the center of the object.
 * </p>
 * <p>
 * </p>
 *
 * @alias MultiClippingPlaneCollection
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {ClippingPlaneCollection[]} [options.collections=[]] An array of {@link ClippingPlaneCollection} objects used to selectively disable rendering on the outside of collection.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix specifying an additional transform relative to the clipping planes original coordinate system.
 * @param {Color} [options.edgeColor=Color.WHITE] The color applied to highlight the edge along which an object is clipped.
 * @param {Number} [options.edgeWidth=0.0] The width, in pixels, of the highlight applied to the edge along which an object is clipped.
 */
function MultiClippingPlaneCollection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._multiCollections = [];

  this._dataArrayBuffer = null;
  this._lengthArrayBuffer = null;

  this._dataTexture = null;
  this._lengthTexture = null;

  this._dirty = false;

  this._maxCollectionLength = 0;

  this._totalPlanesCount = 0;

  /**
   * The 4x4 transformation matrix specifying an additional transform relative to the clipping planes
   * original coordinate system.
   *
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   */
  this.modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );

  /**
   * The color applied to highlight the edge along which an object is clipped.
   *
   * @type {Color}
   * @default Color.WHITE
   */
  this.edgeColor = Color.clone(defaultValue(options.edgeColor, Color.WHITE));

  /**
   * The width, in pixels, of the highlight applied to the edge along which an object is clipped.
   *
   * @type {Number}
   * @default 0.0
   */
  this.edgeWidth = defaultValue(options.edgeWidth, 0.0);

  // Add each ClippingPlaneCollection object
  const collections = options.collections;
  const me = this;
  if (defined(collections)) {
    collections.forEach(function (p) {
      me.add(p);
    });
  }
}

Object.defineProperties(MultiClippingPlaneCollection.prototype, {
  /**
   * Returns the number of ClippingPlaneCollections in this MultiClippingPlaneCollection.
   *
   * @memberof MultiClippingPlaneCollection.prototype
   * @type {Number}
   * @readonly
   */
  length: {
    get: function () {
      return this._multiCollections.length;
    },
  },

  /**
   * Returns a texture containing all planes of all ClippingPlaneCollections.
   *
   * @memberof MultiClippingPlaneCollection.prototype
   * @type {*}
   * @readonly
   * @private
   */
  dataTexture: {
    get: function () {
      return this._dataTexture;
    },
  },

  /**
   * Returns a texture containing length of each ClippingPlaneCollection.
   *
   * @memberof MultiClippingPlaneCollection.prototype
   * @type {*}
   * @readonly
   * @private
   */
  lengthTexture: {
    get: function () {
      return this._lengthTexture;
    },
  },

  /**
   * Returns the combined state of each ClippingPlaneCollection.
   *
   * @memberof MultiClippingPlaneCollection.prototype
   * @type {String}
   * @readonly
   */
  collectionsState: {
    get: function () {
      let state = 0;
      this._multiCollections.forEach(function (p, i) {
        // state += (p.enabled ? "+" : "-") + i + p.clippingPlanesState;
        state += p.clippingPlanesState;
      });
      return state;
    },
  },

  /**
   * Returns the max length of ClippingPlaneCollection in this MultiClippingPlaneCollection. This is used in
   * getMultiClippingFunction.js .
   *
   * @memberof MultiClippingPlaneCollection.prototype
   * @type {Number}
   * @readonly
   */
  maxCollectionLength: {
    get: function () {
      return this._maxCollectionLength;
    },
  },

  /**
   * Returns the count of all planes.
   *
   * @memberof MultiClippingPlaneCollection.prototype
   * @type {Number}
   * @readonly
   */
  totalPlanesCount: {
    get: function () {
      return this._totalPlanesCount;
    },
  },
});

/**
 * Adds the specified {@link ClippingPlaneCollection} to the collection to be used to selectively disable rendering
 * on the outside of each plane collection.
 * @param {ClippingPlaneCollection} collection The ClippingPlaneCollection to add to the collection.
 */
MultiClippingPlaneCollection.prototype.add = function (collection) {
  this._multiCollections.push(collection);
  this._dirty = true;
};

/**
 * Returns the plane in the collection at the specified index.  Indices are zero-based
 * and increase as planes are added.  Removing a plane shifts all planes after
 * it to the left, changing their indices.
 *
 * @param {Number} index The zero-based index of the ClippingPlaneCollection.
 * @returns {ClippingPlaneCollection} The ClippingPlaneCollection at the specified index.
 */
MultiClippingPlaneCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  return this._multiCollections[index];
};

/**
 * Checks whether this collection contains a ClippingPlaneCollection equal to the given ClippingPlaneCollection.
 *
 * @param {ClippingPlaneCollection} collection
 * @returns {Boolean} <code>true</code> if this collection contains the ClippingPlaneCollection, <code>false</code> otherwise.
 */
MultiClippingPlaneCollection.prototype.contains = function (collection) {
  return (
    this._multiCollections.findIndex(function (p) {
      return p === collection;
    }) !== -1
  );
};

/**
 * Removes the first occurrence of the given ClippingPlane from the collection.
 *
 * @param {ClippingPlaneCollection} collection
 * @returns {Boolean} <code>true</code> if the plane was removed; <code>false</code> if the plane was not found in the collection.
 */
MultiClippingPlaneCollection.prototype.remove = function (collection) {
  const collections = this._multiCollections;
  const index = collections.findIndex(function (p) {
    return p === collection;
  });

  if (index === -1) {
    return false;
  }

  collections.splice(index, 1);

  if (collection instanceof ClippingPlaneCollection) {
    collection.destroy();
  }

  this._dirty = true;

  return true;
};

/**
 * Removes all ClippingPlaneCollection from the collection.
 */
MultiClippingPlaneCollection.prototype.removeAll = function () {
  this._multiCollections.forEach(function (collection) {
    if (collection instanceof ClippingPlaneCollection) {
      collection.destroy();
    }
  });
  this._multiCollections = [];
  this._dirty = true;
};

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * build the resources for clipping planes.
 * <p>
 * Do not call this function directly.
 * </p>
 */
MultiClippingPlaneCollection.prototype.update = function (frameState) {
  const collections = this._multiCollections;
  collections.forEach(function (p) {
    if (p.enabled) p.update(frameState);
  });

  if (this._dirty) {
    const context = frameState.context;
    // concat each collection's arraybuffer
    const useFloatTexture = ClippingPlaneCollection.useFloatTexture(context);
    let widthTotal = 0,
      height;
    let updateTexture = true;
    let totalPlanes = 0;
    let maxLength = 0;
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      totalPlanes += collections.length;
      maxLength = Math.max(maxLength, collection.length);
      // if (collection.enabled) {
      height = collection.texture.height; // should be the same for all collections
      widthTotal += collection.texture.width;
      // }
      if (!defined(collection.texture)) {
        updateTexture = false;
      }
    }

    this._totalPlanesCount = totalPlanes;
    this._maxCollectionLength = maxLength;

    if (updateTexture && collections.length > 0) {
      this._dataArrayBuffer = useFloatTexture
        ? new Float32Array(widthTotal * height * 4)
        : new Uint8Array(widthTotal * height * 4);
      this._lengthArrayBuffer = new Float32Array(collections.length * 4);
      const arrayBuffer = this._dataArrayBuffer;
      const lengthArrayBuffer = this._lengthArrayBuffer;

      let startIndex = 0;
      collections.forEach(function (p, i) {
        // if (p.enabled) {

        const nowDataBuffer = useFloatTexture ? p._float32View : p._uint8View;
        let nowDataIndex = 0;
        // exclude zeros (data with height = 1)
        for (let j = 0; j < p.length; ++j) {
          arrayBuffer[startIndex] = nowDataBuffer[nowDataIndex];
          arrayBuffer[startIndex + 1] = nowDataBuffer[nowDataIndex + 1];
          arrayBuffer[startIndex + 2] = nowDataBuffer[nowDataIndex + 2];
          arrayBuffer[startIndex + 3] = nowDataBuffer[nowDataIndex + 3];

          nowDataIndex += 4; // each plane is 4 floats
          startIndex += 4;
        }
        lengthArrayBuffer[i * 4 + 3] = p.length;

        // startIndex += p.texture.width * 4;
        // }
      });

      if (useFloatTexture) {
        this._dataTexture = new Texture({
          context: context,
          width: widthTotal,
          height: height,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: PixelDatatype.FLOAT,
          sampler: Sampler.NEAREST,
          flipY: false,
        });
      } else {
        this._dataTexture = new Texture({
          context: context,
          width: widthTotal,
          height: height,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
          sampler: Sampler.NEAREST,
          flipY: false,
          source: {
            width: widthTotal,
            height: height,
            arrayBufferView: arrayBuffer,
          },
        });
      }
      this._dataTexture.copyFrom({
        source: {
          width: widthTotal,
          height: height,
          arrayBufferView: arrayBuffer,
        },
      });

      this._lengthTexture = new Texture({
        context: context,
        width: collections.length,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.FLOAT,
        sampler: Sampler.NEAREST,
        flipY: false,
      });
      this._lengthTexture.copyFrom({
        source: {
          width: collections.length,
          height: 1,
          arrayBufferView: lengthArrayBuffer,
        },
      });
    }

    this._dirty = false;
  }
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * multiClippingPlaneCollections = multiClippingPlaneCollections && multiClippingPlaneCollections.destroy();
 *
 * @see ClippingPlaneCollection#isDestroyed
 */
MultiClippingPlaneCollection.prototype.destroy = function () {
  this._multiCollections.forEach(function (collection) {
    if (collection instanceof ClippingPlaneCollection) {
      collection.destroy();
    }
  });
  this._multiCollections = undefined;

  this._dataTexture = this._dataTexture && this._dataTexture.destroy();

  this._lengthTexture = this._lengthTexture && this._lengthTexture.destroy();

  return destroyObject(this);
};

export default MultiClippingPlaneCollection;
