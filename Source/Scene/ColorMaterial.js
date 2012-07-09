/*global define*/
define([
        '../Core/Color',
        '../Shaders/ColorMaterial'
       ], function(
         Color,
         ShadersColorMaterial) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ColorMaterial
     * @constructor
     */
    var ColorMaterial = function(template) {
        var color = typeof template === 'undefined' ? undefined : template.color;

        /**
         * DOC_TBA
         */
        this.color = typeof color !== 'undefined' ? Color.clone(color) : new Color(1.0, 0.0, 0.0, 0.5);

        var that = this;
        this._uniforms = {
            u_color : function() {
                return that.color;
            }
        };
    };

    ColorMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' + ShadersColorMaterial;
    };

    return ColorMaterial;
});
