/*global define*/
define([
        '../Shaders/Noise',
        '../Shaders/FacetMaterial'
    ], function(
        ShadersNoise,
        ShadersFacetMaterial){
    "use strict";

    /**
     * DOC_TBA
     *
     * @name FacetMaterial
     * @constructor
     */
    function FacetMaterial(template) {
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
    }

    FacetMaterial.prototype._getShaderSource = function() {
        return "#line 0\n" +
               ShadersNoise +
               "#line 0\n" +
               ShadersFacetMaterial;
    };

    return FacetMaterial;
});