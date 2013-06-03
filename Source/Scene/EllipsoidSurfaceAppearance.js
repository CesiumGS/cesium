/*global define*/
define([
        '../Core/defaultValue',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        './Material',
        './Appearance',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceVS',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceFS'
    ], function(
        defaultValue,
        CullFace,
        BlendingState,
        Material,
        Appearance,
        EllipsoidSurfaceAppearanceVS,
        EllipsoidSurfaceAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var EllipsoidSurfaceAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, EllipsoidSurfaceAppearanceVS);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, EllipsoidSurfaceAppearanceFS);

        /**
         * DOC_TBA
         */
        this.renderState = defaultValue(options.renderState, {
            cull : {
                enabled : true,
                face : CullFace.BACK
            },
            depthTest : {
                enabled : true
            },
            depthMask : false,
            blending : BlendingState.ALPHA_BLEND
        });
    };

    /**
     * DOC_TBA
     */
    EllipsoidSurfaceAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return EllipsoidSurfaceAppearance;
});