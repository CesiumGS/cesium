import destroyObject from "../../Core/destroyObject.js";
import BatchTexture from "../BatchTexture.js";

export default function ModelFeatureTable(model, featureTable) {
  var featuresLength = featureTable.count;
  this.featuresLength = featuresLength;
  this.featureTable = featureTable;

  // TODO: Classification also uses the colorChangedCallback
  this._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    content: model,
  });
}

ModelFeatureTable.prototype.setShow = function (batchId, show) {
  this._batchTexture.setShow(batchId, show);
};

ModelFeatureTable.prototype.setAllShow = function (show) {
  this._batchTexture.setAllShow(show);
};

ModelFeatureTable.prototype.getShow = function (batchId) {
  return this._batchTexture.getShow(batchId);
};

ModelFeatureTable.prototype.setColor = function (batchId, color) {
  this._batchTexture.setColor(batchId, color);
};

ModelFeatureTable.prototype.setAllColor = function (color) {
  this._batchTexture.setAllColor(color);
};

ModelFeatureTable.prototype.getColor = function (batchId, result) {
  return this._batchTexture.getColor(batchId, result);
};

ModelFeatureTable.prototype.getPickColor = function (batchId) {
  return this._batchTexture.getPickColor(batchId);
};

ModelFeatureTable.prototype.update = function (frameState) {
  this._batchTexture.update(undefined, frameState);
};

ModelFeatureTable.prototype.isDestroyed = function () {
  return false;
};

ModelFeatureTable.prototype.destroy = function () {
  this._batchTexture = this._batchTexture && this._batchTexture.destroy();
  return destroyObject(this);
};
