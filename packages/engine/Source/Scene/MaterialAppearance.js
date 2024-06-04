import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import VertexFormat from "../Core/VertexFormat.js";
import AllMaterialAppearanceFS from "../Shaders/Appearances/AllMaterialAppearanceFS.js";
import AllMaterialAppearanceVS from "../Shaders/Appearances/AllMaterialAppearanceVS.js";
import BasicMaterialAppearanceFS from "../Shaders/Appearances/BasicMaterialAppearanceFS.js";
import BasicMaterialAppearanceVS from "../Shaders/Appearances/BasicMaterialAppearanceVS.js";
import TexturedMaterialAppearanceFS from "../Shaders/Appearances/TexturedMaterialAppearanceFS.js";
import TexturedMaterialAppearanceVS from "../Shaders/Appearances/TexturedMaterialAppearanceVS.js";
import Appearance from "./Appearance.js";
import Material from "./Material.js";

/**
     * An appearance for arbitrary geometry (as opposed to {@link EllipsoidSurfaceAppearance}, for example)
     * that supports shading with materials.
     *
     * @alias MaterialAppearance
     * @constructor
     *
     * @param {object} [options] Object with the following properties:
     * @param {boolean} [options.flat=false] When <code>true</code>, flat shading is used in the fragment shader, which means lighting is not taking into account.
     * @param {boolean} [options.faceForward=!options.closed] When <code>true</code>, the fragment shader flips the surface normal as needed to ensure that the normal faces the viewer to avoid dark spots.  This is useful when both sides of a geometry should be shaded like {@link WallGeometry}.
     * @param {boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link MaterialAppearance#renderState} has alpha blending enabled.
     * @param {boolean} [options.closed=false] When <code>true</code>, the geometry is expected to be closed so {@link MaterialAppearance#renderState} has backface culling enabled.
     * @param {MaterialAppearance.MaterialSupportType} [options.materialSupport=MaterialAppearance.MaterialSupport.TEXTURED] The type of materials that will be supported.
     * @param {Material} [options.material=Material.ColorType] The material used to determine the fragment color.
     * @param {string} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
     * @param {string} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
     * @param {object} [options.renderState] Optional render state to override the default render state.
     *
     * @see {@link https://github.com/CesiumGS/cesium/wiki/Fabric|Fabric}
     * @demo {@link https://sandcastle.cesium.com/index.html?src=Materials.html|Cesium Sandcastle Material Appearance Demo}
     *
     * @example
     * const primitive = new Cesium.Primitive({
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
     *
     * });
     */
function MaterialAppearance(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const translucent = defaultValue(options.translucent, true);
  const closed = defaultValue(options.closed, false);
  const materialSupport = defaultValue(
    options.materialSupport,
    MaterialAppearance.MaterialSupport.TEXTURED
  );

  /**
   * The material used to determine the fragment color.  Unlike other {@link MaterialAppearance}
   * properties, this is not read-only, so an appearance's material can change on the fly.
   *
   * @type Material
   *
   * @default {@link Material.ColorType}
   *
   * @see {@link https://github.com/CesiumGS/cesium/wiki/Fabric|Fabric}
   */
  this.material = defined(options.material)
    ? options.material
    : Material.fromType(Material.ColorType);

  /**
   * When <code>true</code>, the geometry is expected to appear translucent.
   *
   * @type {boolean}
   *
   * @default true
   */
  this.translucent = translucent;

  this._vertexShaderSource = defaultValue(
    options.vertexShaderSource,
    materialSupport.vertexShaderSource
  );
  this._fragmentShaderSource = defaultValue(
    options.fragmentShaderSource,
    materialSupport.fragmentShaderSource
  );
  this._renderState = Appearance.getDefaultRenderState(
    translucent,
    closed,
    options.renderState
  );
  this._closed = closed;

  // Non-derived members

  this._materialSupport = materialSupport;
  this._vertexFormat = materialSupport.vertexFormat;
  this._flat = defaultValue(options.flat, false);
  this._faceForward = defaultValue(options.faceForward, !closed);
}

Object.defineProperties(MaterialAppearance.prototype, {
  /**
   * The GLSL source code for the vertex shader.
   *
   * @memberof MaterialAppearance.prototype
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
   * source is built procedurally taking into account {@link MaterialAppearance#material},
   * {@link MaterialAppearance#flat}, and {@link MaterialAppearance#faceForward}.
   * Use {@link MaterialAppearance#getFragmentShaderSource} to get the full source.
   *
   * @memberof MaterialAppearance.prototype
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
   * The render state can be explicitly defined when constructing a {@link MaterialAppearance}
   * instance, or it is set implicitly via {@link MaterialAppearance#translucent}
   * and {@link MaterialAppearance#closed}.
   * </p>
   *
   * @memberof MaterialAppearance.prototype
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
   * {@link MaterialAppearance#renderState} has backface culling enabled.
   * If the viewer enters the geometry, it will not be visible.
   *
   * @memberof MaterialAppearance.prototype
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
   * The type of materials supported by this instance.  This impacts the required
   * {@link VertexFormat} and the complexity of the vertex and fragment shaders.
   *
   * @memberof MaterialAppearance.prototype
   *
   * @type {MaterialAppearance.MaterialSupportType}
   * @readonly
   *
   * @default {@link MaterialAppearance.MaterialSupport.TEXTURED}
   */
  materialSupport: {
    get: function () {
      return this._materialSupport;
    },
  },

  /**
   * The {@link VertexFormat} that this appearance instance is compatible with.
   * A geometry can have more vertex attributes and still be compatible - at a
   * potential performance cost - but it can't have less.
   *
   * @memberof MaterialAppearance.prototype
   *
   * @type VertexFormat
   * @readonly
   *
   * @default {@link MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat}
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
   * @memberof MaterialAppearance.prototype
   *
   * @type {boolean}
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
   * @memberof MaterialAppearance.prototype
   *
   * @type {boolean}
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
 * Procedurally creates the full GLSL fragment shader source.  For {@link MaterialAppearance},
 * this is derived from {@link MaterialAppearance#fragmentShaderSource}, {@link MaterialAppearance#material},
 * {@link MaterialAppearance#flat}, and {@link MaterialAppearance#faceForward}.
 *
 * @function
 *
 * @returns {string} The full GLSL fragment shader source.
 */
MaterialAppearance.prototype.getFragmentShaderSource =
  Appearance.prototype.getFragmentShaderSource;

/**
 * Determines if the geometry is translucent based on {@link MaterialAppearance#translucent} and {@link Material#isTranslucent}.
 *
 * @function
 *
 * @returns {boolean} <code>true</code> if the appearance is translucent.
 */
MaterialAppearance.prototype.isTranslucent = Appearance.prototype.isTranslucent;

/**
 * Creates a render state.  This is not the final render state instance; instead,
 * it can contain a subset of render state properties identical to the render state
 * created in the context.
 *
 * @function
 *
 * @returns {object} The render state.
 */
MaterialAppearance.prototype.getRenderState =
  Appearance.prototype.getRenderState;

/**
 * @typedef MaterialAppearance.MaterialSupportType
 * @type {object}
 * @property {VertexFormat} vertexFormat
 * @property {string} vertexShaderSource
 * @property {string} fragmentShaderSource
 */

/**
 * Determines the type of {@link Material} that is supported by a
 * {@link MaterialAppearance} instance.  This is a trade-off between
 * flexibility (a wide array of materials) and memory/performance
 * (required vertex format and GLSL shader complexity.
 * @namespace
 */
MaterialAppearance.MaterialSupport = {
  /**
   * Only basic materials, which require just <code>position</code> and
   * <code>normal</code> vertex attributes, are supported.
   *
   * @type {MaterialAppearance.MaterialSupportType}
   * @constant
   */
  BASIC: Object.freeze({
    vertexFormat: VertexFormat.POSITION_AND_NORMAL,
    vertexShaderSource: BasicMaterialAppearanceVS,
    fragmentShaderSource: BasicMaterialAppearanceFS,
  }),
  /**
   * Materials with textures, which require <code>position</code>,
   * <code>normal</code>, and <code>st</code> vertex attributes,
   * are supported.  The vast majority of materials fall into this category.
   *
   * @type {MaterialAppearance.MaterialSupportType}
   * @constant
   */
  TEXTURED: Object.freeze({
    vertexFormat: VertexFormat.POSITION_NORMAL_AND_ST,
    vertexShaderSource: TexturedMaterialAppearanceVS,
    fragmentShaderSource: TexturedMaterialAppearanceFS,
  }),
  /**
   * All materials, including those that work in tangent space, are supported.
   * This requires <code>position</code>, <code>normal</code>, <code>st</code>,
   * <code>tangent</code>, and <code>bitangent</code> vertex attributes.
   *
   * @type {MaterialAppearance.MaterialSupportType}
   * @constant
   */
  ALL: Object.freeze({
    vertexFormat: VertexFormat.ALL,
    vertexShaderSource: AllMaterialAppearanceVS,
    fragmentShaderSource: AllMaterialAppearanceFS,
  }),
};
export default MaterialAppearance;
