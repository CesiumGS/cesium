/*global define*/
define([
        '../Core/defaultValue',
        '../Core/VertexFormat',
        './Appearance',
        '../Shaders/Appearances/PointAppearanceVS',
        '../Shaders/Appearances/PointAppearanceFS'
    ], function(
        defaultValue,
        VertexFormat,
        Appearance,
        PointAppearanceVS,
        PointAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PointAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, PointAppearanceVS);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, PointAppearanceFS);

        /**
         * DOC_TBA
         */
        this.renderState = defaultValue(options.renderState, {
            depthTest : {
                enabled : true
            }
        });

        // Non-derived members

        /**
         * DOC_TBA
         */
        this.vertexFormat = VertexFormat.POSITION_AND_COLOR;
    };

    PointAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_COLOR;

    /**
     * DOC_TBA
     */
    PointAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    return PointAppearance;
});