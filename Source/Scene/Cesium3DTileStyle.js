define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/loadJson',
        '../ThirdParty/when',
        './ConditionsExpression',
        './Expression'
    ], function(
        clone,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        loadJson,
        when,
        ConditionsExpression,
        Expression) {
    'use strict';

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
        this._color = undefined;
        this._show = undefined;
        this._pointSize = undefined;
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

        that.color = styleJson.color;
        that.show = styleJson.show;
        that.pointSize = styleJson.pointSize;

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
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>show</code> property. Alternatively a boolean, string, or object defining a show style can be used.
         * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
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
                var defines = defaultValue(this._style, defaultValue.EMPTY_OBJECT).defines;
                if (!defined(value)) {
                    this._show = undefined;
                } else if (typeof value === 'boolean') {
                    this._show = new Expression(String(value));
                } else if (typeof value === 'string') {
                    this._show = new Expression(value, defines);
                } else if (defined(value.conditions)) {
                    this._show = new ConditionsExpression(value, defines);
                } else {
                    this._show = value;
                }
                this._showShaderFunctionReady = false;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>color</code> property. Alternatively a string or object defining a color style can be used.
         * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
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
                var defines = defaultValue(this._style, defaultValue.EMPTY_OBJECT).defines;
                if (!defined(value)) {
                    this._color = undefined;
                } else if (typeof value === 'string') {
                    this._color = new Expression(value, defines);
                } else if (defined(value.conditions)) {
                    this._color = new ConditionsExpression(value, defines);
                } else {
                    this._color = value;
                }
                this._colorShaderFunctionReady = false;
            }
        },

        /**
         * Gets or sets the {@link StyleExpression} object used to evaluate the style's <code>pointSize</code> property. Alternatively a number, string, or object defining a pointSize style can be used.
         * The getter will return the internal {@link Expression} or {@link ConditionsExpression}, which may differ from the value provided to the setter.
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
                var defines = defaultValue(this._style, defaultValue.EMPTY_OBJECT).defines;
                if (!defined(value)) {
                    this._pointSize = undefined;
                } else if (typeof value === 'number') {
                    this._pointSize = new Expression(String(value));
                } else if (typeof value === 'string') {
                    this._pointSize = new Expression(value, defines);
                } else if (defined(value.conditions)) {
                    this._pointSize = new ConditionsExpression(value, defines);
                } else {
                    this._pointSize = value;
                }
                this._pointSizeShaderFunctionReady = false;
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
        this._colorShaderFunction = defined(this.color) ? this.color.getShaderFunction(functionName, attributePrefix, shaderState, 'vec4') : undefined;
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
        this._showShaderFunction = defined(this.show) ? this.show.getShaderFunction(functionName, attributePrefix, shaderState, 'bool') : undefined;
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
        this._pointSizeShaderFunction = defined(this.pointSize) ? this.pointSize.getShaderFunction(functionName, attributePrefix, shaderState, 'float') : undefined;
        return this._pointSizeShaderFunction;
    };

    return Cesium3DTileStyle;
});
