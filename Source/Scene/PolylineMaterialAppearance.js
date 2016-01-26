/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/VertexFormat',
        '../Shaders/Appearances/PolylineMaterialAppearanceVS',
        '../Shaders/PolylineCommon',
        '../Shaders/PolylineFS',
        './Appearance',
        './Material'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        VertexFormat,
        PolylineMaterialAppearanceVS,
        PolylineCommon,
        PolylineFS,
        Appearance,
        Material) {
    "use strict";

    var defaultVertexShaderSource = PolylineCommon + '\n' + PolylineMaterialAppearanceVS;
    var defaultFragmentShaderSource = PolylineFS;

    /**
     * An appearance for {@link PolylineGeometry} that supports shading with materials.
     *
     * @alias PolylineMaterialAppearance
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link PolylineMaterialAppearance#renderState} has alpha blending enabled.
     * @param {Material} [options.material=Material.ColorType] The material used to determine the fragment color.
     * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState] Optional render state to override the default render state.
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
     *
     * @example
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.PolylineGeometry({
     *       positions : Cesium.Cartesian3.fromDegreesArray([
     *         0.0, 0.0,
     *         5.0, 0.0
     *       ]),
     *       width : 10.0,
     *       vertexFormat : Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
     *     })
     *   }),
     *   appearance : new Cesium.PolylineMaterialAppearance({
     *     material : Cesium.Material.fromType('Color')
     *   })
     * });
     */
    function PolylineMaterialAppearance(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = false;
        var vertexFormat = PolylineMaterialAppearance.VERTEX_FORMAT;

        /**
         * The material used to determine the fragment color.  Unlike other {@link PolylineMaterialAppearance}
         * properties, this is not read-only, so an appearance's material can change on the fly.
         *
         * @type Material
         *
         * @default {@link Material.ColorType}
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         */
        this.material = defined(options.material) ? options.material : Material.fromType(Material.ColorType);

        /**
         * When <code>true</code>, the geometry is expected to appear translucent so
         * {@link PolylineMaterialAppearance#renderState} has alpha blending enabled.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.translucent = translucent;

        this._vertexShaderSource = defaultValue(options.vertexShaderSource, defaultVertexShaderSource);
        this._fragmentShaderSource = defaultValue(options.fragmentShaderSource, defaultFragmentShaderSource);
        this._renderState = Appearance.getDefaultRenderState(translucent, closed, options.renderState);
        this._closed = closed;

        // Non-derived members

        this._vertexFormat = vertexFormat;
    }

    defineProperties(PolylineMaterialAppearance.prototype, {
        /**
         * The GLSL source code for the vertex shader.
         *
         * @memberof PolylineMaterialAppearance.prototype
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
         * The GLSL source code for the fragment shader.
         *
         * @memberof PolylineMaterialAppearance.prototype
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
         * <p>
         * The render state can be explicitly defined when constructing a {@link PolylineMaterialAppearance}
         * instance, or it is set implicitly via {@link PolylineMaterialAppearance#translucent}
         * and {@link PolylineMaterialAppearance#closed}.
         * </p>
         *
         * @memberof PolylineMaterialAppearance.prototype
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
         * When <code>true</code>, the geometry is expected to be closed so
         * {@link PolylineMaterialAppearance#renderState} has backface culling enabled.
         * This is always <code>false</code> for <code>PolylineMaterialAppearance</code>.
         *
         * @memberof PolylineMaterialAppearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        closed : {
            get : function() {
                return this._closed;
            }
        },

        /**
         * The {@link VertexFormat} that this appearance instance is compatible with.
         * A geometry can have more vertex attributes and still be compatible - at a
         * potential performance cost - but it can't have less.
         *
         * @memberof PolylineMaterialAppearance.prototype
         *
         * @type VertexFormat
         * @readonly
         *
         * @default {@link PolylineMaterialAppearance.VERTEX_FORMAT}
         */
        vertexFormat : {
            get : function() {
                return this._vertexFormat;
            }
        }
    });

    /**
     * The {@link VertexFormat} that all {@link PolylineMaterialAppearance} instances
     * are compatible with. This requires <code>position</code> and <code>st</code> attributes.
     *
     * @type VertexFormat
     *
     * @constant
     */
    PolylineMaterialAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_ST;

    /**
     * Procedurally creates the full GLSL fragment shader source.  For {@link PolylineMaterialAppearance},
     * this is derived from {@link PolylineMaterialAppearance#fragmentShaderSource} and {@link PolylineMaterialAppearance#material}.
     *
     * @function
     *
     * @returns {String} The full GLSL fragment shader source.
     */
    PolylineMaterialAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link PolylineMaterialAppearance#translucent} and {@link Material#isTranslucent}.
     *
     * @function
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    PolylineMaterialAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final render state instance; instead,
     * it can contain a subset of render state properties identical to the render state
     * created in the context.
     *
     * @function
     *
     * @returns {Object} The render state.
     */
    PolylineMaterialAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return PolylineMaterialAppearance;
});
