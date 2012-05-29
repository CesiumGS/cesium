/*global define*/
define(['../Shaders/ColorMaterial'], function(ShadersColorMaterial) {
    "use strict";

    /**
     * A material with a single color.
     *
     * @name ColorMaterial
     * @constructor
     */
    function ColorMaterial(template) {
        var t = template || {};

        /**
         * Color of the material.
         */
        this.color = t.color || {
            red : 1.0,
            green : 0.0,
            blue : 0.0,
            alpha : 0.5
        };

        var that = this;
        this._uniforms = {
            u_color : function() {
                return that.color;
            }
        };
    }

    ColorMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersColorMaterial;
    };

    return ColorMaterial;
});