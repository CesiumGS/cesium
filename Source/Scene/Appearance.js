/*global define*/
define([
        '../Core/defaultValue',
        '../Core/freezeObject',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        './Material',
        '../Shaders/DefaultAppearanceVS',
        '../Shaders/DefaultAppearanceFS'
    ], function(
        defaultValue,
        freezeObject,
        CullFace,
        BlendingState,
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

    /**
     * DOC_TBA
     */
    Appearance.CLOSED_TRANSLUCENT = freezeObject(new Appearance({
        renderState : {
            cull : {
                enabled : true,
                face : CullFace.BACK
            },
            depthTest : {
                enabled : true
            },
            depthMask : false,
            blending : BlendingState.ALPHA_BLEND
        }
    }));

    return Appearance;
});