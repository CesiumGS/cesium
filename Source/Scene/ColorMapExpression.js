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
                if (this._default !== value) {
                    this._default = value.slice(0);
                    this._styleEngine.makeDirty();

                    setRuntime(this);
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

        var defaultColor = this._runtimeDefault;
        var runtimeMap = this._runtimeMap;
        if (defined(runtimeMap)) {
            return defaultValue(runtimeMap[value], defaultColor);
        }

        return defaultColor;
    };

    return ColorMapExpression;
});
