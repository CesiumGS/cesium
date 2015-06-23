/*global define*/
define([
        '../Core/Color',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/VertexFormat',
        './Appearance',
        '../Shaders/Appearances/PointAppearanceVS',
        '../Shaders/Appearances/PointAppearanceFS'
    ], function(
        Color,
        clone,
        defaultValue,
        defined,
        defineProperties,
        VertexFormat,
        Appearance,
        PointAppearanceVS,
        PointAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PointAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._vertexShaderSource = defaultValue(options.vertexShaderSource, PointAppearanceVS);
        this._fragmentShaderSource = defaultValue(options.fragmentShaderSource, PointAppearanceFS);
        this._renderState = Appearance.getDefaultRenderState(true, false, options.renderState);

        /**
         * DOC_TBA
         */
        this.translucent = defaultValue(options.translucent, false);

        // TODO: how do we want to expose uniforms?  Below is similar to materials but uses Cesium Cartesian, Matrix, and Color, not just JSON.  Expose like UBOs.
        /**
         * @private
         */
        this.uniforms = {
            highlightColor : new Color(),
            pointSize : 2.0
        };

        // TODO: make this an appearance helper function
        // Override default uniform functions.
        var optionsUniforms = options.uniforms;
        if (defined(optionsUniforms)) {
            for (var name in optionsUniforms) {
                if (optionsUniforms.hasOwnProperty(name)) {
                    this.uniforms[name] = clone(optionsUniforms[name]);
                }
            }
        }
    };

    PointAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_COLOR;

    defineProperties(PointAppearance.prototype, {
        /**
         * DOC_TBA
         */
        vertexShaderSource : {
            get : function() {
                return this._vertexShaderSource;
            }
        },

        /**
         * DOC_TBA
         */
        fragmentShaderSource : {
            get : function() {
                return this._fragmentShaderSource;
            }
        },

        /**
         * DOC_TBA
         */
        renderState : {
            get : function() {
                return this._renderState;
            }
        },

        /**
         * DOC_TBA
         */
        closed : {
            get : function() {
                return false;
            }
        },

        // Non-derived members

        /**
         * DOC_TBA
         */
        vertexFormat : {
            get : function() {
                return PointAppearance.VERTEX_FORMAT;
            }
        }
    });

    /**
     * DOC_TBA
     */
    PointAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * DOC_TBA
     */
    PointAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * DOC_TBA
     */
    PointAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return PointAppearance;
});