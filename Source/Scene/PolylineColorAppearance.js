/*global define*/
define([
        '../Core/defaultValue',
        '../Core/VertexFormat',
        './Appearance',
        '../Shaders/Appearances/PolylineColorAppearanceVS',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceFS',
        '../Shaders/PolylineCommon'
    ], function(
        defaultValue,
        VertexFormat,
        Appearance,
        PolylineColorAppearanceVS,
        PerInstanceFlatColorAppearanceFS,
        PolylineCommon) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PolylineColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = defaultValue(options.closed, false);
        var vs = PolylineCommon + '\n' + PolylineColorAppearanceVS;
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

    return PolylineColorAppearance;
});