/*global define*/
define([
        '../../Core/Color',
        '../../Shaders/Materials/VerticalStripeMaterial'
       ], function(
         Color,
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
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * Color of the dark stripes.
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 1.0, 0.5);

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