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
     */
    var PerInstanceColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var defaults = new Appearance(options);

        var flat = defaultValue(options.flat, false);
        var vs = flat ? PerInstanceFlatColorAppearanceVS : PerInstanceColorAppearanceVS;
        var fs = flat ? PerInstanceFlatColorAppearanceFS : PerInstanceColorAppearanceFS;
        var vertexFormat = flat ? VertexFormat.POSITION_ONLY : VertexFormat.POSITION_AND_NORMAL;

        /**
         * DOC_TBA
         */
        this.material = undefined;

        /**
         * DOC_TBA
         */
        this.vertexFormat = vertexFormat;

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, vs);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);

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

        // Non-derived members

        /**
         * DOC_TBA
         */
        this.flat = flat;
    };

    /**
     * DOC_TBA
     */
    PerInstanceColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return PerInstanceColorAppearance;
});