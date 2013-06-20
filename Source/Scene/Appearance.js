/*global define*/
define([
        '../Core/defaultValue',
        '../Core/freezeObject',
        '../Core/VertexFormat',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        './Material',
        '../Shaders/Appearances/BasicMaterialAppearanceVS',
        '../Shaders/Appearances/BasicMaterialAppearanceFS',
        '../Shaders/Appearances/TexturedMaterialAppearanceVS',
        '../Shaders/Appearances/TexturedMaterialAppearanceFS',
        '../Shaders/Appearances/AllMaterialAppearanceVS',
        '../Shaders/Appearances/AllMaterialAppearanceFS'
    ], function(
        defaultValue,
        freezeObject,
        VertexFormat,
        CullFace,
        BlendingState,
        Material,
        BasicMaterialAppearanceVS,
        BasicMaterialAppearanceFS,
        TexturedMaterialAppearanceVS,
        TexturedMaterialAppearanceFS,
        AllMaterialAppearanceVS,
        AllMaterialAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Appearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var materialSupport = defaultValue(options.materialSupport, Appearance.MaterialSupport.BASIC);

        /**
         * DOC_TBA
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * DOC_TBA
         */
        this.vertexFormat = defaultValue(options.vertexFormat, materialSupport.vertexFormat);

        /**
         * DOC_TBA
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, materialSupport.vertexShaderSource);

        /**
         * DOC_TBA
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, materialSupport.fragmentShaderSource);

        /**
         * DOC_TBA
         */
        this.translucent = defaultValue(options.translucent, true);

        /**
         * DOC_TBA
         */
        this.closed = defaultValue(options.closed, false);

        var rs = {
            depthTest : {
                enabled : true
            }
        };

        if (this.translucent) {
            rs.depthMask = false;
            rs.blending = BlendingState.ALPHA_BLEND;
        }

        if (this.closed) {
            rs.cull = {
                enabled : true,
                face : CullFace.BACK
            };
        }

        /**
         * DOC_TBA
         */
        this.renderState = defaultValue(options.renderState, rs);
    };

    /**
     * DOC_TBA
     */
    Appearance.prototype.getFragmentShaderSource = function() {
        if (typeof this.material !== 'undefined') {
            return '#line 0\n' +
                this.material.shaderSource +
                '#line 0\n' +
                this.fragmentShaderSource;
        }

        return this.fragmentShaderSource;
    };

    /**
     * DOC_TBA
     */
    Appearance.MaterialSupport = {
        /**
         * DOC_TBA
         */
        BASIC : freezeObject({
            vertexFormat : VertexFormat.POSITION_AND_NORMAL,
            vertexShaderSource : BasicMaterialAppearanceVS,
            fragmentShaderSource : BasicMaterialAppearanceFS

        }),
        /**
         * DOC_TBA
         */
        TEXTURED : freezeObject({
            vertexFormat : VertexFormat.POSITION_NORMAL_AND_ST,
            vertexShaderSource : TexturedMaterialAppearanceVS,
            fragmentShaderSource : TexturedMaterialAppearanceFS
        }),
        /**
         * DOC_TBA
         */
        ALL : freezeObject({
            vertexFormat : VertexFormat.ALL,
            vertexShaderSource : AllMaterialAppearanceVS,
            fragmentShaderSource : AllMaterialAppearanceFS
        })
    };

    return Appearance;
});