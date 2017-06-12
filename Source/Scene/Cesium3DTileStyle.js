/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/loadJson',
        '../Core/RequestScheduler',
        '../ThirdParty/when',
        './ConditionsExpression',
        './Expression',
        './LabelStyle'
    ], function(
        Cartesian3,
        clone,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        loadJson,
        RequestScheduler,
        when,
        ConditionsExpression,
        Expression,
        LabelStyle) {
    'use strict';

    var DEFAULT_JSON_BOOLEAN_EXPRESSION = true;
    var DEFAULT_JSON_COLOR_EXPRESSION = 'color("#ffffff")';
    var DEFAULT_JSON_OUTLINE_COLOR_EXPRESSION = 'color("#000000")';
    var DEFAULT_POINT_SIZE_EXPRESSION = 8.0;
    var DEFAULT_JSON_POINT_OUTLINE_WIDTH_EXPRESSION = 0.0;
    var DEFAULT_JSON_LABEL_OUTLINE_WIDTH_EXPRESSION = 2.0;
    var DEFAULT_JSON_LABEL_STYLE_EXPRESSION = LabelStyle.FILL;
    var DEFAULT_JSON_FONT_EXPRESSION = '"30px sans-serif"';
    var DEFAULT_JSON_BACKGROUND_ENABLED_EXPRESSION = false;
    var DEFAULT_JSON_POSITION_OFFSET_EXPRESSION = 'vec3(0.0, 0.0, 0.0)';
    var DEFAULT_JSON_ACHOR_LINE_ENABLED_EXPRESSION = false;
    var DEFAULT_JSON_ANCHOR_LINE_COLOR_EXPRESSION = 'color("#ffffff")';

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

        this._show = undefined;
        this._color = undefined;
        this._pointColor = undefined;
        this._pointSize = undefined;
        this._pointOutlineColor = undefined;
        this._pointOutlineWidth = undefined;
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
        this._positionOffset = undefined;
        this._anchorLineEnabled = undefined;
        this._anchorLineColor = undefined;
        this._image = undefined;
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

        var showExpression = defaultValue(styleJson.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);
        var colorExpression = defaultValue(styleJson.color, DEFAULT_JSON_COLOR_EXPRESSION);
        var pointColorExpression = defaultValue(styleJson.pointColor, DEFAULT_JSON_COLOR_EXPRESSION);
        var pointSizeExpression = defaultValue(styleJson.pointSize, DEFAULT_POINT_SIZE_EXPRESSION);
        var pointOutlineColorExpression = defaultValue(styleJson.pointOutlineColor, DEFAULT_JSON_OUTLINE_COLOR_EXPRESSION);
        var pointOutlineWidthExpression = defaultValue(styleJson.pointOutlineWidth, DEFAULT_JSON_POINT_OUTLINE_WIDTH_EXPRESSION);
        var labelOutlineColorExpression = defaultValue(styleJson.labelOutlineColor, DEFAULT_JSON_OUTLINE_COLOR_EXPRESSION);
        var labelOutlineWidthExpression = defaultValue(styleJson.labelOutlineWidth, DEFAULT_JSON_LABEL_OUTLINE_WIDTH_EXPRESSION);
        var labelStyleExpression = defaultValue(styleJson.labelStyle, DEFAULT_JSON_LABEL_STYLE_EXPRESSION);
        var fontExpression = defaultValue(styleJson.font, DEFAULT_JSON_FONT_EXPRESSION);
        var labelTextExpression = styleJson.labelText;
        var backgroundColorExpression = styleJson.backgroundColorExpression;
        var backgroundPaddingExpression = styleJson.backgroundPadding;
        var backgroundEnabledExpression = defaultValue(styleJson.backgroundEnabled, DEFAULT_JSON_BACKGROUND_ENABLED_EXPRESSION);
        var scaleByDistanceExpression = styleJson.scaleByDistance;
        var translucencyByDistanceExpression = styleJson.translucencyByDistance;
        var distanceDisplayConditionExpression = styleJson.distanceDisplayCondition;
        var positionOffsetExpression = defaultValue(styleJson.positionOffset, DEFAULT_JSON_POSITION_OFFSET_EXPRESSION);
        var anchorLineEnabledExpression = defaultValue(styleJson.anchorLineEnabled, DEFAULT_JSON_ACHOR_LINE_ENABLED_EXPRESSION);
        var anchorLineColorExpression = defaultValue(styleJson.anchorLineColor, DEFAULT_JSON_ANCHOR_LINE_COLOR_EXPRESSION);
        var imageExpression = styleJson.image;

        var expressions = styleJson.expressions;

        var show;
        if (typeof showExpression === 'boolean') {
            show = new Expression(String(showExpression), expressions);
        } else if (typeof showExpression === 'string') {
            show = new Expression(showExpression, expressions);
        } else if (defined(showExpression.conditions)) {
            show = new ConditionsExpression(showExpression, expressions);
        }

        that._show = show;

        var color;
        if (typeof colorExpression === 'string') {
            color = new Expression(colorExpression, expressions);
        } else if (defined(colorExpression.conditions)) {
            color = new ConditionsExpression(colorExpression, expressions);
        }

        that._color = color;

        var pointColor;
        if (typeof pointColorExpression === 'string') {
            pointColor = new Expression(pointColorExpression, expressions);
        } else if (defined(pointColorExpression.conditions)) {
            pointColor = new ConditionsExpression(pointColorExpression, expressions);
        }

        that._pointColor = pointColor;

        var pointSize;
        if (typeof pointSizeExpression === 'number') {
            pointSize = new Expression(String(pointSizeExpression), expressions);
        } else if (typeof pointSizeExpression === 'string') {
            pointSize = new Expression(pointSizeExpression, expressions);
        } else if (defined(pointSizeExpression.conditions)) {
            pointSize = new ConditionsExpression(pointSizeExpression, expressions);
        }

        that._pointSize = pointSize;

        var pointOutlineColor;
        if (typeof pointOutlineColorExpression === 'string') {
            pointOutlineColor = new Expression(pointOutlineColorExpression, expressions);
        } else if (defined(pointOutlineColorExpression.conditions)) {
            pointOutlineColor = new ConditionsExpression(pointOutlineColorExpression, expressions);
        }

        that._pointOutlineColor = pointOutlineColor;

        var pointOutlineWidth;
        if (typeof pointOutlineWidthExpression === 'number') {
            pointOutlineWidth = new Expression(String(pointOutlineWidthExpression), expressions);
        } else if (typeof pointOutlineWidthExpression === 'string') {
            pointOutlineWidth = new Expression(pointOutlineWidthExpression, expressions);
        } else if (defined(pointOutlineWidthExpression.conditions)) {
            pointOutlineWidth = new ConditionsExpression(pointOutlineWidthExpression, expressions);
        }

        that._pointOutlineWidth = pointOutlineWidth;

        var labelOutlineColor;
        if (typeof labelOutlineColorExpression === 'string') {
            labelOutlineColor = new Expression(labelOutlineColorExpression, expressions);
        } else if (defined(labelOutlineColorExpression.conditions)) {
            labelOutlineColor = new ConditionsExpression(labelOutlineColorExpression, expressions);
        }

        that._labelOutlineColor = labelOutlineColor;

        var labelOutlineWidth;
        if (typeof labelOutlineWidthExpression === 'number') {
            labelOutlineWidth = new Expression(String(labelOutlineWidthExpression), expressions);
        } else if (typeof labelOutlineWidthExpression === 'string') {
            labelOutlineWidth = new Expression(labelOutlineWidthExpression, expressions);
        } else if (defined(labelOutlineWidthExpression.conditions)) {
            labelOutlineWidth = new ConditionsExpression(labelOutlineWidthExpression, expressions);
        }

        that._labelOutlineWidth = labelOutlineWidth;

        var labelStyle;
        if (typeof labelStyleExpression === 'number') {
            labelStyle = new Expression(String(labelStyleExpression), expressions);
        } else if (typeof labelStyleExpression === 'string') {
            labelStyle = new Expression(labelStyleExpression, expressions);
        } else if (defined(labelStyleExpression.conditions)) {
            labelStyle = new ConditionsExpression(labelStyleExpression, expressions);
        }

        that._labelStyle = labelStyle;

        var font;
        if (typeof fontExpression === 'string') {
            font = new Expression(fontExpression, expressions);
        } else if (defined(fontExpression.conditions)) {
            font = new ConditionsExpression(fontExpression, expressions);
        }

        that._font = font;

        var labelText;
        if (typeof(labelTextExpression) === 'string') {
            labelText = new Expression(labelTextExpression, expressions);
        } else if (defined(labelTextExpression) && defined(labelTextExpression.conditions)) {
            labelText = new ConditionsExpression(labelTextExpression, expressions);
        }

        that._labelText = labelText;

        var backgroundColor;
        if (typeof backgroundColorExpression === 'string') {
            backgroundColor = new Expression(backgroundColorExpression, expressions);
        } else if (defined(backgroundColorExpression) && defined(backgroundColorExpression.conditions)) {
            backgroundColor = new ConditionsExpression(backgroundColorExpression, expressions);
        }

        that._backgroundColor = backgroundColor;

        var backgroundPadding;
        if (typeof backgroundPaddingExpression === 'string') {
            backgroundPadding = new Expression(backgroundPaddingExpression, expressions);
        } else if (defined(backgroundPaddingExpression) && defined(backgroundPaddingExpression.conditions)) {
            backgroundPadding = new ConditionsExpression(backgroundPaddingExpression, expressions);
        }

        that._backgroundPadding = backgroundPadding;

        var backgroundEnabled;
        if (typeof backgroundEnabledExpression === 'boolean') {
            backgroundEnabled = new Expression(String(backgroundEnabledExpression), expressions);
        } else if (typeof backgroundEnabledExpression === 'string') {
            backgroundEnabled = new Expression(backgroundEnabledExpression, expressions);
        } else if (defined(backgroundEnabledExpression.conditions)) {
            backgroundEnabled = new ConditionsExpression(backgroundEnabledExpression, expressions);
        }

        that._backgroundEnabled = backgroundEnabled;

        var scaleByDistance;
        if (typeof scaleByDistanceExpression === 'string') {
            scaleByDistance = new Expression(scaleByDistanceExpression, expressions);
        } else if (defined(scaleByDistanceExpression) && defined(scaleByDistanceExpression.conditions)) {
            scaleByDistance = new ConditionsExpression(scaleByDistanceExpression, expressions);
        }

        that._scaleByDistance = scaleByDistance;

        var translucencyByDistance;
        if (typeof translucencyByDistanceExpression === 'string') {
            translucencyByDistance = new Expression(translucencyByDistanceExpression, expressions);
        } else if (defined(translucencyByDistanceExpression) && defined(translucencyByDistanceExpression.conditions)) {
            translucencyByDistance = new ConditionsExpression(translucencyByDistanceExpression, expressions);
        }

        that._translucencyByDistance = translucencyByDistance;

        var distanceDisplayCondition;
        if (typeof distanceDisplayConditionExpression === 'string') {
            distanceDisplayCondition = new Expression(distanceDisplayConditionExpression, expressions);
        } else if (defined(distanceDisplayConditionExpression) && defined(distanceDisplayConditionExpression.conditions)) {
            distanceDisplayCondition = new ConditionsExpression(distanceDisplayConditionExpression, expressions);
        }

        that._distanceDisplayCondition = distanceDisplayCondition;

        var positionOffset;
        if (typeof positionOffsetExpression === 'string') {
            positionOffset = new Expression(positionOffsetExpression, expressions);
        } else if (defined(positionOffsetExpression.conditions)) {
            positionOffset  = new ConditionsExpression(positionOffsetExpression, expressions);
        }

        that._positionOffset = positionOffset;

        var anchorLineEnabled;
        if (typeof anchorLineEnabledExpression === 'boolean') {
            anchorLineEnabled = new Expression(String(anchorLineEnabledExpression), expressions);
        } else if (typeof anchorLineEnabledExpression === 'string') {
            anchorLineEnabled = new Expression(anchorLineEnabledExpression, expressions);
        } else if (defined(anchorLineEnabledExpression.conditions)) {
            anchorLineEnabled = new ConditionsExpression(anchorLineEnabledExpression, expressions);
        }

        that._anchorLineEnabled = anchorLineEnabled;

        var anchorLineColor;
        if (typeof anchorLineColorExpression === 'string') {
            anchorLineColor = new Expression(anchorLineColorExpression, expressions);
        } else if (defined(anchorLineColorExpression.conditions)) {
            anchorLineColor = new ConditionsExpression(anchorLineColorExpression, expressions);
        }

        that._anchorLineColor = anchorLineColor;

        var image;
        if (typeof(imageExpression) === 'string') {
            image = new Expression(imageExpression, expressions);
        } else if (defined(imageExpression) && defined(imageExpression.conditions)) {
            image = new ConditionsExpression(imageExpression, expressions);
        }

        that._image = image;

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

        pointColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointColor;
            },
            set : function(value) {
                this._pointColor = value;
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

        pointOutlineColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointOutlineColor;
            },
            set : function(value) {
                this._pointOutlineColor = value;
            }
        },

        pointOutlineWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._pointOutlineWidth;
            },
            set : function(value) {
                this._pointOutlineWidth = value;
            }
        },

        labelOutlineColor : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelOutlineColor;
            },
            set : function(value) {
                this._labelOutlineColor = value;
            }
        },

        labelOutlineWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelOutlineWidth;
            },
            set : function(value) {
                this._labelOutlineWidth = value;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>font</code> property.
         * <p>
         * The expression must return a <code>String</code>.
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
         *     font : '(${Temperature} > 90) ? "30px Helvetica" : "24px Helvetica"'
         * });
         * style.font.evaluate(frameState, feature); // returns a String
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override font expression with a custom function
         * style.font = {
         *     evaluate : function(frameState, feature) {
         *         return '24px Helvetica';
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
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

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>labelStyle</code> property.
         * <p>
         * The expression must return or convert to a <code>LabelStyle</code>.
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
         *     labelStyle : '(${Temperature} > 90) ? ' + LabelStyle.FILL_AND_OUTLINE + ' : ' + LabelStyle.FILL
         * });
         * style.labelStyle.evaluate(frameState, feature); // returns a Cesium.LabelStyle
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override labelStyle expression with a custom function
         * style.labelStyle = {
         *     evaluate : function(frameState, feature) {
         *         return LabelStyle.FILL;
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
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

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>text</code> property.
         * <p>
         * The expression must return a <code>String</code>.
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
         *     text : '(${Temperature} > 90) ? ">90" : "<=90"'
         * });
         * style.text.evaluate(frameState, feature); // returns a String
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override text expression with a custom function
         * style.text = {
         *     evaluate : function(frameState, feature) {
         *         return 'Example label text';
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        labelText : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._labelText;
            },
            set : function(value) {
                this._labelText = value;
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

        backgroundPadding : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._backgroundPadding;
            },
            set : function(value) {
                this._backgroundPadding = value;
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

        scaleByDistance : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._scaleByDistance;
            },
            set : function(value) {
                this._scaleByDistance = value;
            }
        },

        translucencyByDistancee : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._translucencyByDistance;
            },
            set : function(value) {
                this._translucencyByDistance = value;
            }
        },

        distanceDisplayCondition : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._distanceDisplayCondition;
            },
            set : function(value) {
                this._distanceDisplayCondition = value;
            }
        },

        positionOffset : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._positionOffset;
            },
            set : function(value) {
                this._positionOffset = value;
            }
        },

        anchorLineEnabled : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._anchorLineEnabled;
            },
            set : function(value) {
                this._anchorLineEnabled = value;
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

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>image</code> property.
         * <p>
         * The expression must return a <code>String</code>.
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
         *     image : '(${Temperature} > 90) ? "/url/to/image1" : "/url/to/image2"'
         * });
         * style.image.evaluate(frameState, feature); // returns a String
         *
         * @example
         * var style = new Cesium.Cesium3DTileStyle();
         * // Override image expression with a custom function
         * style.image = {
         *     evaluate : function(frameState, feature) {
         *         return '/url/to/image';
         *     }
         * };
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
         */
        image : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._image;
            },
            set : function(value) {
                this._image = value;
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
