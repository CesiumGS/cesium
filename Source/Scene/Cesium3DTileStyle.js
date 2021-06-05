import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import when from "../ThirdParty/when.js";
import ConditionsExpression from "./ConditionsExpression.js";
import Expression from "./Expression.js";

/**
 * A style that is applied to a {@link Cesium3DTileset}.
 * <p>
 * Evaluates an expression defined using the
 * {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification/Styling|3D Tiles Styling language}.
 * </p>
 *
 * @alias Cesium3DTileStyle
 * @constructor
 *
 * @param {Resource|String|Object} [style] The url of a style or an object defining a style.
 *
 * @example
 * tileset.style = new Cesium.Cesium3DTileStyle({
 *     color : {
 *         conditions : [
 *             ['${Height} >= 100', 'color("purple", 0.5)'],
 *             ['${Height} >= 50', 'color("red")'],
 *             ['true', 'color("blue")']
 *         ]
 *     },
 *     show : '${Height} > 0',
 *     meta : {
 *         description : '"Building id ${id} has height ${Height}."'
 *     }
 * });
 *
 * @example
 * tileset.style = new Cesium.Cesium3DTileStyle({
 *     color : 'vec4(${Temperature})',
 *     pointSize : '${Temperature} * 2.0'
 * });
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification/Styling|3D Tiles Styling language}
 */
function Cesium3DTileStyle(style) {
  this._style = {};
  this._ready = false;

  this._show = undefined;
  this._color = undefined;
  this._pointSize = undefined;
  this._pointOutlineColor = undefined;
  this._pointOutlineWidth = undefined;
  this._labelColor = undefined;
  this._labelOutlineColor = undefined;
  this._labelOutlineWidth = undefined;
  this._font = undefined;
  this._labelStyle = undefined;
  this._labelText = undefined;
  this._backgroundColor = undefined;
  this._backgroundPadding = undefined;
  this._backgroundEnabled = undefined;
  this._scaleByDistance = undefined;
  this._translucencyByDistance = undefined;
  this._distanceDisplayCondition = undefined;
  this._heightOffset = undefined;
  this._anchorLineEnabled = undefined;
  this._anchorLineColor = undefined;
  this._image = undefined;
  this._disableDepthTestDistance = undefined;
  this._horizontalOrigin = undefined;
  this._verticalOrigin = undefined;
  this._labelHorizontalOrigin = undefined;
  this._labelVerticalOrigin = undefined;
  this._meta = undefined;

  this._colorShaderFunction = undefined;
  this._showShaderFunction = undefined;
  this._pointSizeShaderFunction = undefined;
  this._colorShaderFunctionReady = false;
  this._showShaderFunctionReady = false;
  this._pointSizeShaderFunctionReady = false;

  this._colorShaderTranslucent = false;

  var promise;
  if (typeof style === "string" || style instanceof Resource) {
    var resource = Resource.createIfNeeded(style);
    promise = resource.fetchJson(style);
  } else {
    promise = when.resolve(style);
  }

  var that = this;
  this._readyPromise = promise.then(function (styleJson) {
    setup(that, styleJson);
    return that;
  });
}

function setup(that, styleJson) {
  styleJson = defaultValue(clone(styleJson, true), that._style);
  that._style = styleJson;

  that.show = styleJson.show;
  that.color = styleJson.color;
  that.pointSize = styleJson.pointSize;
  that.pointOutlineColor = styleJson.pointOutlineColor;
  that.pointOutlineWidth = styleJson.pointOutlineWidth;
  that.labelColor = styleJson.labelColor;
  that.labelOutlineColor = styleJson.labelOutlineColor;
  that.labelOutlineWidth = styleJson.labelOutlineWidth;
  that.labelStyle = styleJson.labelStyle;
  that.font = styleJson.font;
  that.labelText = styleJson.labelText;
  that.backgroundColor = styleJson.backgroundColor;
  that.backgroundPadding = styleJson.backgroundPadding;
  that.backgroundEnabled = styleJson.backgroundEnabled;
  that.scaleByDistance = styleJson.scaleByDistance;
  that.translucencyByDistance = styleJson.translucencyByDistance;
  that.distanceDisplayCondition = styleJson.distanceDisplayCondition;
  that.heightOffset = styleJson.heightOffset;
  that.anchorLineEnabled = styleJson.anchorLineEnabled;
  that.anchorLineColor = styleJson.anchorLineColor;
  that.image = styleJson.image;
  that.disableDepthTestDistance = styleJson.disableDepthTestDistance;
  that.horizontalOrigin = styleJson.horizontalOrigin;
  that.verticalOrigin = styleJson.verticalOrigin;
  that.labelHorizontalOrigin = styleJson.labelHorizontalOrigin;
  that.labelVerticalOrigin = styleJson.labelVerticalOrigin;

  var meta = {};
  if (defined(styleJson.meta)) {
    var defines = styleJson.defines;
    var metaJson = defaultValue(styleJson.meta, defaultValue.EMPTY_OBJECT);
    for (var property in metaJson) {
      if (metaJson.hasOwnProperty(property)) {
        meta[property] = new Expression(metaJson[property], defines);
      }
    }
  }

  that._meta = meta;

  that._ready = true;
}

function getExpression(tileStyle, value) {
  var defines = defaultValue(tileStyle._style, defaultValue.EMPTY_OBJECT)
    .defines;

  if (!defined(value)) {
    return undefined;
  } else if (typeof value === "boolean" || typeof value === "number") {
    return new Expression(String(value));
  } else if (typeof value === "string") {
    return new Expression(value, defines);
  } else if (defined(value.conditions)) {
    return new ConditionsExpression(value, defines);
  }
  return value;
}

function getJsonFromExpression(expression) {
  if (!defined(expression)) {
    return undefined;
  } else if (defined(expression.expression)) {
    return expression.expression;
  } else if (defined(expression.conditionsExpression)) {
    return clone(expression.conditionsExpression, true);
  }
  return expression;
}

Object.defineProperties(Cesium3DTileStyle.prototype, {
  /**
   * Gets the object defining the style using the
   * {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification/Styling|3D Tiles Styling language}.
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {Object}
   * @readonly
   *
   * @default {}
   *
   * @exception {DeveloperError} The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.
   */
  style: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._style;
    },
  },

  /**
   * When <code>true</code>, the style is ready and its expressions can be evaluated.  When
   * a style is constructed with an object, as opposed to a url, this is <code>true</code> immediately.
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets the promise that will be resolved when the the style is ready and its expressions can be evaluated.
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {Promise.<Cesium3DTileStyle>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>show</code> property. Alternatively a boolean, string, or object defining a show style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return or convert to a <code>Boolean</code>.
   * </p>
   * <p>
   * This expression is applicable to all tile formats.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     show : '(regExp("^Chest").test(${County})) && (${YearBuilt} >= 1970)'
   * });
   * style.show.evaluate(feature); // returns true or false depending on the feature's properties
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override show expression with a custom function
   * style.show = {
   *     evaluate : function(feature) {
   *         return true;
   *     }
   * };
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override show expression with a boolean
   * style.show = true;
   * };
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override show expression with a string
   * style.show = '${Height} > 0';
   * };
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override show expression with a condition
   * style.show = {
   *     conditions: [
   *         ['${height} > 2', 'false'],
   *         ['true', 'true']
   *     ];
   * };
   */
  show: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._show;
    },
    set: function (value) {
      this._show = getExpression(this, value);
      this._style.show = getJsonFromExpression(this._show);
      this._showShaderFunctionReady = false;
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>color</code> property. Alternatively a string or object defining a color style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Color</code>.
   * </p>
   * <p>
   * This expression is applicable to all tile formats.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     color : '(${Temperature} > 90) ? color("red") : color("white")'
   * });
   * style.color.evaluateColor(feature, result); // returns a Cesium.Color object
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override color expression with a custom function
   * style.color = {
   *     evaluateColor : function(feature, result) {
   *         return Cesium.Color.clone(Cesium.Color.WHITE, result);
   *     }
   * };
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override color expression with a string
   * style.color = 'color("blue")';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override color expression with a condition
   * style.color = {
   *     conditions : [
   *         ['${height} > 2', 'color("cyan")'],
   *         ['true', 'color("blue")']
   *     ]
   * };
   */
  color: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._color;
    },
    set: function (value) {
      this._color = getExpression(this, value);
      this._style.color = getJsonFromExpression(this._color);
      this._colorShaderFunctionReady = false;
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointSize</code> property. Alternatively a string or object defining a point size style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Number</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile or a Point Cloud tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     pointSize : '(${Temperature} > 90) ? 2.0 : 1.0'
   * });
   * style.pointSize.evaluate(feature); // returns a Number
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointSize expression with a custom function
   * style.pointSize = {
   *     evaluate : function(feature) {
   *         return 1.0;
   *     }
   * };
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointSize expression with a number
   * style.pointSize = 1.0;
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointSize expression with a string
   * style.pointSize = '${height} / 10';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointSize expression with a condition
   * style.pointSize =  {
   *     conditions : [
   *         ['${height} > 2', '1.0'],
   *         ['true', '2.0']
   *     ]
   * };
   */
  pointSize: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._pointSize;
    },
    set: function (value) {
      this._pointSize = getExpression(this, value);
      this._style.pointSize = getJsonFromExpression(this._pointSize);
      this._pointSizeShaderFunctionReady = false;
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointOutlineColor</code> property. Alternatively a string or object defining a color style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Color</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointOutlineColor expression with a string
   * style.pointOutlineColor = 'color("blue")';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointOutlineColor expression with a condition
   * style.pointOutlineColor = {
   *     conditions : [
   *         ['${height} > 2', 'color("cyan")'],
   *         ['true', 'color("blue")']
   *     ]
   * };
   */
  pointOutlineColor: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._pointOutlineColor;
    },
    set: function (value) {
      this._pointOutlineColor = getExpression(this, value);
      this._style.pointOutlineColor = getJsonFromExpression(
        this._pointOutlineColor
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointOutlineWidth</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Number</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointOutlineWidth expression with a string
   * style.pointOutlineWidth = '5';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override pointOutlineWidth expression with a condition
   * style.pointOutlineWidth = {
   *     conditions : [
   *         ['${height} > 2', '5'],
   *         ['true', '0']
   *     ]
   * };
   */
  pointOutlineWidth: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._pointOutlineWidth;
    },
    set: function (value) {
      this._pointOutlineWidth = getExpression(this, value);
      this._style.pointOutlineWidth = getJsonFromExpression(
        this._pointOutlineWidth
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelColor</code> property. Alternatively a string or object defining a color style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Color</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelColor expression with a string
   * style.labelColor = 'color("blue")';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelColor expression with a condition
   * style.labelColor = {
   *     conditions : [
   *         ['${height} > 2', 'color("cyan")'],
   *         ['true', 'color("blue")']
   *     ]
   * };
   */
  labelColor: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._labelColor;
    },
    set: function (value) {
      this._labelColor = getExpression(this, value);
      this._style.labelColor = getJsonFromExpression(this._labelColor);
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelOutlineColor</code> property. Alternatively a string or object defining a color style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Color</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelOutlineColor expression with a string
   * style.labelOutlineColor = 'color("blue")';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelOutlineColor expression with a condition
   * style.labelOutlineColor = {
   *     conditions : [
   *         ['${height} > 2', 'color("cyan")'],
   *         ['true', 'color("blue")']
   *     ]
   * };
   */
  labelOutlineColor: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._labelOutlineColor;
    },
    set: function (value) {
      this._labelOutlineColor = getExpression(this, value);
      this._style.labelOutlineColor = getJsonFromExpression(
        this._labelOutlineColor
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelOutlineWidth</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Number</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelOutlineWidth expression with a string
   * style.labelOutlineWidth = '5';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelOutlineWidth expression with a condition
   * style.labelOutlineWidth = {
   *     conditions : [
   *         ['${height} > 2', '5'],
   *         ['true', '0']
   *     ]
   * };
   */
  labelOutlineWidth: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._labelOutlineWidth;
    },
    set: function (value) {
      this._labelOutlineWidth = getExpression(this, value);
      this._style.labelOutlineWidth = getJsonFromExpression(
        this._labelOutlineWidth
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>font</code> property. Alternatively a string or object defining a string style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>String</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     font : '(${Temperature} > 90) ? "30px Helvetica" : "24px Helvetica"'
   * });
   * style.font.evaluate(feature); // returns a String
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override font expression with a custom function
   * style.font = {
   *     evaluate : function(feature) {
   *         return '24px Helvetica';
   *     }
   * };
   */
  font: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._font;
    },
    set: function (value) {
      this._font = getExpression(this, value);
      this._style.font = getJsonFromExpression(this._font);
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>label style</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>LabelStyle</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     labelStyle : '(${Temperature} > 90) ? ' + LabelStyle.FILL_AND_OUTLINE + ' : ' + LabelStyle.FILL
   * });
   * style.labelStyle.evaluate(feature); // returns a LabelStyle
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelStyle expression with a custom function
   * style.labelStyle = {
   *     evaluate : function(feature) {
   *         return LabelStyle.FILL;
   *     }
   * };
   */
  labelStyle: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._labelStyle;
    },
    set: function (value) {
      this._labelStyle = getExpression(this, value);
      this._style.labelStyle = getJsonFromExpression(this._labelStyle);
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelText</code> property. Alternatively a string or object defining a string style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>String</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     labelText : '(${Temperature} > 90) ? ">90" : "<=90"'
   * });
   * style.labelText.evaluate(feature); // returns a String
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelText expression with a custom function
   * style.labelText = {
   *     evaluate : function(feature) {
   *         return 'Example label text';
   *     }
   * };
   */
  labelText: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._labelText;
    },
    set: function (value) {
      this._labelText = getExpression(this, value);
      this._style.labelText = getJsonFromExpression(this._labelText);
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>backgroundColor</code> property. Alternatively a string or object defining a color style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Color</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override backgroundColor expression with a string
   * style.backgroundColor = 'color("blue")';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override backgroundColor expression with a condition
   * style.backgroundColor = {
   *     conditions : [
   *         ['${height} > 2', 'color("cyan")'],
   *         ['true', 'color("blue")']
   *     ]
   * };
   */
  backgroundColor: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._backgroundColor;
    },
    set: function (value) {
      this._backgroundColor = getExpression(this, value);
      this._style.backgroundColor = getJsonFromExpression(
        this._backgroundColor
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>backgroundPadding</code> property. Alternatively a string or object defining a vec2 style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Cartesian2</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override backgroundPadding expression with a string
   * style.backgroundPadding = 'vec2(5.0, 7.0)';
   * style.backgroundPadding.evaluate(feature); // returns a Cartesian2
   */
  backgroundPadding: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._backgroundPadding;
    },
    set: function (value) {
      this._backgroundPadding = getExpression(this, value);
      this._style.backgroundPadding = getJsonFromExpression(
        this._backgroundPadding
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>backgroundEnabled</code> property. Alternatively a string or object defining a boolean style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Boolean</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override backgroundEnabled expression with a string
   * style.backgroundEnabled = 'true';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override backgroundEnabled expression with a condition
   * style.backgroundEnabled = {
   *     conditions : [
   *         ['${height} > 2', 'true'],
   *         ['true', 'false']
   *     ]
   * };
   */
  backgroundEnabled: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._backgroundEnabled;
    },
    set: function (value) {
      this._backgroundEnabled = getExpression(this, value);
      this._style.backgroundEnabled = getJsonFromExpression(
        this._backgroundEnabled
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>scaleByDistance</code> property. Alternatively a string or object defining a vec4 style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Cartesian4</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override scaleByDistance expression with a string
   * style.scaleByDistance = 'vec4(1.5e2, 2.0, 1.5e7, 0.5)';
   * style.scaleByDistance.evaluate(feature); // returns a Cartesian4
   */
  scaleByDistance: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._scaleByDistance;
    },
    set: function (value) {
      this._scaleByDistance = getExpression(this, value);
      this._style.scaleByDistance = getJsonFromExpression(
        this._scaleByDistance
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>translucencyByDistance</code> property. Alternatively a string or object defining a vec4 style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Cartesian4</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override translucencyByDistance expression with a string
   * style.translucencyByDistance = 'vec4(1.5e2, 1.0, 1.5e7, 0.2)';
   * style.translucencyByDistance.evaluate(feature); // returns a Cartesian4
   */
  translucencyByDistance: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._translucencyByDistance;
    },
    set: function (value) {
      this._translucencyByDistance = getExpression(this, value);
      this._style.translucencyByDistance = getJsonFromExpression(
        this._translucencyByDistance
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>distanceDisplayCondition</code> property. Alternatively a string or object defining a vec2 style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Cartesian2</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override distanceDisplayCondition expression with a string
   * style.distanceDisplayCondition = 'vec2(0.0, 5.5e6)';
   * style.distanceDisplayCondition.evaluate(feature); // returns a Cartesian2
   */
  distanceDisplayCondition: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._distanceDisplayCondition;
    },
    set: function (value) {
      this._distanceDisplayCondition = getExpression(this, value);
      this._style.distanceDisplayCondition = getJsonFromExpression(
        this._distanceDisplayCondition
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>heightOffset</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Number</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override heightOffset expression with a string
   * style.heightOffset = '2.0';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override heightOffset expression with a condition
   * style.heightOffset = {
   *     conditions : [
   *         ['${height} > 2', '4.0'],
   *         ['true', '2.0']
   *     ]
   * };
   */
  heightOffset: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._heightOffset;
    },
    set: function (value) {
      this._heightOffset = getExpression(this, value);
      this._style.heightOffset = getJsonFromExpression(this._heightOffset);
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>anchorLineEnabled</code> property. Alternatively a string or object defining a boolean style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Boolean</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override anchorLineEnabled expression with a string
   * style.anchorLineEnabled = 'true';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override anchorLineEnabled expression with a condition
   * style.anchorLineEnabled = {
   *     conditions : [
   *         ['${height} > 2', 'true'],
   *         ['true', 'false']
   *     ]
   * };
   */
  anchorLineEnabled: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._anchorLineEnabled;
    },
    set: function (value) {
      this._anchorLineEnabled = getExpression(this, value);
      this._style.anchorLineEnabled = getJsonFromExpression(
        this._anchorLineEnabled
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>anchorLineColor</code> property. Alternatively a string or object defining a color style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Color</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override anchorLineColor expression with a string
   * style.anchorLineColor = 'color("blue")';
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override anchorLineColor expression with a condition
   * style.anchorLineColor = {
   *     conditions : [
   *         ['${height} > 2', 'color("cyan")'],
   *         ['true', 'color("blue")']
   *     ]
   * };
   */
  anchorLineColor: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._anchorLineColor;
    },
    set: function (value) {
      this._anchorLineColor = getExpression(this, value);
      this._style.anchorLineColor = getJsonFromExpression(
        this._anchorLineColor
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>image</code> property. Alternatively a string or object defining a string style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>String</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     image : '(${Temperature} > 90) ? "/url/to/image1" : "/url/to/image2"'
   * });
   * style.image.evaluate(feature); // returns a String
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override image expression with a custom function
   * style.image = {
   *     evaluate : function(feature) {
   *         return '/url/to/image';
   *     }
   * };
   */
  image: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._image;
    },
    set: function (value) {
      this._image = getExpression(this, value);
      this._style.image = getJsonFromExpression(this._image);
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>disableDepthTestDistance</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>Number</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override disableDepthTestDistance expression with a string
   * style.disableDepthTestDistance = '1000.0';
   * style.disableDepthTestDistance.evaluate(feature); // returns a Number
   */
  disableDepthTestDistance: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._disableDepthTestDistance;
    },
    set: function (value) {
      this._disableDepthTestDistance = getExpression(this, value);
      this._style.disableDepthTestDistance = getJsonFromExpression(
        this._disableDepthTestDistance
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>horizontalOrigin</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>HorizontalOrigin</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     horizontalOrigin : HorizontalOrigin.LEFT
   * });
   * style.horizontalOrigin.evaluate(feature); // returns a HorizontalOrigin
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override horizontalOrigin expression with a custom function
   * style.horizontalOrigin = {
   *     evaluate : function(feature) {
   *         return HorizontalOrigin.CENTER;
   *     }
   * };
   */
  horizontalOrigin: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._horizontalOrigin;
    },
    set: function (value) {
      this._horizontalOrigin = getExpression(this, value);
      this._style.horizontalOrigin = getJsonFromExpression(
        this._horizontalOrigin
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>verticalOrigin</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>VerticalOrigin</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     verticalOrigin : VerticalOrigin.TOP
   * });
   * style.verticalOrigin.evaluate(feature); // returns a VerticalOrigin
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override verticalOrigin expression with a custom function
   * style.verticalOrigin = {
   *     evaluate : function(feature) {
   *         return VerticalOrigin.CENTER;
   *     }
   * };
   */
  verticalOrigin: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._verticalOrigin;
    },
    set: function (value) {
      this._verticalOrigin = getExpression(this, value);
      this._style.verticalOrigin = getJsonFromExpression(this._verticalOrigin);
    },
  },

  /**
         Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelHorizontalOrigin</code> property. Alternatively a string or object defining a number style can be used.
         * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
         * <p>
         * The expression must return a <code>HorizontalOrigin</code>.
         * </p>
         * <p>
         * This expression is only applicable to point features in a Vector tile.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
         *
         * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     labelHorizontalOrigin : HorizontalOrigin.LEFT
         * });
         * style.labelHorizontalOrigin.evaluate(feature); // returns a HorizontalOrigin
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override labelHorizontalOrigin expression with a custom function
         * style.labelHorizontalOrigin = {
         *     evaluate : function(feature) {
         *         return HorizontalOrigin.CENTER;
         *     }
         * };
         */
  labelHorizontalOrigin: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._labelHorizontalOrigin;
    },
    set: function (value) {
      this._labelHorizontalOrigin = getExpression(this, value);
      this._style.labelHorizontalOrigin = getJsonFromExpression(
        this._labelHorizontalOrigin
      );
    },
  },

  /**
   * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelVerticalOrigin</code> property. Alternatively a string or object defining a number style can be used.
   * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
   * <p>
   * The expression must return a <code>VerticalOrigin</code>.
   * </p>
   * <p>
   * This expression is only applicable to point features in a Vector tile.
   * </p>
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     labelVerticalOrigin : VerticalOrigin.TOP
   * });
   * style.labelVerticalOrigin.evaluate(feature); // returns a VerticalOrigin
   *
   * @example
   * var style = new Cesium.Cesium3DTileStyle();
   * // Override labelVerticalOrigin expression with a custom function
   * style.labelVerticalOrigin = {
   *     evaluate : function(feature) {
   *         return VerticalOrigin.CENTER;
   *     }
   * };
   */
  labelVerticalOrigin: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._labelVerticalOrigin;
    },
    set: function (value) {
      this._labelVerticalOrigin = getExpression(this, value);
      this._style.labelVerticalOrigin = getJsonFromExpression(
        this._labelVerticalOrigin
      );
    },
  },

  /**
   * Gets or sets the object containing application-specific expression that can be explicitly
   * evaluated, e.g., for display in a UI.
   *
   * @memberof Cesium3DTileStyle.prototype
   *
   * @type {StyleExpression}
   *
   * @exception {DeveloperError} The style is not loaded.  Use {@link Cesium3DTileStyle#readyPromise} or wait for {@link Cesium3DTileStyle#ready} to be true.
   *
   * @example
   * var style = new Cesium3DTileStyle({
   *     meta : {
   *         description : '"Building id ${id} has height ${Height}."'
   *     }
   * });
   * style.meta.description.evaluate(feature); // returns a String with the substituted variables
   */
  meta: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._meta;
    },
    set: function (value) {
      this._meta = value;
    },
  },
});

/**
 * Gets the color shader function for this style.
 *
 * @param {String} functionHeader Header of the generated function.
 * @param {Object} variableSubstitutionMap Maps variable names to shader names.
 * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
 *
 * @returns {String} The shader function.
 *
 * @private
 */
Cesium3DTileStyle.prototype.getColorShaderFunction = function (
  functionHeader,
  variableSubstitutionMap,
  shaderState
) {
  if (this._colorShaderFunctionReady) {
    shaderState.translucent = this._colorShaderTranslucent;
    // Return the cached result, may be undefined
    return this._colorShaderFunction;
  }

  this._colorShaderFunctionReady = true;
  this._colorShaderFunction =
    defined(this.color) && defined(this.color.getShaderFunction)
      ? this.color.getShaderFunction(
          functionHeader,
          variableSubstitutionMap,
          shaderState,
          "vec4"
        )
      : undefined;
  this._colorShaderTranslucent = shaderState.translucent;
  return this._colorShaderFunction;
};

/**
 * Gets the show shader function for this style.
 *
 * @param {String} functionHeader Header of the generated function.
 * @param {Object} variableSubstitutionMap Maps variable names to shader names.
 * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
 *
 * @returns {String} The shader function.
 *
 * @private
 */
Cesium3DTileStyle.prototype.getShowShaderFunction = function (
  functionHeader,
  variableSubstitutionMap,
  shaderState
) {
  if (this._showShaderFunctionReady) {
    // Return the cached result, may be undefined
    return this._showShaderFunction;
  }

  this._showShaderFunctionReady = true;
  this._showShaderFunction =
    defined(this.show) && defined(this.show.getShaderFunction)
      ? this.show.getShaderFunction(
          functionHeader,
          variableSubstitutionMap,
          shaderState,
          "bool"
        )
      : undefined;
  return this._showShaderFunction;
};

/**
 * Gets the pointSize shader function for this style.
 *
 * @param {String} functionHeader Header of the generated function.
 * @param {Object} variableSubstitutionMap Maps variable names to shader names.
 * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
 *
 * @returns {String} The shader function.
 *
 * @private
 */
Cesium3DTileStyle.prototype.getPointSizeShaderFunction = function (
  functionHeader,
  variableSubstitutionMap,
  shaderState
) {
  if (this._pointSizeShaderFunctionReady) {
    // Return the cached result, may be undefined
    return this._pointSizeShaderFunction;
  }

  this._pointSizeShaderFunctionReady = true;
  this._pointSizeShaderFunction =
    defined(this.pointSize) && defined(this.pointSize.getShaderFunction)
      ? this.pointSize.getShaderFunction(
          functionHeader,
          variableSubstitutionMap,
          shaderState,
          "float"
        )
      : undefined;
  return this._pointSizeShaderFunction;
};

/**
 * Gets the variables used by the style.
 *
 * @returns {String[]} The variables used by the style.
 *
 * @private
 */
Cesium3DTileStyle.prototype.getVariables = function () {
  var variables = [];

  if (defined(this.color) && defined(this.color.getVariables)) {
    variables.push.apply(variables, this.color.getVariables());
  }

  if (defined(this.show) && defined(this.show.getVariables)) {
    variables.push.apply(variables, this.show.getVariables());
  }

  if (defined(this.pointSize) && defined(this.pointSize.getVariables)) {
    variables.push.apply(variables, this.pointSize.getVariables());
  }

  // Remove duplicates
  variables = variables.filter(function (variable, index, variables) {
    return variables.indexOf(variable) === index;
  });

  return variables;
};

export default Cesium3DTileStyle;
