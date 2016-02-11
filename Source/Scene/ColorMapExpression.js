/*global define*/
define([
       '../Core/clone',
       '../Core/Color',
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError',
    ], function(
        clone,
        Color,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError) {
    'use strict';

    // TODO: best name/directory for this?

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ColorMapExpression(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;
        this._propertyName = jsonExpression.propertyName;
        this._map = clone(jsonExpression.map, true);
        this._default = jsonExpression.default.slice(0);

        this._runtimeMap = undefined;
        this._runtimeDefault = new Color();

        setRuntime(this);
    }

    defineProperties(ColorMapExpression.prototype, {
        /**
         * DOC_TBA
         */
        propertyName : {
            get : function() {
                return this._propertyName;
            },
            set : function(value) {
                if (this._propertyName !== value) {
                    this._propertyName = value;
                    this._styleEngine.makeDirty();

                    setRuntime(this);
                }
            }
        },

        /**
         * DOC_TBA
         */
        map : {
            get : function() {
                return this._map;
            },
            set : function(value) {
                this._map = clone(value, true);
                this._styleEngine.makeDirty();

                setRuntime(this);
            }
        },

        /**
         * DOC_TBA
         */
        default : {
            get : function() {
                return this._default;
            },
            set : function(value) {
                this._default = value.slice(0);
                this._styleEngine.makeDirty();

                setRuntime(this);
            }
        }
    });

    function setRuntime(expression) {
        var map = expression._map;

        var runtimeMap = [];
        for (var name in map) {
            if (map.hasOwnProperty(name)) {
                var color = Color.fromCssColorString(map[name]);
                //>>includeStart('debug', pragmas.debug);
                if (color === undefined) {
                    throw new DeveloperError('color must be defined');
                }
                //>>includeEnd('debug');

                runtimeMap.push({
                    color : color,
                    pattern : new RegExp(name)
                });
            }
        }

        expression._runtimeMap = runtimeMap;

        var c = expression._default;
        if (defined(c)) {
            expression._runtimeDefault = Color.clone(Color.fromCssColorString(c), expression._runtimeDefault);
        } else {
            expression._runtimeDefault = Color.clone(Color.WHITE, expression._runtimeDefault);
        }
    }

    /**
     * DOC_TBA
     */
    ColorMapExpression.prototype.evaluate = function(feature) {
        var name = feature.getProperty(this._propertyName);

        var defaultColor = this._runtimeDefault;
        var runtimeMap = this._runtimeMap;
        if (defined(runtimeMap)) {
            for (var entry in runtimeMap) {
                if (runtimeMap.hasOwnProperty(entry)) {
                    if (runtimeMap[entry].pattern.test(name)) {
                        return runtimeMap[entry].color;
                    }
                }
            }
        }

        return defaultColor;
    };

    return ColorMapExpression;
});
