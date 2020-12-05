import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

/**
 * Feature ID texture mapping to a feature table.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.featureIdTexture The feature ID texture from the glTF.
 * @param {GltfFeatureTable} options.featureTable The feature table.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureIdTexture
 * @constructor
 *
 * @private
 */
function GltfFeatureIdTexture(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var featureIdTexture = options.featureIdTexture;
  var featureTable = options.featureTable;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.featureIdTexture", featureIdTexture);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var textureAccessor = featureIdTexture.featureIds;

  var featureIds = getFeatureIds(this, gltfContainer, textureAccessor, cache);

  var readyPromise = featureIds.readyPromise;

  var that = this;
  readyPromise = readyPromise.then(function () {
    return featureTable.readyPromise.then(function () {
      return that;
    });
  });

  this._featureTable = featureTable;
  this._featureIds = featureIds;
  this._cache = cache;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureIdTexture.prototype, {
  /**
   * Promise that resolves when the feature ID texture is ready.
   *
   * @memberof GltfFeatureIdTexture.prototype
   * @type {Promise.<GltfFeatureIdTexture>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

function getFeatureIds(
  featureIdTexture,
  gltfContainer,
  textureAccessor,
  cache
) {
  var textureInfo = textureAccessor.texture;
  var textureIndex = textureInfo.index;
  var texture = gltfContainer.gltf.textures[textureIndex];
  var channel = textureAccessor.channels;

  // Clone so that this object doesn't hold on to a reference to the glTF JSON
  textureInfo = clone(textureInfo, true);

  var featureIds = new FeatureIds({
    channel: channel,
    textureInfo: textureInfo,
    imageData: undefined,
    cacheItem: undefined,
    readyPromise: undefined,
  });

  featureIds.readyPromise = cache
    .getTexture({
      gltfContainer: gltfContainer,
      texture: texture,
      textureId: textureIndex,
    })
    .then(function (cacheItem) {
      if (featureIdTexture.isDestroyed()) {
        // The feature ID texture was destroyed before the request came back
        cache.releaseCacheItem(cacheItem);
        return;
      }
      featureIds.cacheItem = cacheItem;
      var imageData = cacheItem.contents;
      if (defined(imageData)) {
        featureIds.imageData = imageData;
      }
      return featureIds;
    });

  return featureIds;
}

function FeatureIds(options) {
  this.channel = options.channel;
  this.textureInfo = options.textureInfo;
  this.imageData = options.imageData;
  this.cacheItem = options.cacheItem;
  this.readyPromise = options.readyPromise;
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfFeatureIdTexture#destroy
 *
 * @private
 */
GltfFeatureIdTexture.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the object. Destroying an object allows for deterministic release of
 * resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception. Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see GltfFeatureIdTexture#isDestroyed
 *
 * @private
 */
GltfFeatureIdTexture.prototype.destroy = function () {
  var cache = this._cache;
  var featureIds = this._featureIds;

  if (defined(featureIds) && defined(featureIds.cacheItem)) {
    cache.releaseCacheItem(featureIds.cacheItem);
  }

  return destroyObject(this);
};

export default GltfFeatureIdTexture;
