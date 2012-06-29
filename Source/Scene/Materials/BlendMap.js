/*global define*/
define([
        '../../Core/DeveloperError',
        './replaceMaterialChannels',
        '../../Shaders/Materials/BlendMap'
    ], function(
        DeveloperError,
        replaceMaterialChannels,
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
         * Channels used for sampling the texture.
         *
         * type {String}
         */
        this.channels = t.channels || 'r';
        this.shaderSource = replaceMaterialChannels(ShadersBlendMap, 'blend_map_channels', this.channels, 1);

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

    BlendMap.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return BlendMap;
});

