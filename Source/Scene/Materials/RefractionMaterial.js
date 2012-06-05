/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/RefractionMaterial',
        '../../Scene/Materials/materialBuilder'
    ], function(
        DeveloperError,
        ShadersRefractionMaterial,
        materialBuilder) {
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

    RefractionMaterial.prototype._getShaderSource = function() {
        return materialBuilder.constructMaterial(ShadersRefractionMaterial);
    };

    return RefractionMaterial;
});

