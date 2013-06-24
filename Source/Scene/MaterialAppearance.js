/*global define*/
define([
        '../Core/defaultValue',
        '../Core/freezeObject',
        '../Core/VertexFormat',
        './Material',
        './Appearance',
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
        Material,
        Appearance,
        BasicMaterialAppearanceVS,
        BasicMaterialAppearanceFS,
        TexturedMaterialAppearanceVS,
        TexturedMaterialAppearanceFS,
        AllMaterialAppearanceVS,
        AllMaterialAppearanceFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias MaterialAppearance
     * @constructor
     */
    var MaterialAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = defaultValue(options.closed, false);
        var materialSupport = defaultValue(options.materialSupport, MaterialAppearance.MaterialSupport.BASIC);

        /**
         * DOC_TBA
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, materialSupport.vertexShaderSource);

        /**
         * DOC_TBA
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, materialSupport.fragmentShaderSource);

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
        this.materialSupport = materialSupport;

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexFormat = defaultValue(options.vertexFormat, materialSupport.vertexFormat);

        /**
         * DOC_TBA
         * @readonly
         */
        this.flat = defaultValue(options.flat, false);

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
     */
    MaterialAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * DOC_TBA
     * @enumeration
     */
    MaterialAppearance.MaterialSupport = {
        /**
         * DOC_TBA
         * @readonly
         */
        NONE : freezeObject({
            vertexFormat : undefined,
            vertexShaderSource : undefined,
            fragmentShaderSource : undefined

        }),
        /**
         * DOC_TBA
         * @readonly
         */
        BASIC : freezeObject({
            vertexFormat : VertexFormat.POSITION_AND_NORMAL,
            vertexShaderSource : BasicMaterialAppearanceVS,
            fragmentShaderSource : BasicMaterialAppearanceFS

        }),
        /**
         * DOC_TBA
         * @readonly
         */
        TEXTURED : freezeObject({
            vertexFormat : VertexFormat.POSITION_NORMAL_AND_ST,
            vertexShaderSource : TexturedMaterialAppearanceVS,
            fragmentShaderSource : TexturedMaterialAppearanceFS
        }),
        /**
         * DOC_TBA
         * @readonly
         */
        ALL : freezeObject({
            vertexFormat : VertexFormat.ALL,
            vertexShaderSource : AllMaterialAppearanceVS,
            fragmentShaderSource : AllMaterialAppearanceFS
        })
    };

    return MaterialAppearance;
});