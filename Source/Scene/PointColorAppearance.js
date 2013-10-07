/*global define*/
define([
        '../Core/defaultValue',
        '../Core/VertexFormat',
        './Appearance',
        '../Shaders/Appearances/PointColorAppearanceVS',
        '../Shaders/Appearances/PointColorAppearanceFS'
    ], function(
        defaultValue,
        VertexFormat,
        Appearance,
        PointColorAppearanceVS,
        PointColorAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PointColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, PointColorAppearanceVS);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, PointColorAppearanceFS);

        /**
         * DOC_TBA
         */
        this.renderState = defaultValue(options.renderState, {
            depthTest : {
//                enabled : true
            }
        });

        // Non-derived members

        /**
         * DOC_TBA
         */
        this.vertexFormat = VertexFormat.POSITION_AND_COLOR;
    };

    /**
     * DOC_TBA
     */
    PointColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return PointColorAppearance;
});