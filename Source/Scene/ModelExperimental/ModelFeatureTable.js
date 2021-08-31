import BatchTexture from "../BatchTexture.js";
import ModelFeature from "./ModelFeature.js";
import destroyObject from "../../Core/destroyObject.js";

/**
 * Manages the {@link ModelFeature}s in a {@link ModelExperimental}.
 * Extracts the properties from a {@link FeatureTable}.
 *
 * @param {Object} options:
 * @param {ModelExperimental} model The model that owns this feature table.
 * @param {FeatureTable} featureTable The feature table from the model used to initialize the model.
 *
 * @alias ModelFeatureTable
 * @constructor
 *
 * @private
 */
export default function ModelFeatureTable(options) {
  this._featureTable = options.featureTable;
  this._model = options.model;
  this._features = undefined;
  this._featuresLength = 0;

  this._batchTexture = undefined;

  this._table = options.featureTable._metadataTable;

  initialize(this);
}

function initialize(modelFeatureTable) {
  var featuresLength = modelFeatureTable._featureTable.count;
  if (featuresLength === 0) {
    return;
  }

  var features = new Array(featuresLength);
  for (var i = 0; i < featuresLength; i++) {
    features[i] = new ModelFeature({
      model: modelFeatureTable._model,
      featureId: i,
      content: modelFeatureTable,
    });
  }

  modelFeatureTable._features = features;
  modelFeatureTable._featuresLength = featuresLength;
  modelFeatureTable._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    content: modelFeatureTable,
    statistics: modelFeatureTable._statistics,
  });
}

/**
 * Creates/updates the batch texture.
 *
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
ModelFeatureTable.prototype.update = function (frameState) {
  this._batchTexture.update(undefined, frameState);
};

/**
 * Gets the {@link ModelFeature} with the given <code>featureId</code>.
 *
 * @param {featureId} Number The ID of the feature selected or picked.
 *
 * @returns {ModelFeature} The model feature.
 *
 * @private
 */
ModelFeatureTable.prototype.getFeature = function (featureId) {
  return this._features[featureId];
};

/**
 * Gets the property value for the feature with the given feature ID.
 *
 * @param {featureId} Number The ID of the feature selected or picked.
 * @param {name} String The property name.
 *
 * @returns {Object}
 *
 * @private
 */
ModelFeatureTable.prototype.getProperty = function (featureId, name) {
  return this._table.getProperty(featureId, name);
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
 * @see ModelFeatureTable#destroy
 * @private
 */
ModelFeatureTable.prototype.isDestroyed = function () {
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
 * @see ModelFeatureTable#isDestroyed
 * @private
 */
ModelFeatureTable.prototype.destroy = function (frameState) {
  this._batchTexture.destroy();
  destroyObject(this);
};
