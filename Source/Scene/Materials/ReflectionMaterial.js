/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/ReflectionMaterial',
        '../../Scene/Materials/materialBuilder'
    ], function(
        DeveloperError,
        ShadersReflectionMaterial,
        materialBuilder) {
    "use strict";

    /**
     *
     * The reflection material works by reflecting the world-space view
     * vector off of the world-space surface normal.
     * The reflected vector samples a cube map.
     *
     * @name ReflectionMaterial
     * @constructor
     */
    function ReflectionMaterial(template) {
        var t = template || {};

        /**
         * RGB cube map texture
         */
        this.cubeMap = t.cubeMap;

        /**
         * Reflectivity controls how strong the reflection is from 0.0 to 1.0
         */
        this.reflectivity = t.reflectivity;

        var that = this;
        this._uniforms = {
            u_cubeMap : function() {
                if (typeof that.cubeMap === 'undefined') {
                    throw new DeveloperError("Reflection cube map required.");
                }
                return that.cubeMap;
            },
            u_reflectivity : function() {
                return that.reflectivity;
            }
        };
    }

    ReflectionMaterial.prototype._getShaderSource = function() {
        return materialBuilder.constructMaterial(ShadersReflectionMaterial);
    };

    return ReflectionMaterial;
});

