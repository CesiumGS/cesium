/*global define*/
define([
        '../Core/defaultValue',
        './Material',
        '../Shaders/Appearances/DefaultAppearanceVS',
        '../Shaders/Appearances/DefaultAppearanceFS'
    ], function(
        defaultValue,
        Material,
        DefaultAppearanceVS,
        DefaultAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Appearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, DefaultAppearanceVS);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, DefaultAppearanceFS);

        /**
         * DOC_TBA
         */
        this.renderState = defaultValue(options.renderState, {});
    };

    /**
     * DOC_TBA
     */
    Appearance.prototype.getFragmentShaderSource = function() {
        return '#line 0\n' +
            this.material.shaderSource +
            '#line 0\n' +
            this.fragmentShaderSource;
    };

    return Appearance;
});