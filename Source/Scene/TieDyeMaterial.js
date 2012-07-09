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