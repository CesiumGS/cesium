/*global define*/
define([
        '../Shaders/Noise',
        '../Shaders/BlobMaterial'
    ], function(
        ShadersNoise,
        ShadersBlobMaterial) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias BlobMaterial
     * @constructor
     */
    var BlobMaterial = function(template) {
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
        this.repeat = t.repeat || 20.0;

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
               '#line 0\n' +
               ShadersBlobMaterial;
    };

    return BlobMaterial;
});