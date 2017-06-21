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
    var DEFAULT_JSON_HEIGHT_OFFSET_EXPRESSION = 0.0;
    var DEFAULT_JSON_ACHOR_LINE_ENABLED_EXPRESSION = false;
    var DEFAULT_JSON_ANCHOR_LINE_COLOR_EXPRESSION = 'color("#ffffff")';

    /**
     * A style that is applied to a {@link Cesium3DTileset}.
     * <p>
     * Evaluates an expression defined using the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
     * </p>
     *
     * @alias Cesium3DTileStyle
     * @constructor
     *
     * @param {String|Object} [style] The url of a style or an object defining a style.
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
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     */
    function Cesium3DTileStyle(style) {
        this._style = undefined;
        this._ready = false;

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
        this._heightOffset = undefined;
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

        var promise;
        if (typeof style === 'string') {
            promise = loadJson(style);
        } else {
            promise = when.resolve(style);
        }

        var that = this;
        this._readyPromise = promise.then(function(styleJson) {
            setup(that, styleJson);
            return that;
        });
    }

    function setup(that, styleJson) {
        that._style = clone(styleJson, true);

        styleJson = defaultValue(styleJson, defaultValue.EMPTY_OBJECT);

        that._colorShaderFunctionReady = !defined(styleJson.color);
        that._showShaderFunctionReady = !defined(styleJson.show);
        that._pointSizeShaderFunctionReady = !defined(styleJson.pointSize);

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
        var heightOffsetExpression = defaultValue(styleJson.heightOffset, DEFAULT_JSON_HEIGHT_OFFSET_EXPRESSION);
        var anchorLineEnabledExpression = defaultValue(styleJson.anchorLineEnabled, DEFAULT_JSON_ACHOR_LINE_ENABLED_EXPRESSION);
        var anchorLineColorExpression = defaultValue(styleJson.anchorLineColor, DEFAULT_JSON_ANCHOR_LINE_COLOR_EXPRESSION);
        var imageExpression = styleJson.image;

        var defines = styleJson.defines;

        var show;
        if (typeof showExpression === 'boolean') {
            show = new Expression(String(showExpression), defines);
        } else if (typeof showExpression === 'string') {
            show = new Expression(showExpression, defines);
        } else if (defined(showExpression.conditions)) {
            show = new ConditionsExpression(showExpression, defines);
        }

        that._show = show;

        var color;
        if (typeof colorExpression === 'string') {
            color = new Expression(colorExpression, defines);
        } else if (defined(colorExpression.conditions)) {
            color = new ConditionsExpression(colorExpression, defines);
        }

        that._color = color;

        var pointColor;
        if (typeof pointColorExpression === 'string') {
            pointColor = new Expression(pointColorExpression, defines);
        } else if (defined(pointColorExpression.conditions)) {
            pointColor = new ConditionsExpression(pointColorExpression, defines);
        }

        that._pointColor = pointColor;

        var pointSize;
        if (typeof pointSizeExpression === 'number') {
            pointSize = new Expression(String(pointSizeExpression), defines);
        } else if (typeof pointSizeExpression === 'string') {
            pointSize = new Expression(pointSizeExpression, defines);
        } else if (defined(pointSizeExpression.conditions)) {
            pointSize = new ConditionsExpression(pointSizeExpression, defines);
        }

        that._pointSize = pointSize;

        var pointOutlineColor;
        if (typeof pointOutlineColorExpression === 'string') {
            pointOutlineColor = new Expression(pointOutlineColorExpression, defines);
        } else if (defined(pointOutlineColorExpression.conditions)) {
            pointOutlineColor = new ConditionsExpression(pointOutlineColorExpression, defines);
        }

        that._pointOutlineColor = pointOutlineColor;

        var pointOutlineWidth;
        if (typeof pointOutlineWidthExpression === 'number') {
            pointOutlineWidth = new Expression(String(pointOutlineWidthExpression), defines);
        } else if (typeof pointOutlineWidthExpression === 'string') {
            pointOutlineWidth = new Expression(pointOutlineWidthExpression, defines);
        } else if (defined(pointOutlineWidthExpression.conditions)) {
            pointOutlineWidth = new ConditionsExpression(pointOutlineWidthExpression, defines);
        }

        that._pointOutlineWidth = pointOutlineWidth;

        var labelOutlineColor;
        if (typeof labelOutlineColorExpression === 'string') {
            labelOutlineColor = new Expression(labelOutlineColorExpression, defines);
        } else if (defined(labelOutlineColorExpression.conditions)) {
            labelOutlineColor = new ConditionsExpression(labelOutlineColorExpression, defines);
        }

        that._labelOutlineColor = labelOutlineColor;

        var labelOutlineWidth;
        if (typeof labelOutlineWidthExpression === 'number') {
            labelOutlineWidth = new Expression(String(labelOutlineWidthExpression), defines);
        } else if (typeof labelOutlineWidthExpression === 'string') {
            labelOutlineWidth = new Expression(labelOutlineWidthExpression, defines);
        } else if (defined(labelOutlineWidthExpression.conditions)) {
            labelOutlineWidth = new ConditionsExpression(labelOutlineWidthExpression, defines);
        }

        that._labelOutlineWidth = labelOutlineWidth;

        var labelStyle;
        if (typeof labelStyleExpression === 'number') {
            labelStyle = new Expression(String(labelStyleExpression), defines);
        } else if (typeof labelStyleExpression === 'string') {
            labelStyle = new Expression(labelStyleExpression, defines);
        } else if (defined(labelStyleExpression.conditions)) {
            labelStyle = new ConditionsExpression(labelStyleExpression, defines);
        }

        that._labelStyle = labelStyle;

        var font;
        if (typeof fontExpression === 'string') {
            font = new Expression(fontExpression, defines);
        } else if (defined(fontExpression.conditions)) {
            font = new ConditionsExpression(fontExpression, defines);
        }

        that._font = font;

        var labelText;
        if (typeof(labelTextExpression) === 'string') {
            labelText = new Expression(labelTextExpression, defines);
        } else if (defined(labelTextExpression) && defined(labelTextExpression.conditions)) {
            labelText = new ConditionsExpression(labelTextExpression, defines);
        }

        that._labelText = labelText;

        var backgroundColor;
        if (typeof backgroundColorExpression === 'string') {
            backgroundColor = new Expression(backgroundColorExpression, defines);
        } else if (defined(backgroundColorExpression) && defined(backgroundColorExpression.conditions)) {
            backgroundColor = new ConditionsExpression(backgroundColorExpression, defines);
        }

        that._backgroundColor = backgroundColor;

        var backgroundPadding;
        if (typeof backgroundPaddingExpression === 'string') {
            backgroundPadding = new Expression(backgroundPaddingExpression, defines);
        } else if (defined(backgroundPaddingExpression) && defined(backgroundPaddingExpression.conditions)) {
            backgroundPadding = new ConditionsExpression(backgroundPaddingExpression, defines);
        }

        that._backgroundPadding = backgroundPadding;

        var backgroundEnabled;
        if (typeof backgroundEnabledExpression === 'boolean') {
            backgroundEnabled = new Expression(String(backgroundEnabledExpression), defines);
        } else if (typeof backgroundEnabledExpression === 'string') {
            backgroundEnabled = new Expression(backgroundEnabledExpression, defines);
        } else if (defined(backgroundEnabledExpression.conditions)) {
            backgroundEnabled = new ConditionsExpression(backgroundEnabledExpression, defines);
        }

        that._backgroundEnabled = backgroundEnabled;

        var scaleByDistance;
        if (typeof scaleByDistanceExpression === 'string') {
            scaleByDistance = new Expression(scaleByDistanceExpression, defines);
        } else if (defined(scaleByDistanceExpression) && defined(scaleByDistanceExpression.conditions)) {
            scaleByDistance = new ConditionsExpression(scaleByDistanceExpression, defines);
        }

        that._scaleByDistance = scaleByDistance;

        var translucencyByDistance;
        if (typeof translucencyByDistanceExpression === 'string') {
            translucencyByDistance = new Expression(translucencyByDistanceExpression, defines);
        } else if (defined(translucencyByDistanceExpression) && defined(translucencyByDistanceExpression.conditions)) {
            translucencyByDistance = new ConditionsExpression(translucencyByDistanceExpression, defines);
        }

        that._translucencyByDistance = translucencyByDistance;

        var distanceDisplayCondition;
        if (typeof distanceDisplayConditionExpression === 'string') {
            distanceDisplayCondition = new Expression(distanceDisplayConditionExpression, defines);
        } else if (defined(distanceDisplayConditionExpression) && defined(distanceDisplayConditionExpression.conditions)) {
            distanceDisplayCondition = new ConditionsExpression(distanceDisplayConditionExpression, defines);
        }

        that._distanceDisplayCondition = distanceDisplayCondition;

        var heightOffset;
        if (typeof heightOffsetExpression === 'number') {
            heightOffset = new Expression(String(heightOffsetExpression), defines);
        } else if (typeof heightOffsetExpression === 'string') {
            heightOffset = new Expression(heightOffsetExpression, defines);
        } else if (defined(heightOffsetExpression.conditions)) {
            heightOffset  = new ConditionsExpression(heightOffsetExpression, defines);
        }

        that._heightOffset = heightOffset;

        var anchorLineEnabled;
        if (typeof anchorLineEnabledExpression === 'boolean') {
            anchorLineEnabled = new Expression(String(anchorLineEnabledExpression), defines);
        } else if (typeof anchorLineEnabledExpression === 'string') {
            anchorLineEnabled = new Expression(anchorLineEnabledExpression, defines);
        } else if (defined(anchorLineEnabledExpression.conditions)) {
            anchorLineEnabled = new ConditionsExpression(anchorLineEnabledExpression, defines);
        }

        that._anchorLineEnabled = anchorLineEnabled;

        var anchorLineColor;
        if (typeof anchorLineColorExpression === 'string') {
            anchorLineColor = new Expression(anchorLineColorExpression, defines);
        } else if (defined(anchorLineColorExpression.conditions)) {
            anchorLineColor = new ConditionsExpression(anchorLineColorExpression, defines);
        }

        that._anchorLineColor = anchorLineColor;

        var image;
        if (typeof(imageExpression) === 'string') {
            image = new Expression(imageExpression, defines);
        } else if (defined(imageExpression) && defined(imageExpression.conditions)) {
            image = new ConditionsExpression(imageExpression, defines);
        }

        that._image = image;

        var meta = {};
        if (defined(styleJson.meta)) {
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

        heightOffset : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('The style is not loaded.  Use Cesium3DTileStyle.readyPromise or wait for Cesium3DTileStyle.ready to be true.');
                }
                //>>includeEnd('debug');

                return this._heightOffset;
            },
            set : function(value) {
                this._heightOffset = value;
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
