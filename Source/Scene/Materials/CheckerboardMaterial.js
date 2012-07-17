/*global define*/
define([
        '../../Core/Color',
        '../../Shaders/Materials/CheckerboardMaterial'
       ], function(
         Color,
         ShadersCheckerboardMaterial) {
    "use strict";

    /**
     * Checkerboard material with alternating light and dark colors.
     *
     * @alias CheckerboardMaterial
     * @constructor
     */
    var CheckerboardMaterial = function(template) {
        var t = template || {};

        /**
         * Light color. Adjacent to dark colors and diagonal to light colors.
         */
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * Dark color. Adjacent to light colors and diagonal to dark colors.
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 0.0, 0.5);

        /**
         * Number of cells in the x direction.
         *
         * @type Number
         */
        this.sRepeat = t.sRepeat || 10.0;

        /**
         * Number of cells in the y direction.
         *
         * @type Number
         */
        this.tRepeat = t.tRepeat || 10.0;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this._shaderSource = ShadersCheckerboardMaterial;

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

    CheckerboardMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this._shaderSource;
    };

    return CheckerboardMaterial;
});