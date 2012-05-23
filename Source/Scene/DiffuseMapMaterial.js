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
     * DOC_TBA
     *
     * @name DiffuseMapMaterial
     * @constructor
     */
    function DiffuseMapMaterial(template) {
        var t = template || {};

        /**
         * DOC_TBA
         */
        this.texture = t.texture;

        /**
         * DOC_TBA
         */
        this.sRepeat = t.sRepeat || 1.0;

        /**
         * DOC_TBA
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

