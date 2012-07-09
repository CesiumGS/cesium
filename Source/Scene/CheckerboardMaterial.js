/*global define*/
define([
        '../Core/Color',
        '../Shaders/CheckerboardMaterial'
       ], function(
         Color,
         ShadersCheckerboardMaterial) {
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
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * DOC_TBA
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 0.0, 0.5);

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