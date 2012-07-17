/*global define*/
define([
        '../Core/Color',
        '../Shaders/DotMaterial'
       ], function(
         Color,
         ShadersDotMaterial) {
    "use strict";

    /**
     * A pattern of dots organized by row and column.
     *
     * @alias DotMaterial
     * @constructor
     */
    var DotMaterial = function(template) {
        var t = template || {};

        /**
         * Dot color.
         */
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * Background color.
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 1.0, 0.5);

        /**
         * Number of dots in the x direction.
         *
         * @type Number
         */
        this.sRepeat = t.sRepeat || 10.0;

        /**
         * Number of dots in the y direction.
         *
         * @type Number
         */
        this.tRepeat = t.tRepeat || 10.0;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this._shaderSource = ShadersDotMaterial;

        var that = this;
        this._uniforms = {
            u_lightColor : function() {
                return that.lightColor;
            },
            u_darkColor : function() {
                return that.darkColor;
            },
            u_repeat : function() {
                return {
                    x : that.sRepeat,
                    y : that.tRepeat
                };
            }
        };
    };

    DotMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this._shaderSource;
    };

    return DotMaterial;
});