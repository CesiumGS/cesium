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
         * DOC_TBA
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
         * DOC_TBA
         * @readonly
         */
        this.vertexFormat = EllipsoidSurfaceAppearance.VERTEX_FORMAT;

        /**
         * DOC_TBA
         * @readonly
         */
        this.flat = defaultValue(options.flat, false);

        /**
         * DOC_TBA
         * @readonly
         */
        this.faceForward = defaultValue(options.faceForward, false);

        /**
         * DOC_TBA
         * @readonly
         */
        this.translucent = translucent;

        /**
         * DOC_TBA
         * @readonly
         */
        this.aboveGround = aboveGround;
    };

    /**
     * DOC_TBA
     * @constant
     */
    EllipsoidSurfaceAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_ST;

    /**
     * DOC_TBA
     */
    EllipsoidSurfaceAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return EllipsoidSurfaceAppearance;
});