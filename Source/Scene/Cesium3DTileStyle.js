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
       './Expression'
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
        Expression) {
    'use strict';

    var DEFAULT_JSON_COLOR_EXPRESSION = 'color("#ffffff")';
    var DEFAULT_JSON_BOOLEAN_EXPRESSION = true;

    /**
     * <p>
     * Evaluates an expression defined using the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
     * </p>
     *
     * @alias Cesium3DTileStyle
     * @constructor
     *
     * @param {String|Object} [data] The url of a style or an object defining a style.
     *
     * @example
     * tileset.style = new Cesium.Cesium3DTileStyle({
     *     color : {
     *         conditions : {
     *             '${Height} >= 100' : 'color("purple", 0.5)',
     *             '${Height} >= 50' : 'color("red")',
     *             'true' : 'color("blue")'
     *         }
     *     },
     *     show : '${Height} > 0',
     *     meta : {
     *         description : '"Building id ${id} has height ${Height}."'
     *     }
     * });
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     */
    function Cesium3DTileStyle(data) {
        this._style = undefined;
        this._ready = false;
        this._readyPromise = when.defer();
        this._color = undefined;
        this._show = undefined;
        this._meta = undefined;

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
        var colorExpression = defaultValue(styleJson.color, DEFAULT_JSON_COLOR_EXPRESSION);
        var showExpression = defaultValue(styleJson.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);

        var color;
        if (typeof(colorExpression) === 'string') {
            color = new Expression(colorExpression);
        } else if (defined(colorExpression.conditions)) {
            color = new ConditionsExpression(colorExpression);
        }

        that._color = color;

        var show;
        if (typeof(showExpression) === 'boolean') {
            show = new Expression(String(showExpression));
        } else if (typeof(showExpression) === 'string') {
            show = new Expression(showExpression);
        }

        that._show = show;

        var meta = {};
        if (defined(styleJson.meta)) {
            var metaJson = defaultValue(styleJson.meta, defaultValue.EMPTY_OBJECT);
            for (var property in metaJson) {
                if (metaJson.hasOwnProperty(property)) {
                    meta[property] = new Expression(metaJson[property]);
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
                this._color = value;
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
         * style.meta.description.evaluate(feature); // returns a String with the substituted variables
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
        },

    });

    return Cesium3DTileStyle;
});
