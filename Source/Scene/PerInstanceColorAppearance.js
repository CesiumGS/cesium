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

        var flat = defaults.flat;
        var vs = flat ? PerInstanceFlatColorAppearanceVS : PerInstanceColorAppearanceVS;
        var fs = flat ? PerInstanceFlatColorAppearanceFS : PerInstanceColorAppearanceFS;
        var vertexFormat = flat ? PerInstanceColorAppearance.FLAT_VERTEX_FORMAT : PerInstanceColorAppearance.VERTEX_FORMAT;

        /**
         * DOC_TBA
         * @readonly
         */
        this.materialSupport = Appearance.MaterialSupport.NONE;

        /**
         * DOC_TBA
         */
        this.material = undefined;

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexFormat = vertexFormat;

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, vs);

        /**
         * DOC_TBA
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);

        /**
         * DOC_TBA
         * @readonly
         */
        this.flat = flat;

        /**
         * DOC_TBA
         * @readonly
         */
        this.faceForward = defaults.faceForward;

        /**
         * DOC_TBA
         * @readonly
         */
        this.translucent = defaults.translucent;

        /**
         * DOC_TBA
         * @readonly
         */
        this.closed = defaults.closed;

        /**
         * DOC_TBA
         * @readonly
         */
        this.renderState = defaults.renderState;
    };

    /**
     * DOC_TBA
     * @constant
     */
    PerInstanceColorAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_NORMAL;

    /**
     * DOC_TBA
     * @constant
     */
    PerInstanceColorAppearance.FLAT_VERTEX_FORMAT = VertexFormat.POSITION_ONLY;

    /**
     * DOC_TBA
     */
    PerInstanceColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return PerInstanceColorAppearance;
});