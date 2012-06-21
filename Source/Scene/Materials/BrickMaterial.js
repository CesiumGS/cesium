/*global define*/
define([
        '../../Shaders/Noise',
        '../../Shaders/Materials/Material',
        '../../Shaders/Materials/BrickMaterial'
    ], function (
        ShadersNoise,
        ShadersMaterial,
        ShadersBrickMaterial) {
    "use strict";

    /**
     *
     * Procedural brick material generated with a combination of
     * a simple brick pattern and simplex noise for roughness.
     * The brick wall is made up of brick and mortar, each of which
     * can be controlled with various parameters.
     *
     * @name BrickMaterial
     * @constructor
     */
    function BrickMaterial(template) {
        var t = template || {};

        /**
         * Color of the bricks.
         * Red/brown/orange colors recommended.
         */
        this.brickColor = t.brickColor || {
            red : 0.7,
            green : 0.2,
            blue : 0.0,
            alpha : 1.0
        };

        /**
         * Color of the mortar (the space between bricks).
         * White/tan colors recommended.
         */
        this.mortarColor = t.mortarColor || {
            red : 0.8,
            green : 0.8,
            blue : 0.7,
            alpha : 1.0
        };

        /**
         * Controls the size of the bricks.
         * Does not affect the brick-mortar ratio.
         * Values between 0.1 (many small bricks) and
         * 1.0 (one large brick) recommended.
         */
        this.brickSize = t.brickSize || {
            x : 0.30,
            y : 0.15
        };

        /**
         * Ratio between brick and mortar.
         * Values between 0.7 (high mortar content) and
         * 0.9 (high brick content) recommended.
         */
        this.brickPct = t.brickPct || {
            x : 0.90,
            y : 0.85
        };

        /**
         * Controls brick roughness.
         * Values between 0.01 (low roughness) and
         * 1.0 (high roughness) recommended.
         *
         * @type {Number}
         */
        this.brickRoughness = t.brickRoughness || 0.2;

        /**
         * Controls mortar roughness.
         * Values between 0.01 (low roughness) and
         * 1.0 (high roughness) recommended.
         *
         * @type {Number}
         */
        this.mortarRoughness = t.mortarRoughness || 0.1;

        var that = this;
        this._uniforms = {
            u_brickColor : function() {
                return that.brickColor;
            },
            u_mortarColor : function() {
                return that.mortarColor;
            },
            u_brickSize : function() {
                return that.brickSize;
            },
            u_brickPct : function() {
                return that.brickPct;
            },
            u_brickRoughness : function() {
                return that.brickRoughness;
            },
            u_mortarRoughness : function() {
                return that.mortarRoughness;
            }
        };
    }

    BrickMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               ShadersNoise +
               "#line 0\n" +
               ShadersMaterial +
               "#line 0\n" +
               ShadersBrickMaterial;
    };

    return BrickMaterial;
});
