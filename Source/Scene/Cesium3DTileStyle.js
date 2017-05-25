/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/isArray',
        '../Core/loadJson',
        '../Core/RequestScheduler',
        '../ThirdParty/when',
        './ConditionsExpression',
        './Expression',
        './LabelStyle'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        isArray,
        loadJson,
        RequestScheduler,
        when,
        ConditionsExpression,
        Expression,
        LabelStyle) {
    'use strict';

    var DEFAULT_JSON_COLOR_EXPRESSION = 'color("#ffffff")';
    var DEFAULT_JSON_OUTLINE_COLOR_EXPRESSION = 'color("#000000")';
    var DEFAULT_JSON_BOOLEAN_EXPRESSION = true;
    var DEFAULT_JSON_NUMBER_EXPRESSION = 1.0;
    var DEFAULT_LABEL_STYLE_EXPRESSION = LabelStyle.FILL;
    var DEFAULT_FONT_EXPRESSION = '"30px sans-serif"';
    var DEFAULT_ANCHOR_LINE_COLOR_EXPRESSION = 'color("#ffffff")';
    var DEFAULT_BACKGROUND_COLOR_EXPRESSION = 'rgba(42, 42, 42, 0.8)';
    var DEFAULT_BACKGROUND_X_PADDING_EXPRESSION = 7.0;
    var DEFAULT_BACKGROUND_Y_PADDING_EXPRESSION = 5.0;
    var DEFAULT_BACKGROUND_ENABLED = false;

    /**
     * Evaluates an expression defined using the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
     *
     * @alias Cesium3DTileStyle
     * @constructor
     *
     * @param {String|Object} [data] The url of a style or an object defining a style.
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
     */
    function Cesium3DTileStyle(data) {
        this._style = undefined;
        this._ready = false;
        this._readyPromise = when.defer();
        this._color = undefined;
        this._show = undefined;
        this._pointSize = undefined;
        this._outlineColor = undefined;
        this._outlineWidth = undefined;
        this._labelStyle = undefined;
        this._font = undefined;
        this._anchorLineColor = undefined;
        this._backgroundColor = undefined;
        this._backgroundXPadding = undefined;
        this._backgroundYPadding = undefined;
        this._backgroundEnabled = undefined;
        this._scaleByDistanceNearRange = undefined;
        this._scaleByDistanceNearValue = undefined;
        this._scaleByDistanceFarRange = undefined;
        this._scaleByDistanceFarValue = undefined;
        this._translucencyByDistanceNearRange = undefined;
        this._translucencyByDistanceNearValue = undefined;
        this._translucencyByDistanceFarRange = undefined;
        this._translucencyByDistanceFarValue = undefined;
        this._meta = undefined;

        this._colorShaderFunction = undefined;
        this._showShaderFunction = undefined;
        this._pointSizeShaderFunction = undefined;
        this._colorShaderFunctionReady = false;
        this._showShaderFunctionReady = false;
        this._pointSizeShaderFunctionReady = false;

        var style = this;
        if (typeof data === 'string') {
            RequestScheduler.request(data, loadJson).then(function(styleJson) {
                setup(style, styleJson);
                style._readyPromise.resolve(style);
            }).otherwise(function(error) {
                style._readyPromise.reject(error);
            });
        } else {
            setup(style, data);
            style._readyPromise.resolve(style);
        }
    }

    function setup(that, styleJson) {
        that._style = clone(styleJson, true);

        styleJson = defaultValue(styleJson, defaultValue.EMPTY_OBJECT);

        if (!defined(styleJson.color)) {
            // If there is no color style do not create a shader function.
            that._colorShaderFunctionReady = true;
        }

        if (!defined(styleJson.show)) {
            // If there is no show style do not create a shader function.
            that._showShaderFunctionReady = true;
        }

        if (!defined(styleJson.pointSize)) {
            // If there is no point size style do not create a shader function.
            that._pointSizeShaderFunctionReady = true;
        }

        var colorExpression = defaultValue(styleJson.color, DEFAULT_JSON_COLOR_EXPRESSION);
        var showExpression = defaultValue(styleJson.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);
        var pointSizeExpression = defaultValue(styleJson.pointSize, DEFAULT_JSON_NUMBER_EXPRESSION);
        var outlineColorExpression = defaultValue(styleJson.outlineColor, DEFAULT_JSON_OUTLINE_COLOR_EXPRESSION);
        var outlineWidthExpression = defaultValue(styleJson.outlineWidth, DEFAULT_JSON_NUMBER_EXPRESSION);
        var labelStyleExpression = defaultValue(styleJson.labelStyle, DEFAULT_LABEL_STYLE_EXPRESSION);
        var fontExpression = defaultValue(styleJson.font, DEFAULT_FONT_EXPRESSION);
        var anchorLineColorExpression = defaultValue(styleJson.anchorLineColor, DEFAULT_ANCHOR_LINE_COLOR_EXPRESSION);
        var backgroundColorExpression = defaultValue(styleJson.backgroundColor, DEFAULT_BACKGROUND_COLOR_EXPRESSION);
        var backgroundXPaddingExpression = defaultValue(styleJson.backgroundXPadding, DEFAULT_BACKGROUND_X_PADDING_EXPRESSION);
        var backgroundYPaddingExpression = defaultValue(styleJson.backgroundYPadding, DEFAULT_BACKGROUND_Y_PADDING_EXPRESSION);
        var backgroundEnabledExpression = defaultValue(styleJson.backgroundEnabled, DEFAULT_BACKGROUND_ENABLED);
        var scaleByDistanceNearRangeExpression = styleJson.scaleByDistanceNearRange;
        var scaleByDistanceNearValueExpression = styleJson.scaleByDistanceNearValue;
        var scaleByDistanceFarRangeExpression = styleJson.scaleByDistanceFarRange;
        var scaleByDistanceFarValueExpression = styleJson.scaleByDistanceFarValue;
        var translucencyByDistanceNearRangeExpression = styleJson.translucencyByDistanceNearRange;
        var translucencyByDistanceNearValueExpression = styleJson.translucencyByDistanceNearValue;
        var translucencyByDistanceFarRangeExpression = styleJson.translucencyByDistanceFarRange;
        var translucencyByDistanceFarValueExpression = styleJson.translucencyByDistanceFarValue;
        var distanceDisplayConditionNearExpression = styleJson.distanceDisplayConditionNear;
        var distanceDisplayConditionFarExpression = styleJson.distanceDisplayConditionFar;

        var expressions = styleJson.expressions;

        var color;
        if (typeof colorExpression === 'string') {
            color = new Expression(colorExpression, expressions);
        } else if (defined(colorExpression.conditions)) {
            color = new ConditionsExpression(colorExpression, expressions);
        }

        that._color = color;

        var show;
        if (typeof showExpression === 'boolean') {
            show = new Expression(String(showExpression), expressions);
        } else if (typeof showExpression === 'string') {
            show = new Expression(showExpression, expressions);
        } else if (defined(showExpression.conditions)) {
            show = new ConditionsExpression(showExpression, expressions);
        }

        that._show = show;

        var pointSize;
        if (typeof pointSizeExpression === 'number') {
            pointSize = new Expression(String(pointSizeExpression), expressions);
        } else if (typeof pointSizeExpression === 'string') {
            pointSize = new Expression(pointSizeExpression, expressions);
        } else if (defined(pointSizeExpression.conditions)) {
            pointSize = new ConditionsExpression(pointSizeExpression, expressions);
        }

        that._pointSize = pointSize;

        var outlineColor;
        if (typeof outlineColorExpression === 'string') {
            outlineColor = new Expression(outlineColorExpression);
        } else if (defined(outlineColorExpression.conditions)) {
            outlineColor = new ConditionsExpression(outlineColorExpression);
        }

        that._outlineColor = outlineColor;

        var outlineWidth;
        if (typeof outlineWidthExpression === 'number') {
            outlineWidth = new Expression(String(outlineWidthExpression));
        } else if (typeof outlineWidthExpression === 'string') {
            outlineWidth = new Expression(outlineWidthExpression);
        } else if (defined(outlineWidthExpression.conditions)) {
            outlineWidth = new ConditionsExpression(outlineWidthExpression);
        }

        that._outlineWidth = outlineWidth;

        var labelStyle;
        if (typeof labelStyleExpression === 'number') {
            labelStyle = new Expression(String(labelStyleExpression));
        } else if (typeof labelStyleExpression === 'string') {
            labelStyle = new Expression(labelStyleExpression);
        } else if (defined(labelStyleExpression.conditions)) {
            labelStyle = new ConditionsExpression(labelStyleExpression);
        }

        that._labelStyle = labelStyle;

        var font;
        if (typeof fontExpression === 'string') {
            font = new Expression(fontExpression);
        } else if (defined(fontExpression.conditions)) {
            font = new ConditionsExpression(fontExpression);
        }

        that._font = font;

        var anchorLineColor;
        if (typeof anchorLineColorExpression === 'string') {
            anchorLineColor = new Expression(anchorLineColorExpression);
        } else if (defined(anchorLineColorExpression.conditions)) {
            anchorLineColor = new ConditionsExpression(anchorLineColorExpression);
        }

        that._anchorLineColor = anchorLineColor;

        var backgroundColor;
        if (typeof backgroundColorExpression === 'string') {
            backgroundColor = new Expression(backgroundColorExpression);
        } else if (defined(backgroundColorExpression.conditions)) {
            backgroundColor = new ConditionsExpression(backgroundColorExpression);
        }

        that._backgroundColor = backgroundColor;

        var backgroundXPadding;
        if (typeof backgroundXPaddingExpression === 'number') {
            backgroundXPadding = new Expression(String(backgroundXPaddingExpression));
        } else if (typeof backgroundXPaddingExpression === 'string') {
            backgroundXPadding = new Expression(backgroundXPaddingExpression);
        } else if (defined(backgroundXPaddingExpression.conditions)) {
            backgroundXPadding = new ConditionsExpression(backgroundXPaddingExpression);
        }

        that._backgroundXPadding = backgroundXPadding;

        var backgroundYPadding;
        if (typeof backgroundYPaddingExpression === 'number') {
            backgroundYPadding = new Expression(String(backgroundYPaddingExpression));
        } else if (typeof backgroundYPaddingExpression === 'string') {
            backgroundYPadding = new Expression(backgroundYPaddingExpression);
        } else if (defined(backgroundYPaddingExpression.conditions)) {
            backgroundYPadding = new ConditionsExpression(backgroundYPaddingExpression);
        }

        that._backgroundYPadding = backgroundYPadding;

        var backgroundEnabled;
        if (typeof backgroundEnabledExpression === 'boolean') {
            backgroundEnabled = new Expression(String(backgroundEnabledExpression));
        } else if (typeof backgroundEnabledExpression === 'string') {
            backgroundEnabled = new Expression(backgroundEnabledExpression);
        } else if (defined(backgroundEnabledExpression.conditions)) {
            backgroundEnabled = new ConditionsExpression(backgroundEnabledExpression);
        }

        that._backgroundEnabled = backgroundEnabled;

        var scaleByDistanceNearRange;
        if (typeof scaleByDistanceNearRangeExpression === 'number') {
            scaleByDistanceNearRange = new Expression(String(scaleByDistanceNearRangeExpression));
        } else if (typeof scaleByDistanceNearRangeExpression === 'string') {
            scaleByDistanceNearRange = new Expression(scaleByDistanceNearRangeExpression);
        } else if (defined(scaleByDistanceNearRangeExpression) && defined(scaleByDistanceNearRangeExpression.conditions)) {
            scaleByDistanceNearRange = new ConditionsExpression(scaleByDistanceNearRangeExpression);
        }

        that._scaleByDistanceNearRange = scaleByDistanceNearRange;

        var scaleByDistanceNearValue;
        if (typeof scaleByDistanceNearValueExpression === 'number') {
            scaleByDistanceNearValue = new Expression(String(scaleByDistanceNearValueExpression));
        } else if (typeof scaleByDistanceNearValueExpression === 'string') {
            scaleByDistanceNearValue = new Expression(scaleByDistanceNearValueExpression);
        } else if (defined(scaleByDistanceNearValueExpression) && defined(scaleByDistanceNearValueExpression.conditions)) {
            scaleByDistanceNearValue = new ConditionsExpression(scaleByDistanceNearValueExpression);
        }

        that._scaleByDistanceNearValue = scaleByDistanceNearValue;

        var scaleByDistanceFarRange;
        if (typeof scaleByDistanceFarRangeExpression === 'number') {
            scaleByDistanceFarRange = new Expression(String(scaleByDistanceFarRangeExpression));
        } else if (typeof scaleByDistanceFarRangeExpression === 'string') {
            scaleByDistanceFarRange = new Expression(scaleByDistanceFarRangeExpression);
        } else if (defined(scaleByDistanceFarRangeExpression) && defined(scaleByDistanceFarRangeExpression.conditions)) {
            scaleByDistanceFarRange = new ConditionsExpression(scaleByDistanceFarRangeExpression);
        }

        that._scaleByDistanceFarRange = scaleByDistanceFarRange;

        var scaleByDistanceFarValue;
        if (typeof scaleByDistanceFarValueExpression === 'number') {
            scaleByDistanceFarValue = new Expression(String(scaleByDistanceFarValueExpression));
        } else if (typeof scaleByDistanceFarValueExpression === 'string') {
            scaleByDistanceFarValue = new Expression(scaleByDistanceFarValueExpression);
        } else if (defined(scaleByDistanceFarValueExpression) && defined(scaleByDistanceFarValueExpression.conditions)) {
            scaleByDistanceFarValue = new ConditionsExpression(scaleByDistanceFarValueExpression);
        }

        that._scaleByDistanceFarValue = scaleByDistanceFarValue;

        var translucencyByDistanceNearRange;
        if (typeof translucencyByDistanceNearRangeExpression === 'number') {
            translucencyByDistanceNearRange = new Expression(String(translucencyByDistanceNearRangeExpression));
        } else if (typeof translucencyByDistanceNearRangeExpression === 'string') {
            translucencyByDistanceNearRange = new Expression(translucencyByDistanceNearRangeExpression);
        } else if (defined(translucencyByDistanceNearRangeExpression) && defined(translucencyByDistanceNearRangeExpression.conditions)) {
            translucencyByDistanceNearRange = new ConditionsExpression(translucencyByDistanceNearRangeExpression);
        }

        that._translucencyByDistanceNearRange = translucencyByDistanceNearRange;

        var translucencyByDistanceNearValue;
        if (typeof translucencyByDistanceNearValueExpression === 'number') {
            translucencyByDistanceNearValue = new Expression(String(translucencyByDistanceNearValueExpression));
        } else if (typeof translucencyByDistanceNearValueExpression === 'string') {
            translucencyByDistanceNearValue = new Expression(translucencyByDistanceNearValueExpression);
        } else if (defined(translucencyByDistanceNearValueExpression) && defined(translucencyByDistanceNearValueExpression.conditions)) {
            translucencyByDistanceNearValue = new ConditionsExpression(translucencyByDistanceNearValueExpression);
        }

        that._translucencyByDistanceNearValue = translucencyByDistanceNearValue;

        var translucencyByDistanceFarRange;
        if (typeof translucencyByDistanceFarRangeExpression === 'number') {
            translucencyByDistanceFarRange = new Expression(String(translucencyByDistanceFarRangeExpression));
        } else if (typeof translucencyByDistanceFarRangeExpression === 'string') {
            translucencyByDistanceFarRange = new Expression(translucencyByDistanceFarRangeExpression);
        } else if (defined(translucencyByDistanceFarRangeExpression) && defined(translucencyByDistanceFarRangeExpression.conditions)) {
            translucencyByDistanceFarRange = new ConditionsExpression(translucencyByDistanceFarRangeExpression);
        }

        that._translucencyByDistanceFarRange = translucencyByDistanceFarRange;

        var translucencyByDistanceFarValue;
        if (typeof translucencyByDistanceFarValueExpression === 'number') {
            translucencyByDistanceFarValue = new Expression(String(translucencyByDistanceFarValueExpression));
        } else if (typeof translucencyByDistanceFarValueExpression === 'string') {
            translucencyByDistanceFarValue = new Expression(translucencyByDistanceFarValueExpression);
        } else if (defined(translucencyByDistanceFarValueExpression) && defined(translucencyByDistanceFarValueExpression.conditions)) {
            translucencyByDistanceFarValue = new ConditionsExpression(translucencyByDistanceFarValueExpression);
        }

        that._translucencyByDistanceFarValue = translucencyByDistanceFarValue;

        var distanceDisplayConditionNear;
        if (typeof distanceDisplayConditionNearExpression === 'number') {
            distanceDisplayConditionNear = new Expression(String(distanceDisplayConditionNearExpression));
        } else if (typeof distanceDisplayConditionNearExpression === 'string') {
            distanceDisplayConditionNear = new Expression(distanceDisplayConditionNearExpression);
        } else if (defined(distanceDisplayConditionNearExpression) && defined(distanceDisplayConditionNearExpression.conditions)) {
            distanceDisplayConditionNear = new ConditionsExpression(distanceDisplayConditionNearExpression);
        }

        that._distanceDisplayConditionNear = distanceDisplayConditionNear;

        var distanceDisplayConditionFar;
        if (typeof distanceDisplayConditionFarExpression === 'number') {
            distanceDisplayConditionFar = new Expression(String(distanceDisplayConditionFarExpression));
        } else if (typeof distanceDisplayConditionFarExpression === 'string') {
            distanceDisplayConditionFar = new Expression(distanceDisplayConditionFarExpression);
        } else if (defined(distanceDisplayConditionFarExpression) && defined(distanceDisplayConditionFarExpression.conditions)) {
            distanceDisplayConditionFar = new ConditionsExpression(distanceDisplayConditionFarExpression);
        }

        that._distanceDisplayConditionFar = distanceDisplayConditionFar;

        var meta = {};
        if (defined(styleJson.meta)) {
            var metaJson = defaultValue(styleJson.meta, defaultValue.EMPTY_OBJECT);
            for (var property in metaJson) {
                if (metaJson.hasOwnProperty(property)) {
                    meta[property] = new Expression(metaJson[property], expressions);
                }
            }
        }

        that._meta = meta;

        that._ready = true;
    }

    defineProperties(Cesium3DTileStyle.prototype, {
        /**
         * Gets the object defining the style using the
         * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {Object}
         * @readonly
         *
         * @default undefined
         *
         * @exception {DeveloperError} The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.
         */
        style : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._style;
            }
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
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the promise that will be resolved when the the style is ready and its expressions can be evaluated.
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {Promise.<Cesium3DTileStyle>}
         * @readonly
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>show</code> property.
         * <p>
         * The expression must return or convert to a <code>Boolean</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     show : '(regExp("^Chest").test(${County})) && (${YearBuilt} >= 1970)'
         * });
         * style.show.evaluate(frameState, feature); // returns true or false depending on the feature's properties
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override show expression with a custom function
         * style.show = {
         *     evaluate : function(frameState, feature) {
         *         return true;
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        show : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._show;
            },
            set : function(value) {
                this._showShaderFunctionReady = false;
                this._show = value;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>color</code> property.
         * <p>
         * The expression must return a <code>Color</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     color : '(${Temperature} > 90) ? color("red") : color("white")'
         * });
         * style.color.evaluateColor(frameState, feature, result); // returns a Cesium.Color object
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override color expression with a custom function
         * style.color = {
         *     evaluateColor : function(frameState, feature, result) {
         *         return Cesium.Color.clone(Cesium.Color.WHITE, result);
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        color : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._color;
            },
            set : function(value) {
                this._colorShaderFunctionReady = false;
                this._color = value;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointSize</code> property.
         * <p>
         * The expression must return or convert to a <code>Number</code>.
         * </p>
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     pointSize : '(${Temperature} > 90) ? 2.0 : 1.0'
         * });
         * style.pointSize.evaluate(frameState, feature); // returns a Number
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override pointSize expression with a custom function
         * style.pointSize = {
         *     evaluate : function(frameState, feature) {
         *         return 1.0;
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        pointSize : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointSize;
            },
            set : function(value) {
                this._pointSizeShaderFunctionReady = false;
                this._pointSize = value;
            }
        },

        outlineColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._outlineColor;
            },
            set : function(value) {
                this._outlineColor = value;
            }
        },

        outlineWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._outlineWidth;
            },
            set : function(value) {
                this._outlineWidth = value;
            }
        },

        labelStyle : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelStyle;
            },
            set : function(value) {
                this._labelStyle = value;
            }
        },

        font : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._font;
            },
            set : function(value) {
                this._font = value;
            }
        },

        anchorLineColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._anchorLineColor;
            },
            set : function(value) {
                this._anchorLineColor = value;
            }
        },

        backgroundColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundColor;
            },
            set : function(value) {
                this._backgroundColor = value;
            }
        },

        backgroundXPadding : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundXPadding;
            },
            set : function(value) {
                this._backgroundXPadding = value;
            }
        },

        backgroundYPadding : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundYPadding;
            },
            set : function(value) {
                this._backgroundYPadding = value;
            }
        },

        backgroundEnabled : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundEnabled;
            },
            set : function(value) {
                this._backgroundEnabled = value;
            }
        },

        scaleByDistanceNearRange : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._scaleByDistanceNearRange;
            },
            set : function(value) {
                this._scaleByDistanceNearRange = value;
            }
        },

        scaleByDistanceNearValue : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._scaleByDistanceNearValue;
            },
            set : function(value) {
                this._scaleByDistanceNearValue = value;
            }
        },

        scaleByDistanceFarRange : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._scaleByDistanceFarRange;
            },
            set : function(value) {
                this._scaleByDistanceFarRange = value;
            }
        },

        scaleByDistanceFarValue : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._scaleByDistanceFarValue;
            },
            set : function(value) {
                this._scaleByDistanceFarValue = value;
            }
        },

        translucencyByDistanceNearRange : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._translucencyByDistanceNearRange;
            },
            set : function(value) {
                this._translucencyByDistanceNearRange = value;
            }
        },

        translucencyByDistanceNearValue : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._translucencyByDistanceNearValue;
            },
            set : function(value) {
                this._translucencyByDistanceNearValue = value;
            }
        },

        translucencyByDistanceFarRange : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._translucencyByDistanceFarRange;
            },
            set : function(value) {
                this._translucencyByDistanceFarRange = value;
            }
        },

        translucencyByDistanceFarValue : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._translucencyByDistanceFarValue;
            },
            set : function(value) {
                this._translucencyByDistanceFarValue = value;
            }
        },

        distanceDisplayConditionNear : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._distanceDisplayConditionNear;
            },
            set : function(value) {
                this._distanceDisplayConditionNear = value;
            }
        },

        distanceDisplayConditionFar : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._distanceDisplayConditionFar;
            },
            set : function(value) {
                this._distanceDisplayConditionFar = value;
            }
        },

        /**
         * Gets or sets the object containing application-specific expression that can be explicitly
         * evaluated, e.g., for display in a UI.
         *
         * @memberof Cesium3DTileStyle.prototype
         *
         * @type {StyleExpression}
         *
         * @exception {DeveloperError} The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.
         *
         * @example
         * var style = new Cesium3DTileStyle({
         *     meta : {
         *         description : '"Building id ${id} has height ${Height}."'
         *     }
         * });
         * style.meta.description.evaluate(frameState, feature); // returns a String with the substituted variables
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        meta : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._meta;
            },
            set : function(value) {
                this._meta = value;
            }
        }
    });

    /**
     * Gets the color shader function for this style.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    Cesium3DTileStyle.prototype.getColorShaderFunction = function(functionName, attributePrefix, shaderState) {
        if (this._colorShaderFunctionReady) {
            // Return the cached result, may be undefined
            return this._colorShaderFunction;
        }

        this._colorShaderFunctionReady = true;
        this._colorShaderFunction = this.color.getShaderFunction(functionName, attributePrefix, shaderState, 'vec4');
        return this._colorShaderFunction;
    };

    /**
     * Gets the show shader function for this style.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    Cesium3DTileStyle.prototype.getShowShaderFunction = function(functionName, attributePrefix, shaderState) {
        if (this._showShaderFunctionReady) {
            // Return the cached result, may be undefined
            return this._showShaderFunction;
        }

        this._showShaderFunctionReady = true;
        this._showShaderFunction = this.show.getShaderFunction(functionName, attributePrefix, shaderState, 'bool');
        return this._showShaderFunction;
    };

    /**
     * Gets the pointSize shader function for this style.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    Cesium3DTileStyle.prototype.getPointSizeShaderFunction = function(functionName, attributePrefix, shaderState) {
        if (this._pointSizeShaderFunctionReady) {
            // Return the cached result, may be undefined
            return this._pointSizeShaderFunction;
        }

        this._pointSizeShaderFunctionReady = true;
        this._pointSizeShaderFunction = this.pointSize.getShaderFunction(functionName, attributePrefix, shaderState, 'float');
        return this._pointSizeShaderFunction;
    };

    return Cesium3DTileStyle;
});
