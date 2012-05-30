/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/AlphaMapMaterial'
    ], function(
        DeveloperError,
        ShadersAlphaMapMaterial) {
    "use strict";

    /**
     *
     * Contains a texture as an alpha map.
     * Input: Grayscale image where black is 0% alpha
     * and white is 100% alpha.
     * Result: Black background with transparent areas where
     * the texture was dark/black.
     *
     * @name AlphaMapMaterial
     * @constructor
     */
    function AlphaMapMaterial(template) {
        var t = template || {};

        /**
         *  2D RGB grayscale alpha map texture.
         */
        this.texture = t.texture;

        /**
         * Number of texture repeats in the x direction.
         *
         * type {Number}
         */
        this.sRepeat = t.sRepeat || 1.0;

        /**
         * Number of texture repeats in the y direction.
         *
         * type {Number}
         */
        this.tRepeat = t.tRepeat || 1.0;

        var that = this;
        this._uniforms = {
            u_texture : function() {
                if (typeof that.texture === 'undefined') {
                    throw new DeveloperError("AlphaMapMaterial requires a texture.");
                }

                return that.texture;
            },
            u_repeat : function() {
                return {
                    x : that.sRepeat,
                    y : that.tRepeat
                };
            }
        };
    }

    AlphaMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersAlphaMapMaterial;
    };

    return AlphaMapMaterial;
});

