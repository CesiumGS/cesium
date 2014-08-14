/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/VertexFormat',
        '../Renderer/createShaderSource',
        '../Shaders/Appearances/PerInstanceFlatColorAppearanceFS',
        '../Shaders/Appearances/PolylineColorAppearanceVS',
        '../Shaders/PolylineCommon',
        './Appearance'
    ], function(
        defaultValue,
        defineProperties,
        VertexFormat,
        createShaderSource,
        PerInstanceFlatColorAppearanceFS,
        PolylineColorAppearanceVS,
        PolylineCommon,
        Appearance) {
    "use strict";

    /**
     * An appearance for {@link GeometryInstance} instances with color attributes and {@link PolylineGeometry}.
     * This allows several geometry instances, each with a different color, to
     * be drawn with the same {@link Primitive}.
     *
     * @alias PolylineColorAppearance
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link PolylineColorAppearance#renderState} has alpha blending enabled.
     * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {RenderState} [options.renderState] Optional render state to override the default render state.
     *
     *@demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polyline%20Color.html|Cesium Sandcastle Polyline Color Appearance Demo}
     *
     * @example
     * // A solid white line segment
     * var primitive = new Cesium.Primitive({
     *   geometryInstances : new Cesium.GeometryInstance({
     *     geometry : new Cesium.PolylineGeometry({
     *       positions : Cesium.Cartesian3.fromDegreesArray([
     *         0.0, 0.0,
     *         5.0, 0.0
     *       ]),
     *       width : 10.0,
     *       vertexFormat : Cesium.PolylineColorAppearance.VERTEX_FORMAT
     *     }),
     *     attributes : {
     *       color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 1.0, 1.0, 1.0))
     *     }
     *   }),
     *   appearance : new Cesium.PolylineColorAppearance({
     *     translucent : false
     *   })
     * });
     */
    var PolylineColorAppearance = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var translucent = defaultValue(options.translucent, true);
        var closed = false;
        var vs = createShaderSource({ sources : [PolylineCommon, PolylineColorAppearanceVS] });
        var fs = PerInstanceFlatColorAppearanceFS;
        var vertexFormat = PolylineColorAppearance.VERTEX_FORMAT;

        /**
         * This property is part of the {@link Appearance} interface, but is not
         * used by {@link PolylineColorAppearance} since a fully custom fragment shader is used.
         *
         * @type Material
         *
         * @default undefined
         */
        this.material = undefined;

        /**
         * When <code>true</code>, the geometry is expected to appear translucent so
         * {@link PolylineColorAppearance#renderState} has alpha blending enabled.
         *
         * @type {Boolean}
         *
         * @default true
         */
        this.translucent = translucent;

        this._vertexShaderSource = defaultValue(options.vertexShaderSource, vs);
        this._fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);
        this._renderState = defaultValue(options.renderState, Appearance.getDefaultRenderState(translucent, closed));
        this._closed = closed;

        // Non-derived members

        this._vertexFormat = vertexFormat;
    };

    defineProperties(PolylineColorAppearance.prototype, {
        /**
         * The GLSL source code for the vertex shader.
         *
         * @memberof PolylineColorAppearance.prototype
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
         * The GLSL source code for the fragment shader.
         *
         * @memberof PolylineColorAppearance.prototype
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
         * The render state can be explicitly defined when constructing a {@link PolylineColorAppearance}
         * instance, or it is set implicitly via {@link PolylineColorAppearance#translucent}.
         * </p>
         *
         * @memberof PolylineColorAppearance.prototype
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
         * {@link PolylineColorAppearance#renderState} has backface culling enabled.
         * This is always <code>false</code> for <code>PolylineColorAppearance</code>.
         *
         * @memberof PolylineColorAppearance.prototype
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
         * @memberof PolylineColorAppearance.prototype
         *
         * @type VertexFormat
         * @readonly
         *
         * @default {@link PolylineColorAppearance.VERTEX_FORMAT}
         */
        vertexFormat : {
            get : function() {
                return this._vertexFormat;
            }
        }
    });

    /**
     * The {@link VertexFormat} that all {@link PolylineColorAppearance} instances
     * are compatible with. This requires only a <code>position</code> attribute.
     *
     * @type VertexFormat
     *
     * @constant
     */
    PolylineColorAppearance.VERTEX_FORMAT = VertexFormat.POSITION_ONLY;

    /**
     * Procedurally creates the full GLSL fragment shader source.
     *
     * @function
     *
     * @returns String The full GLSL fragment shader source.
     */
    PolylineColorAppearance.prototype.getFragmentShaderSource = Appearance.prototype.getFragmentShaderSource;

    /**
     * Determines if the geometry is translucent based on {@link PolylineColorAppearance#translucent}.
     *
     * @function
     *
     * @returns {Boolean} <code>true</code> if the appearance is translucent.
     */
    PolylineColorAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

    /**
     * Creates a render state.  This is not the final render state instance; instead,
     * it can contain a subset of render state properties identical to the render state
     * created in the context.
     *
     * @function
     *
     * @returns {Object} The render state.
     */
    PolylineColorAppearance.prototype.getRenderState = Appearance.prototype.getRenderState;

    return PolylineColorAppearance;
});