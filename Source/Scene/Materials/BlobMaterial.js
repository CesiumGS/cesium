/*global define*/
define([
        '../../Shaders/Noise',
        '../../Shaders/Materials/BlobMaterial'
    ], function(
        ShadersNoise,
        ShadersBlobMaterial) {
    "use strict";

    /**
     * Procedural blob material generated with cellular noise.
     * Resembles water, but clumped in a cell pattern.
     *
     * @alias BlobMaterial
     * @constructor
     */
    var BlobMaterial = function(template) {
        var t = template || {};

        /**
         * Color between the cells.
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Cell color.
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Cell frequency.
         *
         * @type Number
         */
        this.repeat = t.repeat || 20.0;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this.shaderSource = ShadersBlobMaterial;

        var that = this;
        this._uniforms = {
            u_lightColor : function() {
                return that.lightColor;
            },
            u_darkColor : function() {
                return that.darkColor;
            },
            u_repeat : function() {
                return that.repeat;
            }
        };
    };

    BlobMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' +
               ShadersNoise +
               "#line 0\n" +
               this.shaderSource;
    };

    return BlobMaterial;
});