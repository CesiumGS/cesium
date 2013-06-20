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
     *
     * @alias Appearance
     * @constructor
     */
    var Appearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var materialSupport = defaultValue(options.materialSupport, Appearance.MaterialSupport.BASIC);

        /**
         * DOC_TBA
         * @readonly
         */
        this.materialSupport = materialSupport;

        /**
         * DOC_TBA
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * DOC_TBA
         * @readonly
         */
        this.vertexFormat = defaultValue(options.vertexFormat, materialSupport.vertexFormat);

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
        this.translucent = defaultValue(options.translucent, true);

        /**
         * DOC_TBA
         * @readonly
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
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, rs);
    };

    /**
     * DOC_TBA
     */
    Appearance.prototype.getFragmentShaderSource = function() {
        var flat = this.flat ? '#define FLAT \n#line 0 \n' : '#line 0 \n';
        var faceForward = this.faceForward ? '#define FACE_FORWARD \n#line 0 \n' : '#line 0 \n';

        if (typeof this.material !== 'undefined') {
            return '#line 0\n' +
                this.material.shaderSource +
                flat +
                this.fragmentShaderSource;
        }

        return flat + faceForward + this.fragmentShaderSource;
    };

    /**
     * DOC_TBA
     * @enumeration
     */
    Appearance.MaterialSupport = {
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

    return Appearance;
});