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
     * Combines an alpha map with a diffuse map.
     * Alpha map: Grayscale texture where black is 0% alpha
     * and white is 100% alpha.
     * Diffuse map: Any 2D RGB texture.
     *
     * @name AlphaMapMaterial
     * @constructor
     */
    function AlphaMapMaterial(template) {
        var t = template || {};

        /**
         *  2D RGB grayscale alpha map texture.
         */
        this.alphaMapTexture = t.alphaMapTexture;

        /**
         *  2D RGB diffuse map texture.
         */
        this.diffuseMapTexture = t.diffuseMapTexture;

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
            u_alphaMapTexture : function() {
                if (typeof that.alphaMapTexture === 'undefined') {
                    throw new DeveloperError("Alpha map required.");
                }
                return that.alphaMapTexture;
            },
            u_diffuseMapTexture : function() {
                if (typeof that.diffuseMapTexture === 'undefined') {
                    throw new DeveloperError("Diffuse map required.");
                }
                return that.diffuseMapTexture;
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

