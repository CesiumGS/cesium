import BatchTexture from "../BatchTexture.js";
import ModelFeature from "./ModelFeature.js";

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
