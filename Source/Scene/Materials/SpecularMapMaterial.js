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
     * Contains a grayscale texture as a specular map.
     * Specular intensity determines how strongly a pixel is affected by
     * a light source, where 0.0 is no specular and 1.0 is full specular.
     *
     * @name SpecularMapMaterial
     * @constructor
     */
    function SpecularMapMaterial(template) {
        var t = template || {};

        /**
         * 2D grayscale texture.
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
                    throw new DeveloperError("Specular map texture required.");
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

    SpecularMapMaterial.prototype._getShaderSource = function() {
        return materialBuilder.constructMaterial(ShadersSpecularMapMaterial);
    };

    return SpecularMapMaterial;
});

