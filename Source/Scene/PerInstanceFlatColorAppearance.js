/*global define*/
define([
        '../Core/defaultValue',
        '../Core/freezeObject',
        '../Core/VertexFormat',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceVS',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceFS'
    ], function(
        defaultValue,
        freezeObject,
        VertexFormat,
        CullFace,
        BlendingState,
        PerInstanceFlatColorAppearanceVS,
        PerInstanceFlatColorDefaultAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PerInstanceFlatColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

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
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, PerInstanceFlatColorDefaultAppearanceFS);

        /**
         * DOC_TBA
         */
        this.renderState = defaultValue(options.renderState, {});
/*
            cull : {
                enabled : true,
                face : CullFace.BACK
            },
            depthTest : {
                enabled : true
            },
            depthMask : false,
            blending : BlendingState.ALPHA_BLEND
        });
*/
    };

    /**
     * DOC_TBA
     */
    PerInstanceFlatColorAppearance.VERTEX_FORMAT = freezeObject(VertexFormat.POSITION_AND_NORMAL);

    /**
     * DOC_TBA
     */
    PerInstanceFlatColorAppearance.prototype.getFragmentShaderSource = function() {
        // Unlike other appearances, this does not have a material
        return this.fragmentShaderSource;
    };

    return PerInstanceFlatColorAppearance;
});