/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/VertexFormat',
        './Material',
        './Appearance',
        '../Renderer/createShaderSource',
        '../Shaders/Appearances/PolylineMaterialAppearanceVS',
        '../Shaders/PolylineFS',
        '../Shaders/PolylineCommon'
    ], function(
        defaultValue,
        defined,
        VertexFormat,
        Material,
        Appearance,
        createShaderSource,
        PolylineMaterialAppearanceVS,
        PolylineFS,
        PolylineCommon) {
    "use strict";

    /**
     * An appearance for {@link PolylineGeometry} that supports shading with materials.
     *
     * @alias PolylineMaterialAppearance
     * @constructor
     *
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link PolylineMaterialAppearance#renderState} has alpha blending enabled.
     * @param {Material} [options.material=Material.ColorType] The material used to determine the fragment color.
     * @param {String} [options.vertexShaderSource=undefined] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource=undefined] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState=undefined] Optional render state to override the default render state.
     *
     * @example
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.PolylineGeometry({
     *       positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cesium.Cartographic.fromDegrees(0.0, 0.0),
     *         Cesium.Cartographic.fromDegrees(5.0, 0.0)
     *       ]),
     *       width : 10.0,
     *       vertexFormat : Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
     *     })
     *   }),
     *   appearance : new Cesium.PolylineMaterialAppearance({
     *     material : Cesium.Material.fromType('Color')
     *   })
     * }));
     *
     * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
     */
    var PolylineMaterialAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = false;
        var vs = createShaderSource({ sources : [PolylineCommon, PolylineMaterialAppearanceVS] });
        var fs = PolylineFS;
        var vertexFormat = PolylineMaterialAppearance.VERTEX_FORMAT;

        /**
         * The material used to determine the fragment color.  Unlike other {@link PolylineMaterialAppearance}
         * properties, this is not read-only, so an appearance's material can change on the fly.
         *
         * @type Material
         *
         * @default Material.ColorType
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = defined(options.material) ? options.material : Material.fromType(Material.ColorType);

        /**
         * The GLSL source code for the vertex shader.
         *
         * @type String
         *
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, vs);

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account {@link PolylineMaterialAppearance#material}.
         * Use {@link PolylineMaterialAppearance#getFragmentShaderSource} to get the full source.
         *
         * @type String
         *
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);

        /**
         * The render state.  This is not the final {@link RenderState} instance; instead,
         * it can contain a subset of render state properties identical to <code>renderState</code>
         * passed to {@link Context#createRenderState}.
         * <p>
         * The render state can be explicitly defined when constructing a {@link PolylineMaterialAppearance}
         * instance, or it is set implicitly via {@link PolylineMaterialAppearance#translucent}
         * and {@link PolylineMaterialAppearance#closed}.
         * </p>
         *
         * @type Object
         *
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(translucent, closed));

        // Non-derived members

        /**
         * The {@link VertexFormat} that this appearance instance is compatible with.
         * A geometry can have more vertex attributes and still be compatible - at a
         * potential performance cost - but it can't have less.
         *
         * @type VertexFormat
         *
         * @readonly
         */
        this.vertexFormat = vertexFormat;

        /**
         * When <code>true</code>, the geometry is expected to appear translucent so
         * {@link PolylineMaterialAppearance#renderState} has alpha blending enabled.
         *
         * @readonly
         *
         * @default true
         */
        this.translucent = translucent;

        /**
         * When <code>true</code>, the geometry is expected to be closed so
         * {@link PolylineMaterialAppearance#renderState} has backface culling enabled.
         *
         * @readonly
         *
         * @default false
         */
        this.closed = closed;
    };

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
     * @memberof PolylineMaterialAppearance
     *
     * @returns String The full GLSL fragment shader source.
     */
    PolylineMaterialAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link PolylineMaterialAppearance#translucent} and {@link Material#isTranslucent}.
     *
     * @memberof PolylineMaterialAppearance
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    PolylineMaterialAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final {@link RenderState} instance; instead,
     * it can contain a subset of render state properties identical to <code>renderState</code>
     * passed to {@link Context#createRenderState}.
     *
     * @memberof PolylineMaterialAppearance
     *
     * @returns {Object} The render state.
     */
    PolylineMaterialAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return PolylineMaterialAppearance;
});