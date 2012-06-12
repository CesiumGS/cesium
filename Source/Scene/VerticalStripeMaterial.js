/*global define*/
define(['../Shaders/VerticalStripeMaterial'], function(ShadersVerticalStripeMaterial) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name VerticalStripeMaterial
     * @constructor
     */
    function VerticalStripeMaterial(template) {
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
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.offset = t.offset || 0.0;

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.repeat = t.repeat || 10.0;

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
    }

    VerticalStripeMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' + ShadersVerticalStripeMaterial;
    };

    return VerticalStripeMaterial;
});