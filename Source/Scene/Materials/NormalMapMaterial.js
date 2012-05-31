/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/NormalMapMaterial'
    ], function(
        DeveloperError,
        ShadersNormalMapMaterial) {
    "use strict";

    /**
     *
     * The normal map is an RGB texture where each fragment's normal is
     * offset in the x, y, and z directions by the texture's R, G, and B
     * components in tangent space.
     * Since the computation is done in tangent space,
     * the B value should usually be the same for all pixels.
     *
     * @name NormalMapMaterial
     * @constructor
     */
    function NormalMapMaterial(template) {
        var t = template || {};

        /**
         * 2D RGB normal map texture.
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
                    throw new DeveloperError("Normal map texture required.");
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

    NormalMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersNormalMapMaterial;
    };

    return NormalMapMaterial;
});

