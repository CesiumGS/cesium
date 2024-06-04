import clone from "../Core/clone.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import BlendingState from "./BlendingState.js";
import CullFace from "./CullFace.js";

/**
 * An appearance defines the full GLSL vertex and fragment shaders and the
 * render state used to draw a {@link Primitive}.  All appearances implement
 * this base <code>Appearance</code> interface.
 *
 * @alias Appearance
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link Appearance#renderState} has alpha blending enabled.
 * @param {boolean} [options.closed=false] When <code>true</code>, the geometry is expected to be closed so {@link Appearance#renderState} has backface culling enabled.
 * @param {Material} [options.material=Material.ColorType] The material used to determine the fragment color.
 * @param {string} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
 * @param {string} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
 * @param {object} [options.renderState] Optional render state to override the default render state.
 *
 * @see MaterialAppearance
 * @see EllipsoidSurfaceAppearance
 * @see PerInstanceColorAppearance
 * @see DebugAppearance
 * @see PolylineColorAppearance
 * @see PolylineMaterialAppearance
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Geometry%20and%20Appearances.html|Geometry and Appearances Demo}
 */
function Appearance(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The material used to determine the fragment color.  Unlike other {@link Appearance}
   * properties, this is not read-only, so an appearance's material can change on the fly.
   *
   * @type Material
   *
   * @see {@link https://github.com/CesiumGS/cesium/wiki/Fabric|Fabric}
   */
  this.material = options.material;

  /**
   * When <code>true</code>, the geometry is expected to appear translucent.
   *
   * @type {boolean}
   *
   * @default true
   */
  this.translucent = defaultValue(options.translucent, true);

  this._vertexShaderSource = options.vertexShaderSource;
  this._fragmentShaderSource = options.fragmentShaderSource;
  this._renderState = options.renderState;
  this._closed = defaultValue(options.closed, false);
}

Object.defineProperties(Appearance.prototype, {
  /**
   * The GLSL source code for the vertex shader.
   *
   * @memberof Appearance.prototype
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
   * The GLSL source code for the fragment shader.  The full fragment shader
   * source is built procedurally taking into account the {@link Appearance#material}.
   * Use {@link Appearance#getFragmentShaderSource} to get the full source.
   *
   * @memberof Appearance.prototype
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
   *
   * @memberof Appearance.prototype
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
   * When <code>true</code>, the geometry is expected to be closed.
   *
   * @memberof Appearance.prototype
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
});

/**
 * Procedurally creates the full GLSL fragment shader source for this appearance
 * taking into account {@link Appearance#fragmentShaderSource} and {@link Appearance#material}.
 *
 * @returns {string} The full GLSL fragment shader source.
 */
Appearance.prototype.getFragmentShaderSource = function () {
  const parts = [];
  if (this.flat) {
    parts.push("#define FLAT");
  }
  if (this.faceForward) {
    parts.push("#define FACE_FORWARD");
  }
  if (defined(this.material)) {
    parts.push(this.material.shaderSource);
  }
  parts.push(this.fragmentShaderSource);

  return parts.join("\n");
};

/**
 * Determines if the geometry is translucent based on {@link Appearance#translucent} and {@link Material#isTranslucent}.
 *
 * @returns {boolean} <code>true</code> if the appearance is translucent.
 */
Appearance.prototype.isTranslucent = function () {
  return (
    (defined(this.material) && this.material.isTranslucent()) ||
    (!defined(this.material) && this.translucent)
  );
};

/**
 * Creates a render state.  This is not the final render state instance; instead,
 * it can contain a subset of render state properties identical to the render state
 * created in the context.
 *
 * @returns {object} The render state.
 */
Appearance.prototype.getRenderState = function () {
  const translucent = this.isTranslucent();
  const rs = clone(this.renderState, false);
  if (translucent) {
    rs.depthMask = false;
    rs.blending = BlendingState.ALPHA_BLEND;
  } else {
    rs.depthMask = true;
  }
  return rs;
};

/**
 * @private
 */
Appearance.getDefaultRenderState = function (translucent, closed, existing) {
  let rs = {
    depthTest: {
      enabled: true,
    },
  };

  if (translucent) {
    rs.depthMask = false;
    rs.blending = BlendingState.ALPHA_BLEND;
  }

  if (closed) {
    rs.cull = {
      enabled: true,
      face: CullFace.BACK,
    };
  }

  if (defined(existing)) {
    rs = combine(existing, rs, true);
  }

  return rs;
};
export default Appearance;
