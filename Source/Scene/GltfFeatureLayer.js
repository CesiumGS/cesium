import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";

/**
 * Feature layer in a primitive's feature metadata extension.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {Object} options.primitive The primitive JSON object from the glTF.
 * @param {Object} options.featureLayer The feature layer JSON object from the glTF.
 * @param {GltfFeatureTable} options.featureTable The feature table.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureLayer
 * @constructor
 *
 * @private
 */
function GltfFeatureLayer(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var primitive = options.primitive;
  var featureLayer = options.featureLayer;
  var featureTable = options.featureTable;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.featureLayer", featureLayer);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var featureIds = featureLayer.featureIds;
  var textureAccessor = featureIds.textureAccessor;
  var attributeName = featureIds.attribute;

  var readyPromise;
  var textureFeatureIds;
  var attributeFeatureIds;

  if (defined(textureAccessor)) {
    textureFeatureIds = getTextureFeatureIds(
      this,
      gltf,
      textureAccessor,
      cache
    );
    readyPromise = textureFeatureIds.readyPromise;
  } else {
    attributeFeatureIds = getAttributeFeatureIds(
      this,
      gltf,
      primitive,
      attributeName,
      cache
    );
    readyPromise = attributeFeatureIds.readyPromise;
  }

  var that = this;
  readyPromise = readyPromise.then(function () {
    return featureTable.readyPromise.then(function () {
      return that;
    });
  });

  this._featureTable = featureTable;
  this._textureFeatureIds = textureFeatureIds;
  this._attributeFeatureIds = attributeFeatureIds;
  this._cache = cache;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureLayer.prototype, {
  /**
   * Promise that resolves when the feature layer is ready.
   *
   * @memberof GltfFeatureLayer.prototype
   * @type {Promise.<GltfFeatureLayer>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

function getTextureFeatureIds(featureLayer, gltf, textureAccessor, cache) {
  // Clone so that this object doesn't hold on to a reference to the gltf JSON
  textureAccessor = clone(textureAccessor, true);

  var textureFeatureIds = new TextureFeatureIds({
    textureAccessor: textureAccessor,
    imageData: undefined,
    cacheItem: undefined,
    readyPromise: undefined,
  });

  var textureInfo = textureAccessor.texture;
  var textureId = textureInfo.index;
  var texture = gltf.textures[textureId];

  textureFeatureIds.readyPromise = cache
    .getTexture({
      gltf: gltf,
      texture: texture,
    })
    .then(function (cacheItem) {
      if (featureLayer.isDestroyed()) {
        // The feature layer was destroyed before the request came back
        cache.releaseCacheItem(cacheItem);
      }
      var imageData = cacheItem.contents;
      textureFeatureIds.imageData = imageData;
      textureFeatureIds.cacheItem = cacheItem;
    });

  return textureFeatureIds;
}

function getAttributeFeatureIds(
  featureLayer,
  gltf,
  primitive,
  attributeName,
  cache
) {
  var attributes = primitive.attributes;
  var accessor = attributes[attributeName];
  var buffer = GltfFeatureMetadataUtility.getAccessorBuffer(gltf, accessor);

  var attributeFeatureIds = new AttributeFeatureIds({
    initializedWithZeroes: !defined(buffer),
    typedArray: undefined,
    cacheItem: undefined,
    readyPromise: undefined,
  });

  if (defined(buffer)) {
    attributeFeatureIds.readyPromise = cache
      .getBuffer({
        buffer: buffer,
      })
      .then(function (cacheItem) {
        if (featureLayer.isDestroyed()) {
          // The feature layer was destroyed before the request came back
          cache.releaseCacheItem(cacheItem);
        }
        var bufferData = cacheItem.contents;
        attributeFeatureIds.cacheItem = cacheItem;
        attributeFeatureIds.typedArray = GltfFeatureMetadataUtility.getTypedArrayForAccessor(
          gltf,
          accessor,
          bufferData
        );
      });
  }

  return attributeFeatureIds;
}

function TextureFeatureIds(options) {
  this.textureAccessor = options.textureAccessor;
  this.imageData = options.imageData;
  this.cacheItem = options.cacheItem;
  this.readyPromise = options.readyPromise;
}

function AttributeFeatureIds(options) {
  this.initializedWithZeroes = options.initializedWithZeroes;
  this.typedArray = options.typedArray;
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
 * @see GltfFeatureLayer#destroy
 *
 * @private
 */
GltfFeatureLayer.prototype.isDestroyed = function () {
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
 * @see GltfFeatureLayer#isDestroyed
 *
 * @private
 */
GltfFeatureLayer.prototype.destroy = function () {
  var cache = this._cache;
  var textureFeatureIds = this._textureFeatureIds;
  var attributeFeatureIds = this._attributeFeatureIds;

  if (defined(textureFeatureIds.cacheItem)) {
    cache.releaseCacheItem({
      cacheItem: textureFeatureIds.cacheItem,
    });
  }

  if (defined(attributeFeatureIds.cacheItem)) {
    cache.releaseCacheItem({
      cacheItem: attributeFeatureIds.cacheItem,
    });
  }

  return destroyObject(this);
};

export default GltfFeatureLayer;
