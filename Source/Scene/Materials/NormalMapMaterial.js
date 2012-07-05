/*global define*/
define([
        '../../Core/DeveloperError',
        './replaceMaterialChannels',
        '../../Shaders/Materials/NormalMapMaterial'
    ], function(
        DeveloperError,
        replaceMaterialChannels,
        ShadersNormalMapMaterial) {
    "use strict";

    /**
     *
     * Each fragment's normal is offset in the x, y and z directions
     * in tangent space based on the associated R, G, and B values in
     * the normal map texture.
     *
     * @name NormalMapMaterial
     * @constructor
     */
    function NormalMapMaterial(template) {
        var t = template || {};

        /**
         * 2D RGB tangent space normal map texture.
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

        /**
         * Channels used for sampling the texture.
         *
         * type {String}
         */
        this.channels = t.channels || 'rgb';
        this._shaderSource = replaceMaterialChannels(ShadersNormalMapMaterial, 'normal_map_material_channels', this.channels, 3);

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
        return "#line 0\n" +
               this._shaderSource;
    };

    return NormalMapMaterial;
});

