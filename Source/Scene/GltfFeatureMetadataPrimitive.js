import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import GltfFeatureLayer from "./GltfFeatureLayer.js";
import when from "../ThirdParty/when.js";

/**
 * A primitive contain feature layers.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {Object} options.primitive The primitive JSON object from the glTF
 * @param {GltfFeatureTable[]} options.featureTables An array of feature tables.
 * @param {Number} options.meshId The mesh ID.
 * @param {Number} options.primitive The primitive ID.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTable
 * @constructor
 *
 * @private
 */
function GltfFeatureMetadataPrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var primitive = options.primitive;
  var featureTables = options.featureTables;
  var meshId = options.meshId;
  var primitiveId = options.primitiveId;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.primitive", primitive);
  Check.defined("options.featureTables", featureTables);
  Check.typeOf.number("options.meshId", meshId);
  Check.typeOf.number("options.primitiveId", primitiveId);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var extensions = primitive.extensions;
  var featureMetadataExtension = extensions.EXT_3dtiles_feature_metadata;
  var featureLayers = featureMetadataExtension.featureLayers;
  var featureLayersLength = featureLayers.length;
  var layers = new Array(featureLayersLength);
  for (var i = 0; i < featureLayersLength; ++i) {
    var featureLayer = featureLayers[i];
    var featureTable = featureTables[featureLayer.featureTable];
    layers[i] = new GltfFeatureLayer({
      gltf: gltf,
      primitive: primitive,
      featureLayer: featureLayer,
      featureTable: featureTable,
      cache: cache,
    });
  }

  var that = this;
  var readyPromise = when
    .all(
      layers.map(function (featureLayer) {
        return featureLayer.readyPromise;
      })
    )
    .then(function () {
      return that;
    });

  this._featureLayers = layers;
  this._meshId = meshId;
  this._primitiveId = primitiveId;
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureMetadataPrimitive.prototype, {
  /**
   * Feature layers contained by the primitive.
   *
   * @memberof GltfFeatureLayer.prototype
   * @type {Promise.<GltfFeatureLayer>}
   * @readonly
   * @private
   */
  featureLayers: {
    get: function () {
      return this._featureLayers;
    },
  },

  /**
   * Promise that resolves when the primitive is ready.
   *
   * @memberof GltfFeatureMetadataPrimitive.prototype
   * @type {Promise.<GltfFeatureMetadataPrimitive>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfFeatureMetadataPrimitive#destroy
 *
 * @private
 */
GltfFeatureMetadataPrimitive.prototype.isDestroyed = function () {
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
 * @see GltfFeatureMetadataPrimitive#isDestroyed
 *
 * @private
 */
GltfFeatureMetadataPrimitive.prototype.destroy = function () {
  this._featureLayers.forEach(function (featureLayer) {
    featureLayer.destroy();
  });

  return destroyObject(this);
};

export default GltfFeatureMetadataPrimitive;
