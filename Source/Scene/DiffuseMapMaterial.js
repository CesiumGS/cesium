/*global define*/
define([
        '../Core/DeveloperError',
        '../Shaders/DiffuseMapMaterial'
    ], function(
        DeveloperError,
        ShadersDiffuseMapMaterial) {
    "use strict";

    /**
     *
     * Draws a texture to a diffuse surface
     *
     * @name DiffuseMapMaterial
     * @constructor
     */
    function DiffuseMapMaterial(template) {
        var t = template || {};

        /**
         * The texture being used
         */
        this.texture = t.texture;

        /**
         * Number of texture repeats in the x directions
         *
         * type {Number}
         */
        this.sRepeat = t.sRepeat || 1.0;

        /**
         * Number of texture repeats in the y direction
         *
         * type {Number}
         */
        this.tRepeat = t.tRepeat || 1.0;

        var that = this;
        this._uniforms = {
            u_texture : function() {
                if (typeof that.texture === 'undefined') {
                    throw new DeveloperError("DiffuseMapMaterial requires a texture.");
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

    DiffuseMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersDiffuseMapMaterial;
    };

    return DiffuseMapMaterial;
});

