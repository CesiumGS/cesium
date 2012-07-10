/*global define*/
define([
        '../Core/Color',
        '../Shaders/Noise',
        '../Shaders/BlobMaterial'
    ], function(
        Color,
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
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * DOC_TBA
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 1.0, 0.5);

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