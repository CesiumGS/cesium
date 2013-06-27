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
     * DOC_TBA
     *
     * @alias PerInstanceColorAppearance
     * @constructor
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
        this.faceForward = defaultValue(options.faceForward, false);

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
     * @return String The full GLSL fragment shader source.
     */
    PerInstanceColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return PerInstanceColorAppearance;
});