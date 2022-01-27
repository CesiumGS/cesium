import defaultValue from "../Core/defaultValue.js";
import VertexFormat from "../Core/VertexFormat.js";
import PerInstanceColorAppearanceFS from "../Shaders/Appearances/PerInstanceColorAppearanceFS.js";
import PerInstanceColorAppearanceVS from "../Shaders/Appearances/PerInstanceColorAppearanceVS.js";
import PerInstanceFlatColorAppearanceFS from "../Shaders/Appearances/PerInstanceFlatColorAppearanceFS.js";
import PerInstanceFlatColorAppearanceVS from "../Shaders/Appearances/PerInstanceFlatColorAppearanceVS.js";
import Appearance from "./Appearance.js";

/**
 * An appearance for {@link GeometryInstance} instances with color attributes.
 * This allows several geometry instances, each with a different color, to
 * be drawn with the same {@link Primitive} as shown in the second example below.
 *
 * @alias PerInstanceColorAppearance
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.flat=false] When <code>true</code>, flat shading is used in the fragment shader, which means lighting is not taking into account.
 * @param {Boolean} [options.faceForward=!options.closed] When <code>true</code>, the fragment shader flips the surface normal as needed to ensure that the normal faces the viewer to avoid dark spots.  This is useful when both sides of a geometry should be shaded like {@link WallGeometry}.
 * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link PerInstanceColorAppearance#renderState} has alpha blending enabled.
 * @param {Boolean} [options.closed=false] When <code>true</code>, the geometry is expected to be closed so {@link PerInstanceColorAppearance#renderState} has backface culling enabled.
 * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
 * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
 * @param {Object} [options.renderState] Optional render state to override the default render state.
 *
 * @example
 * // A solid white line segment
 * var primitive = new Cesium.Primitive({
 *   geometryInstances : new Cesium.GeometryInstance({
 *     geometry : new Cesium.SimplePolylineGeometry({
 *       positions : Cesium.Cartesian3.fromDegreesArray([
 *         0.0, 0.0,
 *         5.0, 0.0
 *       ])
 *     }),
 *     attributes : {
 *       color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 1.0, 1.0, 1.0))
 *     }
 *   }),
 *   appearance : new Cesium.PerInstanceColorAppearance({
 *     flat : true,
 *     translucent : false
 *   })
 * });
 *
 * // Two rectangles in a primitive, each with a different color
 * var instance = new Cesium.GeometryInstance({
 *   geometry : new Cesium.RectangleGeometry({
 *     rectangle : Cesium.Rectangle.fromDegrees(0.0, 20.0, 10.0, 30.0)
 *   }),
 *   attributes : {
 *     color : new Cesium.ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 0.5)
 *   }
 * });
 *
 * var anotherInstance = new Cesium.GeometryInstance({
 *   geometry : new Cesium.RectangleGeometry({
 *     rectangle : Cesium.Rectangle.fromDegrees(0.0, 40.0, 10.0, 50.0)
 *   }),
 *   attributes : {
 *     color : new Cesium.ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 0.5)
 *   }
 * });
 *
 * var rectanglePrimitive = new Cesium.Primitive({
 *   geometryInstances : [instance, anotherInstance],
 *   appearance : new Cesium.PerInstanceColorAppearance()
 * });
 */
function PerInstanceColorAppearance(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const translucent = defaultValue(options.translucent, true);
  const closed = defaultValue(options.closed, false);
  const flat = defaultValue(options.flat, false);
  const vs = flat
    ? PerInstanceFlatColorAppearanceVS
    : PerInstanceColorAppearanceVS;
  const fs = flat
    ? PerInstanceFlatColorAppearanceFS
    : PerInstanceColorAppearanceFS;
  const vertexFormat = flat
    ? PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
    : PerInstanceColorAppearance.VERTEX_FORMAT;

  /**
   * This property is part of the {@link Appearance} interface, but is not
   * used by {@link PerInstanceColorAppearance} since a fully custom fragment shader is used.
   *
   * @type Material
   *
   * @default undefined
   */
  this.material = undefined;

  /**
   * When <code>true</code>, the geometry is expected to appear translucent so
   * {@link PerInstanceColorAppearance#renderState} has alpha blending enabled.
   *
   * @type {Boolean}
   *
   * @default true
   */
  this.translucent = translucent;

  this._vertexShaderSource = defaultValue(options.vertexShaderSource, vs);
  this._fragmentShaderSource = defaultValue(options.fragmentShaderSource, fs);
  this._renderState = Appearance.getDefaultRenderState(
    translucent,
    closed,
    options.renderState
  );
  this._closed = closed;

  // Non-derived members

  this._vertexFormat = vertexFormat;
  this._flat = flat;
  this._faceForward = defaultValue(options.faceForward, !closed);
}

Object.defineProperties(PerInstanceColorAppearance.prototype, {
  /**
   * The GLSL source code for the vertex shader.
   *
   * @memberof PerInstanceColorAppearance.prototype
   *
   * @type {String}
   * @readonly
   */
  vertexShaderSource: {
    get: function () {
      return this._vertexShaderSource;
    },
  },

  /**
   * The GLSL source code for the fragment shader.
   *
   * @memberof PerInstanceColorAppearance.prototype
   *
   * @type {String}
   * @readonly
   */
  fragmentShaderSource: {
    get: function () {
      return this._fragmentShaderSource;
    },
  },

  /**
   * The WebGL fixed-function state to use when rendering the geometry.
   * <p>
   * The render state can be explicitly defined when constructing a {@link PerInstanceColorAppearance}
   * instance, or it is set implicitly via {@link PerInstanceColorAppearance#translucent}
   * and {@link PerInstanceColorAppearance#closed}.
   * </p>
   *
   * @memberof PerInstanceColorAppearance.prototype
   *
   * @type {Object}
   * @readonly
   */
  renderState: {
    get: function () {
      return this._renderState;
    },
  },

  /**
   * When <code>true</code>, the geometry is expected to be closed so
   * {@link PerInstanceColorAppearance#renderState} has backface culling enabled.
   * If the viewer enters the geometry, it will not be visible.
   *
   * @memberof PerInstanceColorAppearance.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  closed: {
    get: function () {
      return this._closed;
    },
  },

  /**
   * The {@link VertexFormat} that this appearance instance is compatible with.
   * A geometry can have more vertex attributes and still be compatible - at a
   * potential performance cost - but it can't have less.
   *
   * @memberof PerInstanceColorAppearance.prototype
   *
   * @type VertexFormat
   * @readonly
   */
  vertexFormat: {
    get: function () {
      return this._vertexFormat;
    },
  },

  /**
   * When <code>true</code>, flat shading is used in the fragment shader,
   * which means lighting is not taking into account.
   *
   * @memberof PerInstanceColorAppearance.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  flat: {
    get: function () {
      return this._flat;
    },
  },

  /**
   * When <code>true</code>, the fragment shader flips the surface normal
   * as needed to ensure that the normal faces the viewer to avoid
   * dark spots.  This is useful when both sides of a geometry should be
   * shaded like {@link WallGeometry}.
   *
   * @memberof PerInstanceColorAppearance.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  faceForward: {
    get: function () {
      return this._faceForward;
    },
  },
});

/**
 * The {@link VertexFormat} that all {@link PerInstanceColorAppearance} instances
 * are compatible with.  This requires only <code>position</code> and <code>normal</code>
 * attributes.
 *
 * @type VertexFormat
 *
 * @constant
 */
PerInstanceColorAppearance.VERTEX_FORMAT = VertexFormat.POSITION_AND_NORMAL;

/**
 * The {@link VertexFormat} that all {@link PerInstanceColorAppearance} instances
 * are compatible with when {@link PerInstanceColorAppearance#flat} is <code>true</code>.
 * This requires only a <code>position</code> attribute.
 *
 * @type VertexFormat
 *
 * @constant
 */
PerInstanceColorAppearance.FLAT_VERTEX_FORMAT = VertexFormat.POSITION_ONLY;

/**
 * Procedurally creates the full GLSL fragment shader source.  For {@link PerInstanceColorAppearance},
 * this is derived from {@link PerInstanceColorAppearance#fragmentShaderSource}, {@link PerInstanceColorAppearance#flat},
 * and {@link PerInstanceColorAppearance#faceForward}.
 *
 * @function
 *
 * @returns {String} The full GLSL fragment shader source.
 */
PerInstanceColorAppearance.prototype.getFragmentShaderSource =
  Appearance.prototype.getFragmentShaderSource;

/**
 * Determines if the geometry is translucent based on {@link PerInstanceColorAppearance#translucent}.
 *
 * @function
 *
 * @returns {Boolean} <code>true</code> if the appearance is translucent.
 */
PerInstanceColorAppearance.prototype.isTranslucent =
  Appearance.prototype.isTranslucent;

/**
 * Creates a render state.  This is not the final render state instance; instead,
 * it can contain a subset of render state properties identical to the render state
 * created in the context.
 *
 * @function
 *
 * @returns {Object} The render state.
 */
PerInstanceColorAppearance.prototype.getRenderState =
  Appearance.prototype.getRenderState;
export default PerInstanceColorAppearance;
