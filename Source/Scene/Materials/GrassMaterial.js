/*global define*/
define([
        '../../Shaders/Noise',
        '../../Shaders/Materials/GrassMaterial'
    ], function (
        ShadersNoise,
        ShadersGrassMaterial) {
    "use strict";

    /**
     *
     * Procedural grass material generated with simplex noise.
     * Grass is composed of a grass color and a dirt color,
     * though the grass color is more prominent. A non-configurable
     * thatch pattern is placed on top (same color as grass color).
     *
     * @name GrassMaterial
     * @constructor
     */
    function GrassMaterial(template) {
        var t = template || {};

        /**
         * Grass color. Green/brown color recommended.
         */
        this.grassColor = t.grassColor || {
            red : 0.25,
            green : 0.4,
            blue : 0.1,
            alpha : 1.0
        };

        /**
         * Dirt color. Black/brown color recommended.
         * This color shows up underneath the grass color.
         */
        this.dirtColor = t.dirtColor || {
            red : 0.1,
            green : 0.1,
            blue : 0.1,
            alpha : 1.0
        };

        /**
         * Controls the size of the color patches in the grass.
         *
         * @type {Number}
         */
        this.patchiness = t.patchiness || 1.5;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this._shaderSource = ShadersGrassMaterial;

        var that = this;
        this._uniforms = {
            u_grassColor : function() {
                return that.grassColor;
            },
            u_dirtColor : function() {
                return that.dirtColor;
            },
            u_patchiness : function() {
                return that.patchiness;
            },
        };
    }

    GrassMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               ShadersNoise +
               "#line 0\n" +
               this._shaderSource;
    };

    return GrassMaterial;
});
