import BatchTexture from "../BatchTexture.js";
import Cesium3DTileFeature from "../Cesium3DTileFeature.js";
import Check from "../../Core/Check.js";
import Color from "../../Core/Color.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import ModelFeature from "./ModelFeature.js";
import defaultValue from "../../Core/defaultValue.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";
import ModelType from "./ModelType.js";

/**
 * Manages the {@link ModelFeature}s in a {@link Model}.
 * Extracts the properties from a {@link PropertyTable}.
 *
 * @param {object} options An object containing the following options:
 * @param {Model} options.model The model that owns this feature table.
 * @param {PropertyTable} options.propertyTable The property table from the model used to initialize the model.
 *
 * @alias ModelFeatureTable
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function ModelFeatureTable(options) {
  const model = options.model;
  const propertyTable = options.propertyTable;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("propertyTable", propertyTable);
  Check.typeOf.object("model", model);
  //>>includeEnd('debug');

  this._propertyTable = propertyTable;
  this._model = model;

  this._features = undefined;
  this._featuresLength = 0;

  this._batchTexture = undefined;

  this._styleCommandsNeededDirty = false;
  this._styleCommandsNeeded = StyleCommandsNeeded.ALL_OPAQUE;

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
   * @type {number}
   * @readonly
   *
   * @private
   */
  featuresLength: {
    get: function () {
      return this._featuresLength;
    },
  },

  /**
   * Size of the batch texture. This does not count the property table size
   * as that is counted separately through StructuralMetadata.
   *
   * @memberof ModelFeatureTable.prototype
   *
   * @type {number}
   * @readonly
   *
   * @private
   */
  batchTextureByteLength: {
    get: function () {
      if (defined(this._batchTexture)) {
        return this._batchTexture.byteLength;
      }

      return 0;
    },
  },

  /**
   * A flag to indicate whether or not the types of style commands needed by this feature table have changed.
   *
   * @memberof ModelFeatureTable.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @private
   */
  styleCommandsNeededDirty: {
    get: function () {
      return this._styleCommandsNeededDirty;
    },
  },
});

function initialize(modelFeatureTable) {
  const model = modelFeatureTable._model;
  const is3DTiles = ModelType.is3DTiles(model.type);

  const featuresLength = modelFeatureTable._propertyTable.count;
  if (featuresLength === 0) {
    return;
  }

  let i;
  const features = new Array(featuresLength);
  if (is3DTiles) {
    const content = model.content;
    for (i = 0; i < featuresLength; i++) {
      features[i] = new Cesium3DTileFeature(content, i);
    }
  } else {
    for (i = 0; i < featuresLength; i++) {
      features[i] = new ModelFeature({
        model: model,
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
    statistics: is3DTiles ? model.content.tileset.statistics : undefined,
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
  // Assume the number of translucent features has not changed.
  this._styleCommandsNeededDirty = false;
  this._batchTexture.update(undefined, frameState);

  const currentStyleCommandsNeeded = StyleCommandsNeeded.getStyleCommandsNeeded(
    this._featuresLength,
    this._batchTexture.translucentFeaturesLength
  );

  if (this._styleCommandsNeeded !== currentStyleCommandsNeeded) {
    this._styleCommandsNeededDirty = true;
    this._styleCommandsNeeded = currentStyleCommandsNeeded;
  }
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

ModelFeatureTable.prototype.hasPropertyBySemantic = function (
  featureId,
  propertyName
) {
  return this._propertyTable.hasPropertyBySemantic(featureId, propertyName);
};

ModelFeatureTable.prototype.getProperty = function (featureId, name) {
  return this._propertyTable.getProperty(featureId, name);
};

ModelFeatureTable.prototype.getPropertyBySemantic = function (
  featureId,
  semantic
) {
  return this._propertyTable.getPropertyBySemantic(featureId, semantic);
};

ModelFeatureTable.prototype.getPropertyIds = function (results) {
  return this._propertyTable.getPropertyIds(results);
};

ModelFeatureTable.prototype.setProperty = function (featureId, name, value) {
  return this._propertyTable.setProperty(featureId, name, value);
};

ModelFeatureTable.prototype.isClass = function (featureId, className) {
  return this._propertyTable.isClass(featureId, className);
};

ModelFeatureTable.prototype.isExactClass = function (featureId, className) {
  return this._propertyTable.isExactClass(featureId, className);
};

ModelFeatureTable.prototype.getExactClassName = function (featureId) {
  return this._propertyTable.getExactClassName(featureId);
};

const scratchColor = new Color();
/**
 * @private
 */
ModelFeatureTable.prototype.applyStyle = function (style) {
  if (!defined(style)) {
    this.setAllColor(BatchTexture.DEFAULT_COLOR_VALUE);
    this.setAllShow(BatchTexture.DEFAULT_SHOW_VALUE);
    return;
  }

  for (let i = 0; i < this._featuresLength; i++) {
    const feature = this.getFeature(i);
    const color = defined(style.color)
      ? defaultValue(
          style.color.evaluateColor(feature, scratchColor),
          BatchTexture.DEFAULT_COLOR_VALUE
        )
      : BatchTexture.DEFAULT_COLOR_VALUE;
    const show = defined(style.show)
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
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
  this._batchTexture = this._batchTexture && this._batchTexture.destroy();
  destroyObject(this);
};

export default ModelFeatureTable;
