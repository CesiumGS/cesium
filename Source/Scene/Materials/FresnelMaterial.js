/*global define*/
define([
        '../../Core/DeveloperError',
        './replaceMaterialChannels',
        '../../Shaders/Materials/FresnelMaterial'
    ], function(
        DeveloperError,
        replaceMaterialChannels,
        ShadersFresnelMaterial) {
    "use strict";

    /**
     * A fresnel material has both reflective and refractive
     * properties. At glancing angles there is more reflection
     * and at straight angles more refraction. The algorithm we use
     * is an approximation of fresnel reflection where the
     * dot product of the view and normal controls the reflection strength.
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
         * Channels used for sampling the texture.
         *
         * type {String}
         */
        this.channels = t.channels || 'rgb';
        this._shaderSource = replaceMaterialChannels(ShadersFresnelMaterial, 'fresnel_material_channels', this.channels, 3);

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
            }
        };
    }

    FresnelMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this._shaderSource;
    };

    return FresnelMaterial;
});

