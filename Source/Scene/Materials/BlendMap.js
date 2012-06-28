/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/BlendMap'
    ], function(
        DeveloperError,
        ShadersBlendMap) {
    "use strict";

    /**
     * Samples a texture and returns a float. Used for blending materials
     * together in a {@link CompositeMaterial}. BlendMap is not a material,
     * so it should not be used like one. See {@link CompositeMaterial} for use cases.
     *
     * @name BlendMap
     * @constructor
     *
     * @see CompositeMaterial
     */
    function BlendMap(template) {
        var t = template || {};

        /**
         * 2D texture.
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
        var channels = t.channels || 'r';
        this.shaderSource = this._replaceChannels(ShadersBlendMap, channels, 1);

        var that = this;
        this._uniforms = {
            u_texture : function() {
                if (typeof that.texture === 'undefined') {
                    throw new DeveloperError("Blend map texture required.");
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

    BlendMap.prototype._replaceChannels = function(source, channels, numChannels) {
        channels = channels.toLowerCase();
        if (channels.length !== numChannels) {
            throw new DeveloperError('Number of texture channels should be: ' + numChannels);
        }
        if (channels.search(/[^rgba]/) !== -1) {
            throw new DeveloperError('Channels should only contain r, g, b, or a');
        }
        return source.replace(new RegExp('blend_map_channels', 'g'), channels);
    };

    BlendMap.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return BlendMap;
});

