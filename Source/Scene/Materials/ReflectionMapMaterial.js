/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/ReflectionMapMaterial'
    ], function(
        DeveloperError,
        ShadersReflectionMapMaterial) {
    "use strict";

    /**
     *
     * The reflection map works by reflecting the world-space view
     * vector off of the surface normal. The reflected vector samples
     * a cube map. The user provides a cube map, a diffuse texture,
     * a reflectivity parameter, and optionally a grayscale reflection map.
     *
     * @name ReflectionMapMaterial
     * @constructor
     */
    function ReflectionMapMaterial(template) {
        var t = template || {};

        /**
         * RGB Cube map texture
         */
        this.cubeMap = t.cubeMap;

        /**
         * RGBA Diffuse texture
         */
        this.diffuseTexture = t.diffuseTexture;

        /**
         * Grayscale reflection map
         */
        this.reflectionMap = t.reflectionMap;

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
            u_diffuseTexture : function() {
                if (typeof that.diffuseTexture === 'undefined') {
                    throw new DeveloperError("Reflection diffuse texture required.");
                }
                return that.diffuseTexture;
            },
            u_reflectionMap : function() {
                if (typeof that.reflectionMap === 'undefined') {
                    throw new DeveloperError("Reflection map texture required.");
                }
                return that.reflectionMap;
            },
            u_reflectivity : function() {
                return that.reflectivity;
            }
        };
    }

    ReflectionMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersReflectionMapMaterial;
    };

    return ReflectionMapMaterial;
});

