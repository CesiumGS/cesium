import defined from "../../Core/defined.js";
import BatchTexture from "../BatchTexture.js";
import Cesium3DTileFeature from "../Cesium3DTileFeature.js";

function ModelFeature(featureTable, featureId) {
  this._featureTable = featureTable;
  this._featureId = featureId;
  this._color = undefined;
}

export default function ModelFeatureTable(model, featureTable) {
  var featuresLength = featureTable.count;
  this.featuresLength = featuresLength;

  this.featureTable = featureTable;

  this.model = model;

  var content = model._content;
  this.content = content;

  this._features = undefined;
  this._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    content: defined(content) ? content : model,
  });

  initialize(this);
}

function initialize(featureTable) {
  var featuresLength = featureTable.featuresLength;
  var features = new Array(featuresLength);
  for (var i = 0; i < featuresLength; i++) {
    features[i] = new ModelFeature();
  }
}

ModelFeatureTable.prototype.getPickColor = function (featureId) {
  return this._batchTexture.setColor(featureId);
};

ModelFeatureTable.prototype.setColor = function (featureId, color) {
  this._batchTexture.setColor(featureId, color);
};

ModelFeatureTable.prototype.getColor = function (featureId, result) {
  return this._batchTexture.getColor(featureId, result);
};

ModelFeatureTable.prototype.update = function (frameState) {
  this._batchTexture.update(this.model, frameState);
};

ModelFeatureTable.prototype.getProperty = function (featureId, name) {
  if (defined(this.featureTable._metadataTable)) {
    var metadataTable = this.featureTable._metadataTable;
    if (metadataTable.hasProperty(name)) {
      return metadataTable.getProperty(featureId, name);
    }
  }
  return undefined;
};

ModelFeatureTable.prototype.getFeature = function (featureId) {
  return this._features[featureId];
};
