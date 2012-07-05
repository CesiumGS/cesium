/*global define*/
define([
        '../Shaders/Noise',
        '../Shaders/TieDyeMaterial'
    ], function(
        ShadersNoise,
        ShadersTieDyeMaterial){
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias TieDyeMaterial
     * @constructor
     */
    var TieDyeMaterial = function(template) {
        var t = template || {};

        /**
         * DOC_TBA
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * DOC_TBA
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * DOC_TBA
         *
         * @type Number
         */
        this.frequency = t.frequency || (1.0 / 10.0);

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
               '#line 0\n' +
               ShadersTieDyeMaterial;
    };

    return TieDyeMaterial;
});