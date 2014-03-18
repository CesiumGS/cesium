/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
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
        defined,
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
     * An appearance for arbitrary geometry (as opposed to {@link EllipsoidSurfaceAppearance}, for example)
     * that supports shading with materials.
     *
     * @alias MaterialAppearance
     * @constructor
     *
     * @param {Boolean} [options.flat=false] When <code>true</code>, flat shading is used in the fragment shader, which means lighting is not taking into account.
     * @param {Boolean} [options.faceForward=!options.closed] When <code>true</code>, the fragment shader flips the surface normal as needed to ensure that the normal faces the viewer to avoid dark spots.  This is useful when both sides of a geometry should be shaded like {@link WallGeometry}.
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link MaterialAppearance#renderState} has alpha blending enabled.
     * @param {Boolean} [options.closed=false] When <code>true</code>, the geometry is expected to be closed so {@link MaterialAppearance#renderState} has backface culling enabled.
     * @param {MaterialAppearance.MaterialSupport} [options.materialSupport=MaterialAppearance.MaterialSupport.TEXTURED] The type of materials that will be supported.
     * @param {Material} [options.material=Material.ColorType] The material used to determine the fragment color.
     * @param {String} [options.vertexShaderSource=undefined] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource=undefined] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState=undefined] Optional render state to override the default render state.
     *
     * @example
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.WallGeometry({
            materialSupport :  Cesium.MaterialAppearance.MaterialSupport.BASIC.vertexFormat,
     *       // ...
     *     })
     *   }),
     *   appearance : new Cesium.MaterialAppearance({
     *     material : Cesium.Material.fromType('Color'),
     *     faceForward : true
     *   })
     * });
     *
     * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
     */
    var MaterialAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = defaultValue(options.closed, false);
        var materialSupport = defaultValue(options.materialSupport, MaterialAppearance.MaterialSupport.TEXTURED);

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
        this.material = (defined(options.material)) ? options.material : Material.fromType(Material.ColorType);

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
        this.vertexFormat = materialSupport.vertexFormat;

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
         */
        this.faceForward = defaultValue(options.faceForward, !closed);

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
     * @returns String The full GLSL fragment shader source.
     */
    MaterialAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link MaterialAppearance#translucent} and {@link Material#isTranslucent}.
     *
     * @memberof MaterialAppearance
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    MaterialAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final {@link RenderState} instance; instead,
     * it can contain a subset of render state properties identical to <code>renderState</code>
     * passed to {@link Context#createRenderState}.
     *
     * @memberof MaterialAppearance
     *
     * @returns {Object} The render state.
     */
    MaterialAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

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