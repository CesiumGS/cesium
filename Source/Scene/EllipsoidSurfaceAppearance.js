/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/VertexFormat',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceFS',
        '../Shaders/Appearances/EllipsoidSurfaceAppearanceVS',
        './Appearance',
        './Material'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        VertexFormat,
        EllipsoidSurfaceAppearanceFS,
        EllipsoidSurfaceAppearanceVS,
        Appearance,
        Material) {
    'use strict';

    /**
     * An appearance for geometry on the surface of the ellipsoid like {@link PolygonGeometry}
     * and {@link RectangleGeometry}, which supports all materials like {@link MaterialAppearance}
     * with {@link MaterialAppearance.MaterialSupport.ALL}.  However, this appearance requires
     * fewer vertex attributes since the fragment shader can procedurally compute <code>normal</code>,
     * <code>binormal</code>, and <code>tangent</code>.
     *
     * @alias EllipsoidSurfaceAppearance
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.flat=false] When <code>true</code>, flat shading is used in the fragment shader, which means lighting is not taking into account.
     * @param {Boolean} [options.faceForward=options.aboveGround] When <code>true</code>, the fragment shader flips the surface normal as needed to ensure that the normal faces the viewer to avoid dark spots.  This is useful when both sides of a geometry should be shaded like {@link WallGeometry}.
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link EllipsoidSurfaceAppearance#renderState} has alpha blending enabled.
     * @param {Boolean} [options.aboveGround=false] When <code>true</code>, the geometry is expected to be on the ellipsoid's surface - not at a constant height above it - so {@link EllipsoidSurfaceAppearance#renderState} has backface culling enabled.
     * @param {Material} [options.material=Material.ColorType] The material used to determine the fragment color.
     * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState] Optional render state to override the default render state.
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
     *
     * @example
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.PolygonGeometry({
     *       vertexFormat : Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
     *       // ...
     *     })
     *   }),
     *   appearance : new Cesium.EllipsoidSurfaceAppearance({
     *     material : Cesium.Material.fromType('Stripe')
     *   })
     * });
     */
    function EllipsoidSurfaceAppearance(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var aboveGround = defaultValue(options.aboveGround, false);

        /**
         * The material used to determine the fragment color.  Unlike other {@link EllipsoidSurfaceAppearance}
         * properties, this is not read-only, so an appearance's material can change on the fly.
         *
         * @type Material
         *
         * @default {@link Material.ColorType}
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         */
        this.material = (defined(options.material)) ? options.material : Material.fromType(Material.ColorType);

        /**
         * When <code>true</code>, the geometry is expected to appear translucent.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.translucent = defaultValue(options.translucent, true);

        this._vertexShaderSource = defaultValue(options.vertexShaderSource, EllipsoidSurfaceAppearanceVS);
        this._fragmentShaderSource = defaultValue(options.fragmentShaderSource, EllipsoidSurfaceAppearanceFS);
        this._renderState = Appearance.getDefaultRenderState(translucent, !aboveGround, options.renderState);
        this._closed = false;

        // Non-derived members

        this._flat = defaultValue(options.flat, false);
        this._faceForward = defaultValue(options.faceForward, aboveGround);
        this._aboveGround = aboveGround;
    }

    defineProperties(EllipsoidSurfaceAppearance.prototype, {
        /**
         * The GLSL source code for the vertex shader.
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        vertexShaderSource : {
            get : function() {
                return this._vertexShaderSource;
            }
        },

        /**
         * The GLSL source code for the fragment shader.  The full fragment shader
         * source is built procedurally taking into account {@link EllipsoidSurfaceAppearance#material},
         * {@link EllipsoidSurfaceAppearance#flat}, and {@link EllipsoidSurfaceAppearance#faceForward}.
         * Use {@link EllipsoidSurfaceAppearance#getFragmentShaderSource} to get the full source.
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type {String}
         * @readonly
         */
        fragmentShaderSource : {
            get : function() {
                return this._fragmentShaderSource;
            }
        },

        /**
         * The WebGL fixed-function state to use when rendering the geometry.
         * <p>
         * The render state can be explicitly defined when constructing a {@link EllipsoidSurfaceAppearance}
         * instance, or it is set implicitly via {@link EllipsoidSurfaceAppearance#translucent}
         * and {@link EllipsoidSurfaceAppearance#aboveGround}.
         * </p>
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type {Object}
         * @readonly
         */
        renderState : {
            get : function() {
                return this._renderState;
            }
        },

        /**
         * When <code>true</code>, the geometry is expected to be closed so
         * {@link EllipsoidSurfaceAppearance#renderState} has backface culling enabled.
         * If the viewer enters the geometry, it will not be visible.
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        closed : {
            get : function() {
                return this._closed;
            }
        },

        /**
         * The {@link VertexFormat} that this appearance instance is compatible with.
         * A geometry can have more vertex attributes and still be compatible - at a
         * potential performance cost - but it can't have less.
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type VertexFormat
         * @readonly
         *
         * @default {@link EllipsoidSurfaceAppearance.VERTEX_FORMAT}
         */
        vertexFormat : {
            get : function() {
                return EllipsoidSurfaceAppearance.VERTEX_FORMAT;
            }
        },

        /**
         * When <code>true</code>, flat shading is used in the fragment shader,
         * which means lighting is not taking into account.
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        flat : {
            get : function() {
                return this._flat;
            }
        },

        /**
         * When <code>true</code>, the fragment shader flips the surface normal
         * as needed to ensure that the normal faces the viewer to avoid
         * dark spots.  This is useful when both sides of a geometry should be
         * shaded like {@link WallGeometry}.
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default true
         */
        faceForward : {
            get : function() {
                return this._faceForward;
            }
        },

        /**
         * When <code>true</code>, the geometry is expected to be on the ellipsoid's
         * surface - not at a constant height above it - so {@link EllipsoidSurfaceAppearance#renderState}
         * has backface culling enabled.
         *
         *
         * @memberof EllipsoidSurfaceAppearance.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        aboveGround : {
            get : function() {
                return this._aboveGround;
            }
        }
    });

    /**
     * The {@link VertexFormat} that all {@link EllipsoidSurfaceAppearance} instances
     * are compatible with, which requires only <code>position</code> and <code>st</code>
     * attributes.  Other attributes are procedurally computed in the fragment shader.
     *
     * @type VertexFormat
     *
     * @constant
     */
    EllipsoidSurfaceAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_ST;

    /**
     * Procedurally creates the full GLSL fragment shader source.  For {@link EllipsoidSurfaceAppearance},
     * this is derived from {@link EllipsoidSurfaceAppearance#fragmentShaderSource}, {@link EllipsoidSurfaceAppearance#flat},
     * and {@link EllipsoidSurfaceAppearance#faceForward}.
     *
     * @function
     *
     * @returns {String} The full GLSL fragment shader source.
     */
    EllipsoidSurfaceAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link EllipsoidSurfaceAppearance#translucent} and {@link Material#isTranslucent}.
     *
     * @function
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    EllipsoidSurfaceAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final render state instance; instead,
     * it can contain a subset of render state properties identical to the render state
     * created in the context.
     *
     * @function
     *
     * @returns {Object} The render state.
     */
    EllipsoidSurfaceAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return EllipsoidSurfaceAppearance;
});
