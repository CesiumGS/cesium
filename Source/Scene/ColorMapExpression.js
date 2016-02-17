/*global define*/
define([
       '../Core/clone',
       '../Core/Color',
       '../Core/defaultValue',
       '../Core/defined',
       '../Core/defineProperties'
    ], function(
        clone,
        Color,
        defaultValue,
        defined,
        defineProperties) {
    'use strict';

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ColorMapExpression(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;
        this._propertyName = jsonExpression.propertyName;
        if (defined(jsonExpression.pattern)) {
            this._pattern = new RegExp(jsonExpression.pattern);
        }
        this._map = clone(jsonExpression.map, true);
        this._default = jsonExpression.default;

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
                }
            }
        },

        /**
         * DOC_TBA
         */
        pattern : {
            get : function() {
                return this._pattern;
            },
            set : function(value) {
                if (this._pattern !== value) {
                    this._pattern = value;
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
                return this._runtimeMap;
            },
            set : function(value) {
                this._runtimeMap = clone(value, true);
                this._styleEngine.makeDirty();
            }
        },

        /**
         * DOC_TBA
         */
        default : {
            get : function() {
                return this._runtimeDefault;
            },
            set : function(value) {
                if (!this._runtimeDefault.equals(value)) {
                    this._runtimeDefault = value;
                    this._styleEngine.makeDirty();
                }
            }
        }
    });

    function setRuntime(expression) {
        // PERFORMANCE_IDEA: this will be in dictionary mode, can we do something faster?
        var runtimeMap = {};
        var map = expression._map;
        for (var name in map) {
            if (map.hasOwnProperty(name)) {
                var color = map[name];
                runtimeMap[name] = Color.fromCssColorString(color);
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
        var value = feature.getProperty(this._propertyName);
        var key;

        if (defined(this._pattern)) {
            var match = this._pattern.exec(value);
            if (defined(match)) {
                key = match[1];
            }
        } else {
            key = value;
        }

        var defaultColor = this._runtimeDefault;
        var runtimeMap = this._runtimeMap;
        if (defined(runtimeMap)) {
            return defaultValue(runtimeMap[key], defaultColor);
        }

        return defaultColor;
    };

    return ColorMapExpression;
});
