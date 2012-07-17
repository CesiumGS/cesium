/*global define*/
define([
        '../Core/Color',
        '../Shaders/Noise',
        '../Shaders/TieDyeMaterial'
    ], function(
        Color,
        ShadersNoise,
        ShadersTieDyeMaterial){
    "use strict";

    /**
     * Procedural tie-dye material generated with simplex noise.
     * The effect is created by taking the absolute value of the noise value.
     *
     * @alias TieDyeMaterial
     * @constructor
     */
    var TieDyeMaterial = function(template) {
        var t = template || {};

        /**
         * The light color of the tie-dye.
         */
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * The dark color of the tie-dye.
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 1.0, 0.5);

        /**
         * Controls the noise frequency.
         *
         * @type Number
         */
        this.frequency = t.frequency || 5.0;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this._shaderSource = ShadersTieDyeMaterial;

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
    };

    TieDyeMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' +
               ShadersNoise +
               "#line 0\n" +
               this._shaderSource;
    };

    return TieDyeMaterial;
});