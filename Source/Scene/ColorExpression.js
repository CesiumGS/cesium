/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties'
    ], function(
        Color,
        defined,
        defineProperties) {
    'use strict';

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ColorExpression(styleEngine, property) {
        this._styleEngine = styleEngine;
        this._propertyName = property;
    }

    defineProperties(ColorExpression.prototype, {
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
        }
    });

    /**
     * DOC_TBA
     */
    ColorExpression.prototype.evaluate = function(feature) {
        var color = feature.getProperty(this._propertyName);
        return Color.fromCssColorString(color);
    };

    return ColorExpression;
});
