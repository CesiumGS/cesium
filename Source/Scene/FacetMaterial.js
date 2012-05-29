/*global define*/
define([
        '../Shaders/Noise',
        '../Shaders/FacetMaterial'
    ], function(
        ShadersNoise,
        ShadersFacetMaterial){
    "use strict";

    /**
     * A procedural facet material generated with cellular noise.
     * Has the appearance of a grid similar to a honeycomb.
     *
     * @name FacetMaterial
     * @constructor
     */
    function FacetMaterial(template) {
        var t = template || {};

        /**
         * Color between the cells.
         */
        this.lightColor = t.lightColor || {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Cell color.
         */
        this.darkColor = t.darkColor || {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 0.5
        };

        /**
         * Cell frequency.
         * Values between 1.0 (one large cell) and
         * 50.0 (many small cells) recommended.
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