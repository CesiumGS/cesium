/*global define*/
define([
        '../../Shaders/Noise',
        '../../Shaders/Materials/AsphaltMaterial'
    ], function (
        ShadersNoise,
        ShadersAsphaltMaterial) {
    "use strict";

    /**
     *
     * Procedural asphalt material generated with a combination of
     * simplex and cellular noise. The cellular noise creates the
     * basic bump shape (like little stones). The simplex noise adds
     * black and white speckles to give a more grainy feel.
     *
     * @name AspahltMaterial
     * @constructor
     */
    function AsphaltMaterial(template) {
        var t = template || {};

        /**
         * Controls asphalt color. Gray colors are recommended.
         */
        this.asphaltColor = t.asphaltColor || {
            red : 0.15,
            green : 0.15,
            blue : 0.15,
            alpha : 1.0
        };

        /**
         * Controls the size of the bumps.
         * Values between 0.01 (many small bumps)
         * and 0.1 (some large bumps) recommended.
         *
         * @type {Number}
         */
        this.bumpSize = t.bumpSize || 0.02;

        /**
         * Controls how rough the surface looks.
         * Values between 0.05 (low roughness)
         * and 1.0 (high roughness) recommended.
         *
         * @type {Number}
         */
        this.roughness = t.roughness || 0.2;

        var that = this;
        this._uniforms = {
            u_asphaltColor : function() {
                return that.asphaltColor;
            },
            u_bumpSize : function() {
                return that.bumpSize;
            },
            u_roughness : function() {
                return that.roughness;
            }
        };
    }

    AsphaltMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               ShadersNoise +
               "#line 0\n" +
               ShadersAsphaltMaterial;
    };

    return AsphaltMaterial;
});
