/*global define*/
define([
        '../../Shaders/Materials/VerticalStripeMaterial'
    ], function(
        ShadersVerticalStripeMaterial) {
    "use strict";

    /**
     * Alternating light and dark vertical stripes.
     *
     * @alias VerticalStripeMaterial
     * @constructor
     */
    var VerticalStripeMaterial = function(template) {
        var t = template || {};

        /**
         * Color of the light stripes.
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Color of the dark stripes.
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * How much the stripes are shifted vertically from the starting point.
         *
         * @type Number
         */
        this.offset = t.offset || 0.0;

        /**
         * The total number of stripes, half dark and half light.
         *
         * @type Number
         */
        this.repeat = t.repeat || 10.0;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this._shaderSource = ShadersVerticalStripeMaterial;

        var that = this;
        this._uniforms = {
            u_lightColor : function() {
                return that.lightColor;
            },
            u_darkColor : function() {
                return that.darkColor;
            },
            u_offset : function() {
                return that.offset;
            },
            u_repeat : function() {
                return that.repeat;
            }
        };
    };

    VerticalStripeMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this._shaderSource;
    };

    return VerticalStripeMaterial;
});