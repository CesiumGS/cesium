/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/RefractionMaterial'
    ], function(
        DeveloperError,
        ShadersRefractionMaterial) {
    "use strict";

    /**
     *
     * The refraction material works by refracting the world-space view
     * vector off of the world-space surface normal using the
     * two indices of refraction.
     * The refracted vector samples a cube map.
     *
     * @name RefractionMaterial
     * @constructor
     */
    function RefractionMaterial(template) {
        var t = template || {};

        /**
         * RGB cube map texture
         */
        this.cubeMap = t.cubeMap;

        /**
         * Index of refraction ratio is refractiveIndex1 / refractiveIndex2.
         * For example, if the ray is going between air and water the value is
         * (refractiveIndexAir / refractiveIndexWater), or (1.0 / 1.33)
         */
        this.indexOfRefractionRatio = t.indexOfRefractionRatio;

        /**
         * Refractivity controls how strong the refraction is from 0.0 to 1.0
         */
        this.refractivity = t.refractivity;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        var channels = t.channels || 'rgb';
        this.shaderSource = this._replaceChannels(ShadersRefractionMaterial, channels, 3);


        var that = this;
        this._uniforms = {
            u_cubeMap : function() {
                if (typeof that.cubeMap === 'undefined') {
                    throw new DeveloperError("Refraction cube map required.");
                }
                return that.cubeMap;
            },
            u_indexOfRefractionRatio : function() {
                return that.indexOfRefractionRatio;
            },
            u_refractivity : function() {
                return that.refractivity;
            }
        };
    }

    RefractionMaterial.prototype._replaceChannels = function(source, channels, numChannels) {
        channels = channels.toLowerCase();
        if (channels.length !== numChannels) {
            throw new DeveloperError('Number of texture channels should be: ' + numChannels);
        }
        if (channels.search(/[^rgba]/) !== -1) {
            throw new DeveloperError('Channels should only contain r, g, b, or a');
        }
        return source.replace(new RegExp('refraction_material_channels', 'g'), channels);
    };

    RefractionMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return RefractionMaterial;
});

