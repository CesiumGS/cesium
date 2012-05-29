/*global define*/
define(['../Shaders/CheckerboardMaterial'], function(ShadersCheckerboardMaterial) {
    "use strict";

    /**
     * Checker board material with alternating light and dark colors.
     *
     * @name CheckerboardMaterial
     * @constructor
     */
    function CheckerboardMaterial(template) {
        var t = template || {};

        /**
         * Light color. Adjacent to dark colors and diagonal to light colors.
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Dark color. Adjacent to light colors and diagonal to dark colors.
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 0.0,
            alpha : 0.5
        };

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
    }

    CheckerboardMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersCheckerboardMaterial;
    };

    return CheckerboardMaterial;
});