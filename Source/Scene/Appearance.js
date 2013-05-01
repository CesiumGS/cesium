/*global define*/
define([
        '../Core/freezeObject',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        './Material',
        '../Shaders/DefaultAppearanceVS',
        '../Shaders/DefaultAppearanceFS'
    ], function(
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
// TODO: throw without options
        /**
         * DOC_TBA
         */
        this.material = options.material;

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = options.vertexShaderSource;

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = options.fragmentShaderSource;

        /**
         * DOC_TBA
         */
        this.renderState = options.renderState;
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

    Appearance.EXAMPLE_APPEARANCE = freezeObject(new Appearance({
        material : Material.fromType(undefined, Material.ColorType),
        vertexShaderSource : DefaultAppearanceVS,
        fragmentShaderSource : DefaultAppearanceFS,
        renderState : {
            cull : {
                enabled : true,
                face : CullFace.BACK
            },
            blending : BlendingState.ALPHA_BLEND
        }
    }));

    return Appearance;
});