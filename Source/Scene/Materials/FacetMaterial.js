/*global define*/
define([
        '../Core/Color',
        '../Shaders/Noise',
        '../Shaders/FacetMaterial'
    ], function(
        Color,
        ShadersNoise,
        ShadersFacetMaterial){
    "use strict";

    /**
     * A procedural facet material generated with cellular noise.
     * Has the appearance of a grid similar to a honeycomb.
     *
     * @alias FacetMaterial
     * @constructor
     */
    var FacetMaterial = function(template) {
        var t = template || {};

        /**
         * Color between the cells.
         */
        this.lightColor = (typeof t.lightColor !== 'undefined') ? Color.clone(t.lightColor) : new Color(1.0, 1.0, 1.0, 0.5);

        /**
         * Cell color.
         */
        this.darkColor = (typeof t.darkColor !== 'undefined') ? Color.clone(t.darkColor) : new Color(0.0, 0.0, 1.0, 0.5);

        /**
         * Cell frequency.
         *
         * @type Number
         */
        this.repeat = t.repeat || 20.0;

        /**
         * The glsl shader source
         *
         * type {String}
         */
        this._shaderSource = ShadersFacetMaterial;

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

    FacetMaterial.prototype._getShaderSource = function() {
        return '#line 0\n' +
               ShadersNoise +
               "#line 0\n" +
               this._shaderSource;
    };

    return FacetMaterial;
});