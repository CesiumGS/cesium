/*global define*/
define([
        '../../Shaders/Noise',
        '../../Shaders/Materials/CementMaterial'
    ], function (
        ShadersNoise,
        ShadersCementMaterial) {
    "use strict";

    /**
     *
     * Procedural cement material generated with simplex noise.
     * Overall, a relatively homogeneous material with the ability
     * to add small, rock-like bumps.
     *
     * @name CementMaterial
     * @constructor
     */
    function CementMaterial(template) {
        var t = template || {};

        /**
         * Cement color. White/tan values recommended.
         */
        this.cementColor = t.cementColor || {
            red : 0.95,
            green : 0.95,
            blue : 0.85,
            alpha : 1.0
        };

        /**
         * Controls the size of the rock grains in the cement.
         *
         * @type {Number}
         */
        this.grainScale = t.grainScale || 0.01;

        /**
         * Controls how rough the surface looks.
         *
         * @type {Number}
         */
        this.roughness = t.roughness || 0.3;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this.shaderSource = ShadersCementMaterial;

        var that = this;
        this._uniforms = {
            u_cementColor : function() {
                return that.cementColor;
            },
            u_grainScale : function() {
                return that.grainScale;
            },
            u_roughness : function() {
                return that.roughness;
            }
        };
    }

    CementMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               ShadersNoise +
               "#line 0\n" +
               this.shaderSource;
    };

    return CementMaterial;
});
