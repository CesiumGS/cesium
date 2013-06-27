/*global define*/
define([
        '../Core/defaultValue',
        '../Core/VertexFormat',
        './Material',
        './Appearance',
        './MaterialAppearance',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceVS',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceFS'
    ], function(
        defaultValue,
        VertexFormat,
        Material,
        Appearance,
        MaterialAppearance,
        EllipsoidSurfaceAppearanceVS,
        EllipsoidSurfaceAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias EllipsoidSurfaceAppearance
     * @constructor
     */
    var EllipsoidSurfaceAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var aboveGround = defaultValue(options.aboveGround, false);

        /**
         * The material used to determine the fragment color.  Unlike other {@link EllipsoidSurfaceAppearance}
         * properties, this is not read-only, so an appearance's material can change on the fly.
         *
         * @type Material
         *
         * @default Material.ColorType
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * The GLSL source code for the vertex shader.
         *
         * @type String
         *
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, EllipsoidSurfaceAppearanceVS);

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account {@link EllipsoidSurfaceAppearance#material},
         * {@link EllipsoidSurfaceAppearance#flat}, and {@link EllipsoidSurfaceAppearance#faceForward}.
         * Use {@link EllipsoidSurfaceAppearance#getFragmentShaderSource} to get the full source.
         *
         * @type String
         *
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, EllipsoidSurfaceAppearanceFS);

        /**
         * The render state.  This is not the final {@link RenderState} instance; instead,
         * it can contain a subset of render state properties identical to <code>renderState</code>
         * passed to {@link Context#createRenderState}.
         * <p>
         * The render state can be explicitly defined when constructing a {@link EllipsoidSurfaceAppearance}
         * instance, or it is set implicitly via {@link EllipsoidSurfaceAppearance#translucent}
         * and {@link EllipsoidSurfaceAppearance#aboveGround}.
         * </p>
         *
         * @type Object
         *
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(translucent, !aboveGround));

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
        this.vertexFormat = EllipsoidSurfaceAppearance.VERTEX_FORMAT;

        /**
         * When <code>true</code>, flat shading is used in the fragment shader,
         * which means lighting is not taking into account.
         *
         * @readonly
         *
         * @default false
         */
        this.flat = defaultValue(options.flat, false);

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
         * {@link EllipsoidSurfaceAppearance#renderState} has alpha blending enabled.
         *
         * @readonly
         *
         * @default true
         */
        this.translucent = translucent;

        /**
         * When <code>true</code>, the geometry is expected to be on the ellipsoid's
         * surface - not at a constant height above it - so {@link EllipsoidSurfaceAppearance#renderState}
         * has backface culling enabled.
         *
         * @readonly
         *
         * @default false
         */
        this.aboveGround = aboveGround;
    };

    /**
     * The {@link VertexFormat} that all {@link EllipsoidSurfaceAppearance} instances
     * are compatible with, which requires only <code>position</code> and <code>st</code>
     * attributes.  Other attributes are procedurally computed in the fragment shader.
     *
     * @type VertexFormat
     *
     * @constant
     */
    EllipsoidSurfaceAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_ST;

    /**
     * Procedurally creates the full GLSL fragment shader source.  For {@link PerInstanceColorAppearance},
     * this is derived from {@link PerInstanceColorAppearance#fragmentShaderSource}, {@link PerInstanceColorAppearance#flat},
     * and {@link PerInstanceColorAppearance#faceForward}.
     *
     * @memberof EllipsoidSurfaceAppearance
     *
     * @return String The full GLSL fragment shader source.
     */
    EllipsoidSurfaceAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return EllipsoidSurfaceAppearance;
});