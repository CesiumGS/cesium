/*global define*/
define([
        '../Core/defaultValue',
        '../Core/VertexFormat',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        './Material',
        './Appearance',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceVS',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceFS'
    ], function(
        defaultValue,
        VertexFormat,
        CullFace,
        BlendingState,
        Material,
        Appearance,
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

        /**
         * DOC_TBA
         * @readonly
         */
        this.materialSupport = Appearance.MaterialSupport.NONE;

        /**
         * DOC_TBA
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexFormat = EllipsoidSurfaceAppearance.VERTEX_FORMAT;

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
        this.translucent = defaultValue(options.translucent, true);

        /**
         * DOC_TBA
         * @readonly
         */
        this.closed = false;

        var rs = {
            depthTest : {
                enabled : true
            }
        };

        if (!this.aboveGround) {
            rs.cull = {
                enabled : true,
                face : CullFace.BACK
            };
        }

        if (this.translucent) {
            rs.depthMask = false;
            rs.blending = BlendingState.ALPHA_BLEND;
        }

        /**
         * DOC_TBA
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, rs);

        // Non-derived members

        /**
         * DOC_TBA
         * @readonly
         */
        this.aboveGround = defaultValue(options.aboveGround, false);
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