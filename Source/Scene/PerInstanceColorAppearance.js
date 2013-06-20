/*global define*/
define([
        '../Core/defaultValue',
        '../Core/freezeObject',
        '../Core/VertexFormat',
        './Appearance',
        '../Shaders/Appearances/PerInstanceColorAppearanceVS',
        '../Shaders/Appearances/PerInstanceColorAppearanceFS'
    ], function(
        defaultValue,
        freezeObject,
        VertexFormat,
        Appearance,
        PerInstanceColorAppearanceVS,
        PerInstanceColorAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PerInstanceColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var defaults = new Appearance(options);

        /**
         * DOC_TBA
         */
        this.material = undefined;

        /**
         * DOC_TBA
         */
        this.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, PerInstanceColorAppearanceVS);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, PerInstanceColorAppearanceFS);

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
    PerInstanceColorAppearance.VERTEX_FORMAT = freezeObject(VertexFormat.POSITION_AND_NORMAL);

    /**
     * DOC_TBA
     */
    PerInstanceColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return PerInstanceColorAppearance;
});