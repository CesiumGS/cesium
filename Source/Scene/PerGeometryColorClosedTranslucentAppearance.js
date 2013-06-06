/*global define*/
define([
        '../Core/defaultValue',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        '../Shaders/Appearances/PerGeometryColorAppearanceVS',
        '../Shaders/Appearances/PerGeometryColorAppearanceFS'
    ], function(
        defaultValue,
        CullFace,
        BlendingState,
        PerGeometryColorAppearanceVS,
        PerGeometryColorDefaultAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var PerGeometryColorClosedTranslucentAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.material = undefined;

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, PerGeometryColorAppearanceVS);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, PerGeometryColorDefaultAppearanceFS);

        /**
         * DOC_TBA
         */
        this.renderState = defaultValue(options.renderState, {
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
    };

    /**
     * DOC_TBA
     */
    PerGeometryColorClosedTranslucentAppearance.prototype.getFragmentShaderSource = function() {
        // Unlike other appearances, this does not have a material
        return this.fragmentShaderSource;
    };

    return PerGeometryColorClosedTranslucentAppearance;
});