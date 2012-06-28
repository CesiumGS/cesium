/*global define*/
define([
        '../../Core/DeveloperError',
        '../../Shaders/Materials/ReflectionMaterial'
    ], function(
        DeveloperError,
        ShadersReflectionMaterial) {
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

        /**
         * The glsl shader source
         *
         * type {String}
         */
        var channels = t.channels || 'rgb';
        this.shaderSource = this._replaceChannels(ShadersReflectionMaterial, channels, 3);

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

    ReflectionMaterial.prototype._replaceChannels = function(source, channels, numChannels) {
        channels = channels.toLowerCase();
        if (channels.length !== numChannels) {
            throw new DeveloperError('Number of texture channels should be: ' + numChannels);
        }
        if (channels.search(/[^rgba]/) !== -1) {
            throw new DeveloperError('Channels should only contain r, g, b, or a');
        }
        return source.replace(new RegExp('reflection_material_channels', 'g'), channels);
    };

    ReflectionMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               this.shaderSource;
    };

    return ReflectionMaterial;
});

