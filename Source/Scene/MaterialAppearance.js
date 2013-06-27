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
         * The material used to determine the fragment color.  Unlike other {@link MaterialAppearance}
         * properties, this is not read-only, so an appearance's material can change on the fly.
         *
         * @type Material
         *
         * @default Material.ColorType
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = (typeof options.material !== 'undefined') ? options.material : Material.fromType(undefined, Material.ColorType);

        /**
         * The GLSL source code for the vertex shader.
         *
         * @type String
         *
         * @readonly
         */
        this.vertexShaderSource = defaultValue(options.vertexShaderSource, materialSupport.vertexShaderSource);

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account {@link MaterialAppearance#material},
         * {@link MaterialAppearance#flat}, and {@link MaterialAppearance#faceForward}.
         * Use {@link MaterialAppearance#getFragmentShaderSource} to get the full source.
         *
         * @type String
         *
         * @readonly
         */
        this.fragmentShaderSource = defaultValue(options.fragmentShaderSource, materialSupport.fragmentShaderSource);

        /**
         * The render state.  This is not the final {@link RenderState} instance; instead,
         * it can contain a subset of render state properties identical to <code>renderState</code>
         * passed to {@link Context#createRenderState}.
         * <p>
         * The render state can be explicitly defined when constructing a {@link MaterialAppearance}
         * instance, or it is set implicitly via {@link MaterialAppearance#translucent}
         * and {@link MaterialAppearance#closed}.
         * </p>
         *
         * @type Object
         *
         * @readonly
         */
        this.renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(translucent, closed));

        // Non-derived members

        /**
         * The type of materials supported by this instance.  This impacts the required
         * {@link VertexFormat} and the complexity of the vertex and fragment shaders.
         *
         * @type MaterialAppearance.MaterialSupport
         *
         * @readonly
         */
        this.materialSupport = materialSupport;

        /**
         * The {@link VertexFormat} that this appearance instance is compatible with.
         * A geometry can have more vertex attributes and still be compatible - at a
         * potential performance cost - but it can't have less.
         *
         * @type VertexFormat
         *
         * @readonly
         */
        this.vertexFormat = defaultValue(options.vertexFormat, materialSupport.vertexFormat);

        /**
         * When <code>true</code>, flat shading is used in the fragment shader,
         * which means lighting is not taking into account.
         *
         * @readonly
         *
         * @default false
         */
        this.flat = defaultValue(options.flat, false);

        /**
         * When <code>true</code>, the fragment shader flips the surface normal
         * as needed to ensure that the normal faces the viewer to avoid
         * dark spots.  This is useful when both sides of a geometry should be
         * shaded like {@link WallGeometry}.
         *
         * @readonly
         *
         * @default false
         */
        this.faceForward = defaultValue(options.faceForward, false);

        /**
         * When <code>true</code>, the geometry is expected to appear translucent so
         * {@link MaterialAppearance#renderState} has alpha blending enabled.
         *
         * @readonly
         *
         * @default true
         */
        this.translucent = translucent;

        /**
         * When <code>true</code>, the geometry is expected to be closed so
         * {@link MaterialAppearance#renderState} has backface culling enabled.
         * If the viewer enters the geometry, it will not be visible.
         *
         * @readonly
         *
         * @default false
         */
        this.closed = closed;
    };

    /**
     * Procedurally creates the full GLSL fragment shader source.  For {@link MaterialAppearance},
     * this is derived from {@link MaterialAppearance#fragmentShaderSource}, {@link MaterialAppearance#material},
     * {@link MaterialAppearance#flat}, and {@link MaterialAppearance#faceForward}.
     *
     * @memberof MaterialAppearance
     *
     * @return String The full GLSL fragment shader source.
     */
    MaterialAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines the type of {@link Material} that is supported by a
     * {@link MaterialAppearance} instance.  This is a trade-off between
     * flexibility (a wide array of materials) and memory/performance
     * (required vertex format and GLSL shader complexity.
     *
     * @memberof MaterialAppearance
     *
     * @enumeration
     */
    MaterialAppearance.MaterialSupport = {
        /**
         * Only basic materials, which require just <code>position</code> and
         * <code>normal</code> vertex attributes, are supported.
         *
         * @readonly
         */
        BASIC : freezeObject({
            vertexFormat : VertexFormat.POSITION_AND_NORMAL,
            vertexShaderSource : BasicMaterialAppearanceVS,
            fragmentShaderSource : BasicMaterialAppearanceFS

        }),
        /**
         * Materials with textures, which require <code>position</code>,
         * <code>normal</code>, and <code>st</code> vertex attributes,
         * are supported.  The vast majority of materials fall into this category.
         *
         * @readonly
         */
        TEXTURED : freezeObject({
            vertexFormat : VertexFormat.POSITION_NORMAL_AND_ST,
            vertexShaderSource : TexturedMaterialAppearanceVS,
            fragmentShaderSource : TexturedMaterialAppearanceFS
        }),
        /**
         * All materials, including those that work in tangent space, are supported.
         * This requires <code>position</code>, <code>normal</code>, <code>st</code>,
         * <code>binormal</code>, and <code>tangent</code> vertex attributes.
         *
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