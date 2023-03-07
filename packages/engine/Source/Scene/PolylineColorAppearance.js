import defaultValue from "../Core/defaultValue.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import VertexFormat from "../Core/VertexFormat.js";
import PerInstanceFlatColorAppearanceFS from "../Shaders/Appearances/PerInstanceFlatColorAppearanceFS.js";
import PolylineColorAppearanceVS from "../Shaders/Appearances/PolylineColorAppearanceVS.js";
import PolylineCommon from "../Shaders/PolylineCommon.js";
import Appearance from "./Appearance.js";

let defaultVertexShaderSource = `${PolylineCommon}\n${PolylineColorAppearanceVS}`;
const defaultFragmentShaderSource = PerInstanceFlatColorAppearanceFS;

if (!FeatureDetection.isInternetExplorer()) {
  defaultVertexShaderSource = `#define CLIP_POLYLINE \n${defaultVertexShaderSource}`;
}

/**
 * An appearance for {@link GeometryInstance} instances with color attributes and
 * {@link PolylineGeometry} or {@link GroundPolylineGeometry}.
 * This allows several geometry instances, each with a different color, to
 * be drawn with the same {@link Primitive}.
 *
 * @alias PolylineColorAppearance
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link PolylineColorAppearance#renderState} has alpha blending enabled.
 * @param {string} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
 * @param {string} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
 * @param {object} [options.renderState] Optional render state to override the default render state.
 *
 * @example
 * // A solid white line segment
 * const primitive = new Cesium.Primitive({
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
function PolylineColorAppearance(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const translucent = defaultValue(options.translucent, true);
  const closed = false;
  const vertexFormat = PolylineColorAppearance.VERTEX_FORMAT;

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
   * @type {boolean}
   *
   * @default true
   */
  this.translucent = translucent;

  this._vertexShaderSource = defaultValue(
    options.vertexShaderSource,
    defaultVertexShaderSource
  );
  this._fragmentShaderSource = defaultValue(
    options.fragmentShaderSource,
    defaultFragmentShaderSource
  );
  this._renderState = Appearance.getDefaultRenderState(
    translucent,
    closed,
    options.renderState
  );
  this._closed = closed;

  // Non-derived members

  this._vertexFormat = vertexFormat;
}

Object.defineProperties(PolylineColorAppearance.prototype, {
  /**
   * The GLSL source code for the vertex shader.
   *
   * @memberof PolylineColorAppearance.prototype
   *
   * @type {string}
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
   * @memberof PolylineColorAppearance.prototype
   *
   * @type {string}
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
   * The render state can be explicitly defined when constructing a {@link PolylineColorAppearance}
   * instance, or it is set implicitly via {@link PolylineColorAppearance#translucent}.
   * </p>
   *
   * @memberof PolylineColorAppearance.prototype
   *
   * @type {object}
   * @readonly
   */
  renderState: {
    get: function () {
      return this._renderState;
    },
  },

  /**
   * When <code>true</code>, the geometry is expected to be closed so
   * {@link PolylineColorAppearance#renderState} has backface culling enabled.
   * This is always <code>false</code> for <code>PolylineColorAppearance</code>.
   *
   * @memberof PolylineColorAppearance.prototype
   *
   * @type {boolean}
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
   * @memberof PolylineColorAppearance.prototype
   *
   * @type VertexFormat
   * @readonly
   *
   * @default {@link PolylineColorAppearance.VERTEX_FORMAT}
   */
  vertexFormat: {
    get: function () {
      return this._vertexFormat;
    },
  },
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
 * @returns {string} The full GLSL fragment shader source.
 */
PolylineColorAppearance.prototype.getFragmentShaderSource =
  Appearance.prototype.getFragmentShaderSource;

/**
 * Determines if the geometry is translucent based on {@link PolylineColorAppearance#translucent}.
 *
 * @function
 *
 * @returns {boolean} <code>true</code> if the appearance is translucent.
 */
PolylineColorAppearance.prototype.isTranslucent =
  Appearance.prototype.isTranslucent;

/**
 * Creates a render state.  This is not the final render state instance; instead,
 * it can contain a subset of render state properties identical to the render state
 * created in the context.
 *
 * @function
 *
 * @returns {object} The render state.
 */
PolylineColorAppearance.prototype.getRenderState =
  Appearance.prototype.getRenderState;
export default PolylineColorAppearance;
