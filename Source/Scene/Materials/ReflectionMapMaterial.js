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
     * vector off of
     *
     * @name ReflectionMapMaterial
     * @constructor
     */
    function ReflectionMapMaterial(template) {
        var t = template || {};

        /**
         * Cube map texture
         */
        this.texture = t.texture;

        var that = this;
        this._uniforms = {
            u_texture : function() {
                if (typeof that.texture === 'undefined') {
                    throw new DeveloperError("Reflection map texture required.");
                }
                return that.texture;
            }
        };
    }

    ReflectionMapMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" + ShadersReflectionMapMaterial;
    };

    return ReflectionMapMaterial;
});

