import BatchTexture from "../BatchTexture.js";
import Cesium3DTileFeature from "../Cesium3DTileFeature.js";
import Check from "../../Core/Check.js";
import destroyObject from "../../Core/destroyObject.js";

/**
 * Manages the {@link Cesium3DTileFeature}s that belong to a {@link Cesium3DTileContent}.
 * The properties for a feature are extracted from a {@link FeatureTable}.
 *
 * @param {Object} options An object containing the following options:
 * @param {Cesium3DTileContent} options.content The tile content this features in this table belong to.
 * @param {FeatureTable} options.featureTable The feature table from the model belonging to the content.
 *
 * @alias Cesium3DTileContentFeatureTable
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function Cesium3DTileContentFeatureTable(options) {
  var content = options.content;
  var featureTable = options.featureTable;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.content", content);
  Check.typeOf.object("options.featureTable", featureTable);
  //>>includeEnd('debug');

  this._content = content;
  this._featureTable = featureTable;

  this._featuresLength = 0;
  this._features = undefined;

  this._batchTexture = undefined;

  initialize(this);
}

Object.defineProperties(Cesium3DTileContentFeatureTable.prototype, {
  /**
   * The batch texture generated for the features in this table.
   *
   * @memberof Cesium3DTileContentFeatureTable.prototype
   * @type {BatchTexture}
   * @readonly
   * @private
   */
  batchTexture: {
    get: function () {
      return this._batchTexture;
    },
  },
  /**
   * The number of features in this table.
   *
   * @memberof Cesium3DTileContentFeatureTable.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  featuresLength: {
    get: function () {
      return this._featuresLength;
    },
  },
});

function initialize(contentFeatureTable) {
  var featuresLength = contentFeatureTable._featureTable.count;
  if (featuresLength === 0) {
    return;
  }

  var content = contentFeatureTable._content;

  var features = new Array(featuresLength);
  for (var i = 0; i < featuresLength; i++) {
    features[i] = new Cesium3DTileFeature(content, i);
  }

  contentFeatureTable._featuresLength = featuresLength;
  contentFeatureTable._features = features;

  contentFeatureTable._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    owner: content,
    statistics: content.tileset.statistics,
  });
}

Cesium3DTileContentFeatureTable.prototype.getFeature = function (featureId) {
  return this._features[featureId];
};

Cesium3DTileContentFeatureTable.prototype.hasProperty = function (
  featureId,
  propertyName
) {
  return this._featureTable.hasProperty(featureId, propertyName);
};

Cesium3DTileContentFeatureTable.prototype.getProperty = function (
  featureId,
  name
) {
  return this._featureTable.getProperty(featureId, name);
};

Cesium3DTileContentFeatureTable.prototype.getPropertyInherited = function (
  featureId,
  name
) {
  return this._featureTable.getProperty(featureId, name);
};

Cesium3DTileContentFeatureTable.prototype.getPropertyNames = function (
  results
) {
  return this._featureTable.getPropertyIds(results);
};

Cesium3DTileContentFeatureTable.prototype.setProperty = function (
  featureId,
  name,
  value
) {
  return this._featureTable.setProperty(featureId, name, value);
};

Cesium3DTileContentFeatureTable.prototype.update = function (frameState) {
  this._batchTexture.update(this._content.tileset, frameState);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Cesium3DTileContentFeatureTable#destroy
 * @private
 */
Cesium3DTileContentFeatureTable.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * e = e && e.destroy();
 *
 * @see Cesium3DTileContentFeatureTable#isDestroyed
 * @private
 */
Cesium3DTileContentFeatureTable.prototype.destroy = function (frameState) {
  this._batchTexture.destroy();
  destroyObject(this);
};
