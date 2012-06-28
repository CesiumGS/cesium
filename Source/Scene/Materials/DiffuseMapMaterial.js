/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/DiffuseMapMaterial'
    ], function(
        DeveloperError,
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
         * The glsl shader source
         *
         * type {String}
         */
        var channels = t.channels || 'rgb';
        this.shaderSource = this._replaceChannels(ShadersDiffuseMapMaterial, channels, 3);

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

    DiffuseMapMaterial.prototype._replaceChannels = function(source, channels, numChannels) {
        channels = channels.toLowerCase();
        if (channels.length !== numChannels) {
            throw new DeveloperError('Number of texture channels should be: ' + numChannels);
        }
        if (channels.search(/[^rgba]/) !== -1) {
            throw new DeveloperError('Channels should only contain r, g, b, or a');
        }
        return source.replace(new RegExp('diffuse_map_material_channels', 'g'), channels);
    };

    DiffuseMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return DiffuseMapMaterial;
});

