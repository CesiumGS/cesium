/*global define*/
define([
        '../Core/defaultValue',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        './Appearance'
    ], function(
        defaultValue,
        CullFace,
        BlendingState,
        Appearance) {
    "use strict";

    /**
     * DOC_TBA
     */
    var ClosedTranslucentAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var defaults = new Appearance(options);

        /**
         * DOC_TBA
         */
        this.material = defaults.material;

        /**
         * DOC_TBA
         */
        this.vertexFormat = defaults.vertexFormat;

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaults.vertexShaderSource;

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaults.fragmentShaderSource;

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
    ClosedTranslucentAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return ClosedTranslucentAppearance;
});