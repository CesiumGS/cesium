import defaultValue from "../../Core/defaultValue.js";
import destroyObject from "../../Core/destroyObject.js";
import BatchTexture from "../BatchTexture.js";
import defined from "../../Core/defined.js";
import Color from "../../Core/Color.js";

var DEFAULT_COLOR_VALUE = BatchTexture.DEFAULT_COLOR_VALUE;
var DEFAULT_SHOW_VALUE = BatchTexture.DEFAULT_SHOW_VALUE;

export default function ModelFeatureTable(model, featureTable) {
  var featuresLength = featureTable.count;
  this.featuresLength = featuresLength;
  this.featureTable = featureTable;
  this.model = model;

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

// TODO: Add support for getPropertyBySemantic
ModelFeatureTable.prototype.getProperty = function (batchId, name) {
  // TODO: Add support for other types of tables.
  if (defined(this.featureTable._metadataTable)) {
    var metadataTable = this.featureTable._metadataTable;
    if (metadataTable.hasProperty(name)) {
      return metadataTable.getProperty(batchId, name);
    }
  }

  return undefined;
};

var scratchColor = new Color();

ModelFeatureTable.prototype.applyStyle = function (style) {
  var model = this.model;
  var length = this.featuresLength;
  for (var i = 0; i < length; ++i) {
    var feature = model.getFeature(i);
    var color = defined(style.color)
      ? defaultValue(
          style.color.evaluateColor(feature, scratchColor),
          DEFAULT_COLOR_VALUE
        )
      : DEFAULT_COLOR_VALUE;
    var show = defined(style.show)
      ? defaultValue(style.show.evaluate(feature), DEFAULT_SHOW_VALUE)
      : DEFAULT_SHOW_VALUE;
    this.setColor(i, color);
    this.setShow(i, show);
  }

  model.hasStyle = true;

  // Tell the model to make new draw commands.
  model._drawCommandsCreated = false;
  model._sceneGraph._drawCommands = [];
};
