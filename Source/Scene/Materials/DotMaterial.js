/*global define*/
define([
        '../../Shaders/Materials/DotMaterial'
    ], function(
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
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Background color.
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 0.5
        };

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
        this.shaderSource = ShadersDotMaterial;

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
               this.shaderSource;
    };

    return DotMaterial;
});