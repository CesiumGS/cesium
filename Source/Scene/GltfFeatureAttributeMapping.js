import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import GltfFeatureMetadataUtility from "./GltfFeatureMetadataUtility.js";
import when from "../ThirdParty/when.js";

/**
 * Feature mapping from an attribute to a feature table.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {Object} options.primitive The primitive JSON object from the glTF.
 * @param {Object} options.featureMapping The feature mapping JSON object from the glTF.
 * @param {GltfFeatureTable} options.featureTable The feature table.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureAttributeMapping
 * @constructor
 *
 * @private
 */
function GltfFeatureAttributeMapping(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var primitive = options.primitive;
  var featureMapping = options.featureMapping;
  var featureTable = options.featureTable;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.featureMapping", featureMapping);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var featureIds = getFeatureIds(
    this,
    featureMapping.featureIds,
    gltfContainer,
    primitive,
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

Object.defineProperties(GltfFeatureAttributeMapping.prototype, {
  /**
   * Promise that resolves when the feature mapping is ready.
   *
   * @memberof GltfFeatureAttributeMapping.prototype
   * @type {Promise.<GltfFeatureAttributeMapping>}
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
  primitive,
  cache
) {
  var attribute = featureIdsObject.attribute;
  var constant = featureIdsObject.constant;
  var vertexStride = featureIdsObject.vertexStride;

  var featureIds = new FeatureIds({
    constant: constant,
    vertexStride: vertexStride,
    typedArray: undefined,
    cacheItem: undefined,
    readyPromise: undefined,
  });

  if (defined(attribute)) {
    var gltf = gltfContainer.gltf;
    var attributes = primitive.attributes;
    var accessorId = attributes[attribute];
    var accessor = gltf.accessors[accessorId];
    var bufferId = GltfFeatureMetadataUtility.getAccessorBufferId(
      gltf,
      accessor
    );

    if (defined(bufferId)) {
      var buffer = gltf.buffers[bufferId];
      featureIds.readyPromise = cache
        .getBuffer({
          gltfContainer: gltfContainer,
          buffer: buffer,
          bufferId: bufferId,
        })
        .then(function (cacheItem) {
          if (featureMapping.isDestroyed()) {
            // The feature mapping was destroyed before the request came back
            cache.releaseCacheItem(cacheItem);
            return;
          }
          featureIds.cacheItem = cacheItem;
          var bufferData = cacheItem.contents;
          if (defined(bufferData)) {
            featureIds.typedArray = GltfFeatureMetadataUtility.getTypedArrayForAccessor(
              gltf,
              accessor,
              bufferData
            );
          }
          return featureIds;
        });
    }
  } else {
    featureIds.readyPromise = when.resolve(featureIds);
  }

  return featureIds;
}

function FeatureIds(options) {
  this.constant = options.constant;
  this.vertexStride = options.vertexStride;
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
 * @see GltfFeatureAttributeMapping#destroy
 *
 * @private
 */
GltfFeatureAttributeMapping.prototype.isDestroyed = function () {
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
 * @see GltfFeatureAttributeMapping#isDestroyed
 *
 * @private
 */
GltfFeatureAttributeMapping.prototype.destroy = function () {
  var cache = this._cache;
  var featureIds = this._featureIds;

  if (defined(featureIds) && defined(featureIds.cacheItem)) {
    cache.releaseCacheItem(featureIds.cacheItem);
  }

  return destroyObject(this);
};

export default GltfFeatureAttributeMapping;
