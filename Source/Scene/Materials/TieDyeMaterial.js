/*global define*/
define([
        '../../Shaders/Noise',
        '../../Shaders/Materials/Material',
        '../../Shaders/Materials/TieDyeMaterial'
    ], function(
        ShadersNoise,
        ShadersMaterial,
        ShadersTieDyeMaterial){
    "use strict";

    /**
     * Procedural tie-dye material generated with simplex noise.
     * The effect is created by taking the absolute value of the noise value.
     *
     * @name TieDyeMaterial
     * @constructor
     */
    function TieDyeMaterial(template) {
        var t = template || {};

        /**
         * The light color of the tie-dye.
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * The dark color of the tie-dye.
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Controls the noise frequency.
         *
         * @type Number
         */
        this.frequency = t.frequency || 5.0;

        var that = this;
        this._uniforms = {
            u_lightColor : function() {
                return that.lightColor;
            },
            u_darkColor : function() {
                return that.darkColor;
            },
            u_frequency : function() {
                return that.frequency;
            }
        };
    }

    TieDyeMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               ShadersNoise +
               "#line 0\n" +
               ShadersMaterial +
               "#line 0\n" +
               ShadersTieDyeMaterial;
    };

    return TieDyeMaterial;
});