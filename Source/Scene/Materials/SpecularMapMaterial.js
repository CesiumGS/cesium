/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/SpecularMapMaterial',
        '../../Scene/Materials/materialBuilder'
    ], function(
        DeveloperError,
        ShadersSpecularMapMaterial,
        materialBuilder) {
    "use strict";

    /**
     *
     * If useSpecularColor is TRUE, the specular
     * color will come from the texture's RGB components and
     * the specular intensity will come from the A component.
     * If useSpecularColor is FALSE, the specular
     * color will automatically be white and the specular
     * intensity will come from a grayscale texture.
     * Specular intensity determines how strongly a pixel is affected by
     * a light source, where 0.0 is no specular and 1.0 is full specular.
     *
     * @name SpecularMapMaterial
     * @constructor
     */
    function SpecularMapMaterial(template) {
        var t = template || {};

        /**
         * 2D RGBA texture.
         * When useSpecularColor is TRUE,
         * RGB is the specular color and A is the
         * specular intensity.
         * When useSpecularColor is FALSE,
         * the specular color is white and R is the
         * specular intensity.
         */
        this.texture = t.texture;

        /**
         * Details about this value above.
         */
        this.useSpecularColor = t.useSpecularColor;

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
                    throw new DeveloperError("Specular map texture required.");
                }
                return that.texture;
            },
            u_useSpecularColor : function() {
                return that.useSpecularColor;
            },
            u_repeat : function() {
                return {
                    x : that.sRepeat,
                    y : that.tRepeat
                };
            }
        };
    }

    SpecularMapMaterial.prototype._getShaderSource = function() {
        return materialBuilder.constructMaterial(ShadersSpecularMapMaterial);
    };

    return SpecularMapMaterial;
});

