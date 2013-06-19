/*global define*/
define([
        '../Core/defaultValue',
        '../Renderer/BlendingState',
        './Material',
        './Appearance'
    ], function(
        defaultValue,
        BlendingState,
        Material,
        Appearance) {
    "use strict";

    /**
     * DOC_TBA
     */
    var TranslucentAppearance = function(options) {
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
    TranslucentAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return TranslucentAppearance;
});