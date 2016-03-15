/*global define*/
define([
        '../Core/clone',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/VertexFormat',
        '../Shaders/Appearances/PointAppearanceFS',
        '../Shaders/Appearances/PointAppearanceVS',
        './Appearance'
    ], function(
        clone,
        Color,
        combine,
        defaultValue,
        defined,
        defineProperties,
        VertexFormat,
        PointAppearanceFS,
        PointAppearanceVS,
        Appearance) {
    'use strict';

    /**
     * An appearance for point geometry {@link PointGeometry}
     *
     * @alias PointAppearance
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.translucent=false] When <code>true</code>, the geometry is expected to appear translucent so {@link PointAppearance#renderState} has alpha blending enabled.
     * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState] Optional render state to override the default render state.
     * @param {Object} [options.uniforms] Additional uniforms that are used by the vertex and fragment shaders.
     * @param {Number} [options.pointSize] Point size in pixels.
     * @param {Color} [options.highlightColor] Color multiplier in the fragment shader. The alpha channel is used for alpha blending when translucency is enabled.
     *
     * @example
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.PointGeometry({
     *       positionsTypedArray : positions,
     *       colorsTypedArray : colors,
     *       boundingSphere : boundingSphere
     *     })
     *   }),
     *   appearance : new Cesium.PointAppearance({
     *     translucent : true
     *   })
     * });
     *
     * @private
     */
    function PointAppearance(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._vertexShaderSource = defaultValue(options.vertexShaderSource, PointAppearanceVS);
        this._fragmentShaderSource = defaultValue(options.fragmentShaderSource, PointAppearanceFS);
        this._renderState = Appearance.getDefaultRenderState(false, false, options.renderState);
        this._pointSize = defaultValue(options.pointSize, 2.0);
        this._highlightColor = defined(options.highlightColor) ? options.highlightColor : new Color();

        /**
         * This property is part of the {@link Appearance} interface, but is not
         * used by {@link PointAppearance} since a fully custom fragment shader is used.
         *
         * @type Material
         *
         * @default undefined
         */
        this.material = undefined;

        /**
         * When <code>true</code>, the geometry is expected to appear translucent.
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.translucent = defaultValue(options.translucent, false);

        /**
         * @private
         */
        this.uniforms = {
            highlightColor : this._highlightColor,
            pointSize : this._pointSize
        };

        // Combine default uniforms and additional uniforms
        var optionsUniforms = options.uniforms;
        this.uniforms = combine(this.uniforms, optionsUniforms, true);
    }

    defineProperties(PointAppearance.prototype, {
        /**
         * The GLSL source code for the vertex shader.
         *
         * @memberof PointAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        vertexShaderSource : {
            get : function() {
                return this._vertexShaderSource;
            }
        },

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account the {@link PointAppearance#material}.
         * Use {@link PointAppearance#getFragmentShaderSource} to get the full source.
         *
         * @memberof PointAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        fragmentShaderSource : {
            get : function() {
                return this._fragmentShaderSource;
            }
        },

        /**
         * The WebGL fixed-function state to use when rendering the geometry.
         *
         * @memberof PointAppearance.prototype
         *
         * @type {Object}
         * @readonly
         */
        renderState : {
            get : function() {
                return this._renderState;
            }
        },

        /**
         * When <code>true</code>, the geometry is expected to be closed.
         *
         * @memberof PointAppearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        closed : {
            get : function() {
                return false;
            }
        },

        /**
         * The {@link VertexFormat} that this appearance instance is compatible with.
         * A geometry can have more vertex attributes and still be compatible - at a
         * potential performance cost - but it can't have less.
         *
         * @memberof PointAppearance.prototype
         *
         * @type VertexFormat
         * @readonly
         *
         * @default {@link PointAppearance.VERTEX_FORMAT}
         */
        vertexFormat : {
            get : function() {
                return PointAppearance.VERTEX_FORMAT;
            }
        },

        /**
         * The size in pixels used when rendering the primitive. This helps calculate an accurate
         * bounding volume for point rendering and other appearances that are defined in pixel sizes.
         *
         * @memberof PointAppearance.prototype
         *
         * @type {Number}
         * @readonly
         */
        pixelSize : {
            get : function() {
                return this._pointSize;
            }
        }
    });

    /**
     * The {@link VertexFormat} that all {@link PointAppearance} instances
     * are compatible with, which requires only <code>position</code> and <code>color</code>
     * attributes.  Other attributes are procedurally computed in the fragment shader.
     *
     * @type VertexFormat
     *
     * @constant
     */
    PointAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_COLOR;

    /**
     * Returns the full GLSL fragment shader source, which for {@link PointAppearance} is just
     * {@link PointAppearance#fragmentShaderSource}.
     *
     * @function
     *
     * @returns {String} The full GLSL fragment shader source.
     */
    PointAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link PointAppearance#translucent}.
     *
     * @function
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    PointAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final render state instance; instead,
     * it can contain a subset of render state properties identical to the render state
     * created in the context.
     *
     * @function
     *
     * @returns {Object} The render state.
     */
    PointAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return PointAppearance;
});
