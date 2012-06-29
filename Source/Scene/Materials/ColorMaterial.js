/*global define*/
define([
        '../../Core/Color',
        '../../Shaders/Materials/ColorMaterial'
       ], function(
         Color,
         ShadersColorMaterial) {
    "use strict";

    /**
     * A material with a single color.
     *
     * @alias ColorMaterial
     * @constructor
     */
    var ColorMaterial = function(template) {
        var color = typeof template === 'undefined' ? undefined : template.color;

        /**
         * Color of the material.
         */
        this.color = typeof color !== 'undefined' ? new Color(color.red, color.green, color.blue, color.alpha) : new Color(1.0, 0.0, 0.0, 0.5);

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this.shaderSource = ShadersColorMaterial;

        var that = this;
        this._uniforms = {
            u_color : function() {
                return that.color;
            }
        };
    };

    ColorMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return ColorMaterial;
});
