/*global define*/
define([
        '../../Core/DeveloperError',
        './replaceMaterialChannels',
        '../../Shaders/Materials/EmissionMapMaterial'
    ], function(
        DeveloperError,
        replaceMaterialChannels,
        ShadersEmissionMapMaterial) {
    "use strict";

    /**
     *
     * The emission map is an RGB texture that acts as per-object
     * ambient lighting. The emission color is added
     * to the object's color after lighting happens.
     *
     * @name EmissionMapMaterial
     * @constructor
     */
    function EmissionMapMaterial(template) {
        var t = template || {};

        /**
         * 2D RGB emission map texture.
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
        this._shaderSource = replaceMaterialChannels(ShadersEmissionMapMaterial, 'emission_map_material_channels', this.channels, 3);

        var that = this;
        this._uniforms = {
            u_texture : function() {
                if (typeof that.texture === 'undefined') {
                    throw new DeveloperError("Emission map texture required.");
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

    EmissionMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this._shaderSource;
    };

    return EmissionMapMaterial;
});

