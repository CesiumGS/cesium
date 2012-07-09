/*global define*/
define([
        '../Core/Color',
        '../Shaders/HorizontalStripeMaterial'
       ], function(
         Color,
         ShadersHorizontalStripeMaterial) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias HorizontalStripeMaterial
     * @constructor
     */
    var HorizontalStripeMaterial = function(template) {
        var t = template || {};

        /**
         * DOC_TBA
         */
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * DOC_TBA
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 1.0, 0.5);

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
    };

    HorizontalStripeMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' + ShadersHorizontalStripeMaterial;
    };

    return HorizontalStripeMaterial;
});