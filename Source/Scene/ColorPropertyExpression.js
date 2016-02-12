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

    // TODO: best name/directory for this?

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ColorPropertyExpression(styleEngine, property) {
        this._styleEngine = styleEngine;
        this._propertyName = property;
    }

    defineProperties(ColorPropertyExpression.prototype, {
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
    ColorPropertyExpression.prototype.evaluate = function(feature) {
        var name = feature.getProperty(this._propertyName);
        if (typeof(name) === 'string' && defined(name)) {
            var color = Color.fromCssColorString(name);
            if (defined(color)) {
                return color;
            }
        }
    };

    return ColorPropertyExpression;
});
