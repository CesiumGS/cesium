import defined from "../../Core/defined.js";
import BatchTexture from "../BatchTexture.js";

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
}

ModelFeatureTable.prototype.update = function (frameState) {
  this._batchTexture.update(this.content._tileset, frameState);
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
