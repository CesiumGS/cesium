import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

/**
 * Feature mapping from a texture to a feature table.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.texture The texture JSON object from the glTF.
 * @param {Number} options.textureId The texture index.
 * @param {Object} options.textureInfo The texture info object.
 * @param {Object} options.featureMapping The feature mapping JSON object from the glTF.
 * @param {GltfFeatureTable} options.featureTable The feature table.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTextureMapping
 * @constructor
 *
 * @private
 */
function GltfFeatureTextureMapping(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var texture = options.texture;
  var textureId = options.textureId;
  var textureInfo = options.textureInfo;
  var featureMapping = options.featureMapping;
  var featureTable = options.featureTable;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.texture", texture);
  Check.typeOf.number("options.textureId", textureId);
  Check.typeOf.object("options.textureInfo", textureInfo);
  Check.typeOf.object("options.featureMapping", featureMapping);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  // Clone so that this object doesn't hold on to a reference to the gltf JSON
  textureInfo = clone(textureInfo, true);

  var featureIds = getFeatureIds(
    this,
    featureMapping.featureIds,
    gltfContainer,
    texture,
    textureId,
    textureInfo,
    cache
  );

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

Object.defineProperties(GltfFeatureTextureMapping.prototype, {
  /**
   * Promise that resolves when the feature mapping is ready.
   *
   * @memberof GltfFeatureTextureMapping.prototype
   * @type {Promise.<GltfFeatureTextureMapping>}
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
  featureMapping,
  featureIdsObject,
  gltfContainer,
  texture,
  textureId,
  textureInfo,
  cache
) {
  var channel = featureIdsObject.channel;

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
      textureId: textureId,
    })
    .then(function (cacheItem) {
      if (featureMapping.isDestroyed()) {
        // The feature mapping was destroyed before the request came back
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
 * @see GltfFeatureTextureMapping#destroy
 *
 * @private
 */
GltfFeatureTextureMapping.prototype.isDestroyed = function () {
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
 * @see GltfFeatureTextureMapping#isDestroyed
 *
 * @private
 */
GltfFeatureTextureMapping.prototype.destroy = function () {
  var cache = this._cache;
  var featureIds = this._featureIds;

  if (defined(featureIds) && defined(featureIds.cacheItem)) {
    cache.releaseCacheItem(featureIds.cacheItem);
  }

  return destroyObject(this);
};

export default GltfFeatureTextureMapping;
