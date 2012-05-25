/*global define*/
define(['../Shaders/CheckerboardMaterial'], function(ShadersCheckerboardMaterial) {
    "use strict";

    /**
     * Checkerboard material with alternating colors
     *
     * @name CheckerboardMaterial
     * @constructor
     */
    function CheckerboardMaterial(template) {
        var t = template || {};

        /**
         * Light color
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Dark color
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 0.0,
            alpha : 0.5
        };

        /**
         * Number of cells in the x directions
         *
         * @type Number
         */
        this.sRepeat = t.sRepeat || 10.0;

        /**
         * Number of cells in the y directions
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