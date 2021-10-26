import BatchTexture from "../BatchTexture.js";
import Cesium3DTileFeature from "../Cesium3DTileFeature.js";
import Check from "../../Core/Check.js";
import Color from "../../Core/Color.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import ModelFeature from "./ModelFeature.js";
import defaultValue from "../../Core/defaultValue.js";

/**
 * Manages the {@link ModelFeature}s in a {@link ModelExperimental}.
 * Extracts the properties from a {@link PropertyTable}.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelExperimental} options.model The model that owns this feature table.
 * @param {PropertyTable} options.propertyTable The property table from the model used to initialize the model.
 *
 * @alias ModelFeatureTable
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ModelFeatureTable(options) {
  var model = options.model;
  var propertyTable = options.propertyTable;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("propertyTable", propertyTable);
  Check.typeOf.object("model", model);
  //>>includeEnd('debug');

  this._propertyTable = propertyTable;
  this._model = model;

  this._features = undefined;
  this._featuresLength = 0;

  this._batchTexture = undefined;

  initialize(this);
}

Object.defineProperties(ModelFeatureTable.prototype, {
  /**
   * The batch texture created for the features in this table.
   *
   * @memberof ModelFeatureTable.prototype
   *
   * @type {BatchTexture}
   * @readonly
   *
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
   * @memberof ModelFeatureTable.prototype
   *
   * @type {Number}
   * @readonly
   *
   * @private
   */
  featuresLength: {
    get: function () {
      return this._featuresLength;
    },
  },
});

function initialize(modelFeatureTable) {
  var content = modelFeatureTable._model.content;
  var hasContent = defined(content);

  var featuresLength = modelFeatureTable._propertyTable.count;
  if (featuresLength === 0) {
    return;
  }

  var features = new Array(featuresLength);
  for (var i = 0; i < featuresLength; i++) {
    if (hasContent) {
      features[i] = new Cesium3DTileFeature(content, i);
    } else {
      features[i] = new ModelFeature({
        model: modelFeatureTable._model,
        featureId: i,
        featureTable: modelFeatureTable,
      });
    }
  }

  modelFeatureTable._features = features;
  modelFeatureTable._featuresLength = featuresLength;

  modelFeatureTable._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    owner: modelFeatureTable,
    statistics: hasContent
      ? content.tileset.statistics
      : modelFeatureTable._statistics,
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

ModelFeatureTable.prototype.getPickColor = function (featureId) {
  return this._batchTexture.getPickColor(featureId);
};

ModelFeatureTable.prototype.getFeature = function (featureId) {
  return this._features[featureId];
};

ModelFeatureTable.prototype.hasProperty = function (featureId, propertyName) {
  return this._propertyTable.hasProperty(featureId, propertyName);
};

ModelFeatureTable.prototype.getProperty = function (featureId, name) {
  return this._propertyTable.getProperty(featureId, name);
};

ModelFeatureTable.prototype.getPropertyNames = function (results) {
  return this._propertyTable.getPropertyIds(results);
};

ModelFeatureTable.prototype.setProperty = function (featureId, name, value) {
  return this._propertyTable.setProperty(featureId, name, value);
};

var scratchColor = new Color();
ModelFeatureTable.prototype.applyStyle = function (style) {
  var model = this._model;

  if (!defined(style)) {
    model.style = undefined;
    this.setAllColor(BatchTexture.DEFAULT_COLOR_VALUE);
    this.setAllShow(BatchTexture.DEFAULT_SHOW_VALUE);
    return;
  }

  model.style = style;
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
