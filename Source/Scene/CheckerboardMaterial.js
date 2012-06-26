/*global define*/
/**
 * @exports Scene/CheckerboardMaterial
 */
define(['../Shaders/CheckerboardMaterial'], function(ShadersCheckerboardMaterial) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CheckerboardMaterial
     * @constructor
     */
    var CheckerboardMaterial = function(template) {
        var t = template || {};

        /**
         * DOC_TBA
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * DOC_TBA
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 0.0,
            alpha : 0.5
        };

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.sRepeat = t.sRepeat || 10.0;

        /**
         * DOC_TBA
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
    };

    CheckerboardMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' + ShadersCheckerboardMaterial;
    };

    return CheckerboardMaterial;
});