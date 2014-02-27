/*global define*/
define([
        '../Core/defaultValue',
        '../Core/VertexFormat',
        './Appearance',
        '../Shaders/Appearances/PerInstanceColorAppearanceVS',
        '../Shaders/Appearances/PerInstanceColorAppearanceFS',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceVS',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceFS'
    ], function(
        defaultValue,
        VertexFormat,
        Appearance,
        PerInstanceColorAppearanceVS,
        PerInstanceColorAppearanceFS,
        PerInstanceFlatColorAppearanceVS,
        PerInstanceFlatColorAppearanceFS) {
    "use strict";

    /**
     * An appearance for {@link GeometryInstance} instances with color attributes.
     * This allows several geometry instances, each with a different color, to
     * be drawn with the same {@link Primitive} as shown in the second example below.
     *
     * @alias PerInstanceColorAppearance
     * @constructor
     *
     * @param {Boolean} [options.flat=false] When <code>true</code>, flat shading is used in the fragment shader, which means lighting is not taking into account.
     * @param {Boolean} [options.faceForward=!options.closed] When <code>true</code>, the fragment shader flips the surface normal as needed to ensure that the normal faces the viewer to avoid dark spots.  This is useful when both sides of a geometry should be shaded like {@link WallGeometry}.
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link PerInstanceColorAppearance#renderState} has alpha blending enabled.
     * @param {Boolean} [options.closed=false] When <code>true</code>, the geometry is expected to be closed so {@link PerInstanceColorAppearance#renderState} has backface culling enabled.
     * @param {String} [options.vertexShaderSource=undefined] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource=undefined] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState=undefined] Optional render state to override the default render state.
     *
     * @example
     * // A solid white line segment
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.SimplePolylineGeometry({
     *       positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cesium.Cartographic.fromDegrees(0.0, 0.0),
     *         Cesium.Cartographic.fromDegrees(5.0, 0.0)
     *       ])
     *     }),
     *     attributes : {
     *       color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 1.0, 1.0, 1.0))
     *     }
     *   }),
     *   appearance : new Cesium.PerInstanceColorAppearance({
     *     flat : true,
     *     translucent : false
     *   })
     * }));
     *
     * // Two extents in a primitive, each with a different color
     * var instance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.ExtentGeometry({
     *     extent : Cesium.Extent.fromDegrees(0.0, 20.0, 10.0, 30.0)
     *   }),
     *   color : new Cesium.Color(1.0, 0.0, 0.0, 0.5)
     * });
     *
     * var anotherInstance = new Cesium.GeometryInstance({
     *   geometry : new Cesium.ExtentGeometry({
     *     extent : Cesium.Extent.fromDegrees(0.0, 40.0, 10.0, 50.0)
     *   }),
     *   color : new Cesium.Color(0.0, 0.0, 1.0, 0.5)
     * });
     *
     * var extentPrimitive = new Cesium.Primitive({
     *   geometryInstances : [instance, anotherInstance],
     *   appearance : new Cesium.PerInstanceColorAppearance()
     * });
     */
    var PerInstanceColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = defaultValue(options.closed, false);
        var flat = defaultValue(options.flat, false);
        var vs = flat ? PerInstanceFlatColorAppearanceVS : PerInstanceColorAppearanceVS;
        var fs = flat ? PerInstanceFlatColorAppearanceFS : PerInstanceColorAppearanceFS;
        var vertexFormat = flat ? PerInstanceColorAppearance.FLAT_VERTEX_FORMAT : PerInstanceColorAppearance.VERTEX_FORMAT;

        /**
         * This property is part of the {@link Appearance} interface, but is not
         * used by {@link PerInstanceColorAppearance} since a fully custom fragment shader is used.
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
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account {@link PerInstanceColorAppearance#flat},
         * and {@link PerInstanceColorAppearance#faceForward}.
         * Use {@link PerInstanceColorAppearance#getFragmentShaderSource} to get the full source.
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
         * The render state can be explicitly defined when constructing a {@link PerInstanceColorAppearance}
         * instance, or it is set implicitly via {@link PerInstanceColorAppearance#translucent}
         * and {@link PerInstanceColorAppearance#closed}.
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
         * When <code>true</code>, flat shading is used in the fragment shader,
         * which means lighting is not taking into account.
         *
         * @readonly
         *
         * @default false
         */
        this.flat = flat;

        /**
         * When <code>true</code>, the fragment shader flips the surface normal
         * as needed to ensure that the normal faces the viewer to avoid
         * dark spots.  This is useful when both sides of a geometry should be
         * shaded like {@link WallGeometry}.
         *
         * @readonly
         *
         * @default false
         */
        this.faceForward = defaultValue(options.faceForward, !closed);

        /**
         * When <code>true</code>, the geometry is expected to appear translucent so
         * {@link PerInstanceColorAppearance#renderState} has alpha blending enabled.
         *
         * @readonly
         *
         * @default true
         */
        this.translucent = translucent;

        /**
         * When <code>true</code>, the geometry is expected to be closed so
         * {@link PerInstanceColorAppearance#renderState} has backface culling enabled.
         * If the viewer enters the geometry, it will not be visible.
         *
         * @readonly
         *
         * @default false
         */
        this.closed = closed;
    };

    /**
     * The {@link VertexFormat} that all {@link PerInstanceColorAppearance} instances
     * are compatible with.  This requires only <code>position</code> and <code>st</code>
     * attributes.
     *
     * @type VertexFormat
     *
     * @constant
     */
    PerInstanceColorAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_NORMAL;

    /**
     * The {@link VertexFormat} that all {@link PerInstanceColorAppearance} instances
     * are compatible with when {@link PerInstanceColorAppearance#flat} is <code>false</code>.
     * This requires only a <code>position</code> attribute.
     *
     * @type VertexFormat
     *
     * @constant
     */
    PerInstanceColorAppearance.FLAT_VERTEX_FORMAT = VertexFormat.POSITION_ONLY;

    /**
     * Procedurally creates the full GLSL fragment shader source.  For {@link PerInstanceColorAppearance},
     * this is derived from {@link PerInstanceColorAppearance#fragmentShaderSource}, {@link PerInstanceColorAppearance#flat},
     * and {@link PerInstanceColorAppearance#faceForward}.
     *
     * @memberof PerInstanceColorAppearance
     *
     * @returns String The full GLSL fragment shader source.
     */
    PerInstanceColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link PerInstanceColorAppearance#translucent}.
     *
     * @memberof PerInstanceColorAppearance
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    PerInstanceColorAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final {@link RenderState} instance; instead,
     * it can contain a subset of render state properties identical to <code>renderState</code>
     * passed to {@link Context#createRenderState}.
     *
     * @memberof PerInstanceColorAppearance
     *
     * @returns {Object} The render state.
     */
    PerInstanceColorAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return PerInstanceColorAppearance;
});