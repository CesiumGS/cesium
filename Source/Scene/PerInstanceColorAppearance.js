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
     *
     * @alias PerInstanceColorAppearance
     * @constructor
     */
    var PerInstanceColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = defaultValue(options.closed, false);
        var flat = defaultValue(options.flat, false);
        var vs = flat ? PerInstanceFlatColorAppearanceVS : PerInstanceColorAppearanceVS;
        var fs = flat ? PerInstanceFlatColorAppearanceFS : PerInstanceColorAppearanceFS;
        var vertexFormat = flat ? PerInstanceColorAppearance.FLAT_VERTEX_FORMAT : PerInstanceColorAppearance.VERTEX_FORMAT;

        /**
         * DOC_TBA
         */
        this.material = undefined;

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
        this.renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(translucent, closed));

        // Non-derived members

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexFormat = vertexFormat;

        /**
         * DOC_TBA
         * @readonly
         */
        this.flat = flat;

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
        this.closed = closed;
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