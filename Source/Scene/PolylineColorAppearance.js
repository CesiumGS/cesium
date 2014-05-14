/*global define*/
define([
        '../Core/defaultValue',
        '../Core/VertexFormat',
        './Appearance',
        '../Renderer/createShaderSource',
        '../Shaders/Appearances/PolylineColorAppearanceVS',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceFS',
        '../Shaders/PolylineCommon'
    ], function(
        defaultValue,
        VertexFormat,
        Appearance,
        createShaderSource,
        PolylineColorAppearanceVS,
        PerInstanceFlatColorAppearanceFS,
        PolylineCommon) {
    "use strict";

    /**
     * An appearance for {@link GeometryInstance} instances with color attributes and {@link PolylineGeometry}.
     * This allows several geometry instances, each with a different color, to
     * be drawn with the same {@link Primitive}.
     *
     * @alias PolylineColorAppearance
     * @constructor
     *
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link PolylineColorAppearance#renderState} has alpha blending enabled.
     * @param {String} [options.vertexShaderSource=undefined] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource=undefined] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState=undefined] Optional render state to override the default render state.
     *
     * @example
     * // A solid white line segment
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.PolylineGeometry({
     *       positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cesium.Cartographic.fromDegrees(0.0, 0.0),
     *         Cesium.Cartographic.fromDegrees(5.0, 0.0)
     *       ]),
     *       width : 10.0,
     *       vertexFormat : Cesium.PolylineColorApperance.VERTEX_FORMAT
     *     }),
     *     attributes : {
     *       color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 1.0, 1.0, 1.0))
     *     }
     *   }),
     *   appearance : new Cesium.PolylineColorAppearance({
     *     translucent : false
     *   })
     * }));
     */
    var PolylineColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = false;
        var vs = createShaderSource({ sources : [PolylineCommon, PolylineColorAppearanceVS] });
        var fs = PerInstanceFlatColorAppearanceFS;
        var vertexFormat = PolylineColorAppearance.VERTEX_FORMAT;

        /**
         * This property is part of the {@link Appearance} interface, but is not
         * used by {@link PolylineColorAppearance} since a fully custom fragment shader is used.
         *
         * @type Material
         *
         * @default undefined
         */
        this.material = undefined;

        /**
         * The GLSL source code for the vertex shader.
         *
         * @type String
         *
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, vs);

        /**
         * The GLSL source code for the fragment shader.
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
         * The render state can be explicitly defined when constructing a {@link PolylineColorAppearance}
         * instance, or it is set implicitly via {@link PolylineColorAppearance#translucent}.
         * </p>
         *
         * @type Object
         *
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(translucent, closed));

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
         * {@link PolylineColorAppearance#renderState} has alpha blending enabled.
         *
         * @readonly
         *
         * @default true
         */
        this.translucent = translucent;

        /**
         * When <code>true</code>, the geometry is expected to be closed so
         * {@link PolylineColorAppearance#renderState} has backface culling enabled.
         *
         * @readonly
         *
         * @default false
         */
        this.closed = closed;
    };

    /**
     * The {@link VertexFormat} that all {@link PolylineColorAppearance} instances
     * are compatible with. This requires only a <code>position</code> attribute.
     *
     * @type VertexFormat
     *
     * @constant
     */
    PolylineColorAppearance.VERTEX_FORMAT = VertexFormat.POSITION_ONLY;

    /**
     * Procedurally creates the full GLSL fragment shader source.
     *
     * @memberof PolylineColorAppearance
     *
     * @returns String The full GLSL fragment shader source.
     */
    PolylineColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link PolylineColorAppearance#translucent}.
     *
     * @memberof PolylineColorAppearance
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    PolylineColorAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final {@link RenderState} instance; instead,
     * it can contain a subset of render state properties identical to <code>renderState</code>
     * passed to {@link Context#createRenderState}.
     *
     * @memberof PolylineColorAppearance
     *
     * @returns {Object} The render state.
     */
    PolylineColorAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return PolylineColorAppearance;
});