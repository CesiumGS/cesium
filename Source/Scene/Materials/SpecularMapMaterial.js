/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/SpecularMapMaterial'
    ], function(
        DeveloperError,
        ShadersSpecularMapMaterial) {
    "use strict";

    /**
     *
     * The specular map is an RGBA texture where RGB is the
     * specular color and A is the specular intensity.
     * If the user sets useSpecularColor to false, the specular
     * intensity will be derived from a grayscale texture and
     * specular color will automatically be white.
     * Specular intensity determines how strongly a pixel is affected by
     * a light source, where 0 is no specular and 1 is full specular.
     *
     * @name SpecularMapMaterial
     * @constructor
     */
    function SpecularMapMaterial(template) {
        var t = template || {};

        /**
         * 2D RGBA texture where RGB is the
         * specular color and A is the specular intensity.
         */
        this.texture = t.texture;

        /**
         * When true, specular color comes from RGB and specular intensity
         * comes from A. When false, specular intensity comes from R and
         * specular color will automatically be white.
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
        return "#line 0\n" + ShadersSpecularMapMaterial;
    };

    return SpecularMapMaterial;
});

