/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/FresnelMaterial'
    ], function(
        DeveloperError,
        ShadersFresnelMaterial) {
    "use strict";

    /**
     * A fresnel material has both reflective and refractive
     * properties. At glancing angles there is more reflection
     * and at straight angles more refraction. The algorithm we use
     * is an approximation of fresnel reflection where the
     * dot product of the view and normal controls the reflection strength.
     * The amount of reflection/refraction is controlled by diffuseAmount.
     *
     * @name FresnelMaterial
     * @constructor
     * @see ReflectionMaterial
     * @see RefractionMaterial
     */

    function FresnelMaterial(template) {
        var t = template || {};

        /**
         * RGB Cube map texture
         */
        this.cubeMap = t.cubeMap;

        /**
         * Index of refraction ratio is refractiveIndex1 / refractiveIndex2.
         * For example, if the ray is going between air and water the value is
         * (refractiveIndexAir / refractiveIndexWater), or (1.0 / 1.33)
         */
        this.indexOfRefractionRatio = t.indexOfRefractionRatio;

        /**
         * diffuseAmount controls how much of the material is reflected/refracted.
         * diffuseAmount of 1.0 means no reflection/refraction.
         * diffuseAmount of 0.0 means full reflection/refraction.
         */
        this.diffuseAmount = t.diffuseAmount;

        /**
         * Channels used for sampling the texture.
         *
         * type {String}
         */
        this.channels = t.channels || 'rgb';

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this.shaderSource = this._replaceChannels(ShadersFresnelMaterial, this.channels, 3);

        var that = this;
        this._uniforms = {
            u_cubeMap : function() {
                if (typeof that.cubeMap === 'undefined') {
                    throw new DeveloperError("Cube map required.");
                }
                return that.cubeMap;
            },
            u_indexOfRefractionRatio : function() {
                return that.indexOfRefractionRatio;
            },
            u_diffuseAmount : function() {
                return that.diffuseAmount;
            }
        };
    }

    FresnelMaterial.prototype._replaceChannels = function(source, channels, numChannels) {
        this.channels = this.channels.toLowerCase();
        if (channels.length !== numChannels) {
            throw new DeveloperError('Number of texture channels should be: ' + numChannels);
        }
        if (channels.search(/[^rgba]/) !== -1) {
            throw new DeveloperError('Channels should only contain r, g, b, or a');
        }
        return source.replace(new RegExp('fresnel_material_channels', 'g'), channels);
    };

    FresnelMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return FresnelMaterial;
});

