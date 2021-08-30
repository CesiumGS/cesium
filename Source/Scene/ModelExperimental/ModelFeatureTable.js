import BatchTexture from "../BatchTexture.js";
import ModelFeature from "./ModelFeature.js";

export default function ModelFeatureTable(options) {
  this._featureTable = options.featureTable;
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
    content: this,
    statistics: modelFeatureTable._statistics,
  });
}

ModelFeatureTable.prototype.update = function (frameState) {
  this._batchTexture.update(frameState);
};
