/*global define*/
define([
        '../Core/defaultValue',
        '../Core/freezeObject',
        '../Core/VertexFormat',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        './Appearance',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceVS',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceFS'
    ], function(
        defaultValue,
        freezeObject,
        VertexFormat,
        CullFace,
        BlendingState,
        Appearance,
        PerInstanceFlatColorAppearanceVS,
        PerInstanceFlatColorAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PerInstanceFlatColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var defaults = new Appearance(options);

        /**
         * DOC_TBA
         */
        this.material = undefined;

        /**
         * DOC_TBA
         */
        this.vertexFormat = PerInstanceFlatColorAppearance.VERTEX_FORMAT;

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, PerInstanceFlatColorAppearanceVS);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, PerInstanceFlatColorAppearanceFS);

        /**
         * DOC_TBA
         */
        this.translucent = defaults.translucent;

        /**
         * DOC_TBA
         */
        this.closed = defaults.closed;

        /**
         * DOC_TBA
         */
        this.renderState = defaults.renderState;
    };

    /**
     * DOC_TBA
     */
    PerInstanceFlatColorAppearance.VERTEX_FORMAT = freezeObject(VertexFormat.POSITION_ONLY);

    /**
     * DOC_TBA
     */
    PerInstanceFlatColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return PerInstanceFlatColorAppearance;
});