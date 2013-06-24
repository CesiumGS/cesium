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
         * DOC_TBA
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, EllipsoidSurfaceAppearanceVS);

        /**
         * DOC_TBA
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, EllipsoidSurfaceAppearanceFS);

        /**
         * DOC_TBA
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