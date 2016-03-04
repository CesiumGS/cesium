/*global define*/
define([
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError',
       '../Core/isArray',
       '../Core/loadJson',
       '../Core/RequestScheduler',
       '../ThirdParty/when',
       './ConditionalExpression',
       './Expression'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        isArray,
        loadJson,
        RequestScheduler,
        when,
        ConditionalExpression,
        Expression) {
    'use strict';

    var DEFAULT_JSON_COLOR_EXPRESSION = 'color("#ffffff")';
    var DEFAULT_JSON_BOOLEAN_EXPRESSION = true;

    /**
     * DOC_TBA
     */
    function Cesium3DTileStyle (tileset, data) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tileset)) {
            throw new DeveloperError('tileset is required.');
        }
        //>>includeEnd('debug');

        this._color = undefined;
        this._show = undefined;
        this._readyPromise = when.defer();
        this._ready = false;

        var style = this;
        if (typeof data === 'string') {
            RequestScheduler.request(data, loadJson).then(function(styleJson) {
                setup(style, tileset, styleJson);
                style._readyPromise.resolve(style);
            }).otherwise(function(error) {
                style._readyPromise.reject(error);
            });
        } else {
            setup(style, tileset, data);
            style._readyPromise.resolve(style);
        }
    }

    function setup (that, tileset, styleJson) {
        styleJson = defaultValue(styleJson, defaultValue.EMPTY_OBJECT);
        var colorExpression = defaultValue(styleJson.color, DEFAULT_JSON_COLOR_EXPRESSION);
        var showExpression = defaultValue(styleJson.show, DEFAULT_JSON_BOOLEAN_EXPRESSION);

        var styleEngine = tileset.styleEngine;

        var color;
        if (typeof(colorExpression) === 'string') {
            color = new Expression(styleEngine, colorExpression);
        } else if (defined(colorExpression.conditions)) {
            color = new ConditionalExpression(styleEngine, colorExpression);
        }

        that._color = color;

        var show;
        if (typeof(showExpression) === 'boolean') {
            show = new Expression(styleEngine, String(showExpression));
        } else if (typeof(showExpression) === 'string') {
            show = new Expression(styleEngine, showExpression);
        }

        that._show = show;

        that._ready = true;
    }

    defineProperties(Cesium3DTileStyle.prototype, {
        /**
         * DOC_TBA
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * DOC_TBA
         */
        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        /**
         * DOC_TBA
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
         * DOC_TBA
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
        }
    });

    return Cesium3DTileStyle;
});
