import BatchTexture from "../BatchTexture.js";
import Color from "../../Core/Color.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import ModelFeature from "./ModelFeature.js";

/**
 * Manages the {@link ModelFeature}s in a {@link ModelExperimental}.
 * Extracts the properties from a {@link FeatureTable}.
 *
 * @param {Object} options:
 * @param {ModelExperimental} options.model The model that owns this feature table.
 * @param {FeatureTable} options.featureTable The feature table from the model used to initialize the model.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to.
 *
 * @alias ModelFeatureTable
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ModelFeatureTable(options) {
  this._featureTable = options.featureTable;
  this._model = options.model;
  this._content = options.content;
  this._features = undefined;
  this._featuresLength = 0;

  this._batchTexture = undefined;

  // At the moment, only the metadata table is supported.
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
      content: defined(modelFeatureTable._content)
        ? modelFeatureTable._content
        : modelFeatureTable,
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
 * @private
 */
ModelFeatureTable.prototype.getPropertyInherited = function (
  content,
  featureId,
  name
) {
  var value;
  var table = this._table;
  if (defined(this)) {
    value = table.getProperty(featureId, name);
    if (defined(value)) {
      return value;
    }
  }

  if (!defined(content)) {
    return;
  }

  var tileMetadata = content.tile.metadata;
  if (defined(tileMetadata)) {
    value = tileMetadata.getPropertyBySemantic(name);
    if (defined(value)) {
      return value;
    }

    value = tileMetadata.getProperty(name);
    if (defined(value)) {
      return value;
    }
  }

  var groupMetadata = content.groupMetadata;
  if (defined(groupMetadata)) {
    value = groupMetadata.getPropertyBySemantic(name);
    if (defined(value)) {
      return value;
    }

    value = groupMetadata.getProperty(name);
    if (defined(value)) {
      return value;
    }
  }

  var tilesetMetadata = content.tileset.metadata;
  if (defined(tilesetMetadata) && defined(tilesetMetadata.tileset)) {
    tilesetMetadata = tilesetMetadata.tileset;
    value = tilesetMetadata.getPropertyBySemantic(name);
    if (defined(value)) {
      return value;
    }

    value = tilesetMetadata.getProperty(name);
    if (defined(value)) {
      return value;
    }
  }

  return undefined;
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
ModelFeatureTable.prototype.destroy = function () {
  this._batchTexture.destroy();
  destroyObject(this);
};

ModelFeatureTable.prototype.setShow = function (featureId, show) {
  this._batchTexture.setShow(featureId, show);
};

ModelFeatureTable.prototype.setAllShow = function (show) {
  this._batchTexture.setAllShow(show);
};

ModelFeatureTable.prototype.getShow = function (featureId) {
  return this._batchTexture.getShow(featureId);
};

ModelFeatureTable.prototype.setColor = function (featureId, color) {
  this._batchTexture.setColor(featureId, color);
};

ModelFeatureTable.prototype.setAllColor = function (color) {
  this._batchTexture.setAllColor(color);
};

ModelFeatureTable.prototype.getColor = function (featureId, result) {
  return this._batchTexture.getColor(featureId, result);
};

var scratchColor = new Color();
ModelFeatureTable.prototype.applyStyle = function (style) {
  // TODO: Handle style === undefined

  for (var i = 0; i < this._featuresLength; i++) {
    var feature = this.getFeature(i);
    var color = defined(style.color)
      ? defaultValue(
          style.color.evaluateColor(feature, scratchColor),
          BatchTexture.DEFAULT_COLOR_VALUE
        )
      : BatchTexture.DEFAULT_COLOR_VALUE;
    var show = defined(style.show)
      ? defaultValue(
          style.show.evaluate(feature),
          BatchTexture.DEFAULT_SHOW_VALUE
        )
      : BatchTexture.DEFAULT_SHOW_VALUE;
    this.setColor(i, color);
    this.setShow(i, show);
  }

  var model = this._model;
  model._hasStyle = true;
  model.resetDrawCommands();
};
