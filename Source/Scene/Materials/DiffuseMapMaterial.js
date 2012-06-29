/*global define*/
define([
        '../../Core/DeveloperError',
        './replaceMaterialChannels',
        '../../Shaders/Materials/DiffuseMapMaterial'
    ], function(
        DeveloperError,
        replaceMaterialChannels,
        ShadersDiffuseMapMaterial) {
    "use strict";

    /**
     *
     * Contains an RGBA texture as a diffuse map.
     *
     * @name DiffuseMapMaterial
     * @constructor
     */
    function DiffuseMapMaterial(template) {
        var t = template || {};

        /**
         *  2D RGBA diffuse map texture.
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
        this.shaderSource = replaceMaterialChannels(ShadersDiffuseMapMaterial, 'diffuse_map_material_channels', this.channels, 3);

        var that = this;
        this._uniforms = {
            u_texture : function() {
                if (typeof that.texture === 'undefined') {
                    throw new DeveloperError("DiffuseMapMaterial requires a texture.");
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

    DiffuseMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return DiffuseMapMaterial;
});

