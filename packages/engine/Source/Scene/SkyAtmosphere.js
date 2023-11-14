import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidGeometry from "../Core/EllipsoidGeometry.js";
import GeometryPipeline from "../Core/GeometryPipeline.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import VertexFormat from "../Core/VertexFormat.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import VertexArray from "../Renderer/VertexArray.js";
import AtmosphereCommon from "../Shaders/AtmosphereCommon.js";
import SkyAtmosphereCommon from "../Shaders/SkyAtmosphereCommon.js";
import SkyAtmosphereFS from "../Shaders/SkyAtmosphereFS.js";
import SkyAtmosphereVS from "../Shaders/SkyAtmosphereVS.js";
import Axis from "./Axis.js";
import BlendingState from "./BlendingState.js";
import CullFace from "./CullFace.js";
import SceneMode from "./SceneMode.js";

/**
 * An atmosphere drawn around the limb of the provided ellipsoid. Based on
 * {@link http://nishitalab.org/user/nis/cdrom/sig93_nis.pdf|Display of The Earth Taking Into Account Atmospheric Scattering}.
 * <p>
 * This is only supported in 3D. Atmosphere is faded out when morphing to 2D or Columbus view.
 * </p>
 *
 * @alias SkyAtmosphere
 * @constructor
 *
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid that the atmosphere is drawn around.
 *
 * @example
 * scene.skyAtmosphere = new Cesium.SkyAtmosphere();
 *
 * @see Scene.skyAtmosphere
 */
function SkyAtmosphere(ellipsoid) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  /**
   * Determines if the atmosphere is shown.
   *
   * @type {boolean}
   * @default true
   */
  this.show = true;

  /**
   * Compute atmosphere per-fragment instead of per-vertex.
   * This produces better looking atmosphere with a slight performance penalty.
   *
   * @type {boolean}
   * @default false
   */
  this.perFragmentAtmosphere = false;

  this._ellipsoid = ellipsoid;

  const outerEllipsoidScale = 1.025;
  const scaleVector = Cartesian3.multiplyByScalar(
    ellipsoid.radii,
    outerEllipsoidScale,
    new Cartesian3()
  );
  this._scaleMatrix = Matrix4.fromScale(scaleVector);
  this._modelMatrix = new Matrix4();

  this._command = new DrawCommand({
    owner: this,
    modelMatrix: this._modelMatrix,
  });
  this._spSkyFromSpace = undefined;
  this._spSkyFromAtmosphere = undefined;

  this._flags = undefined;

  /**
   * The intensity of the light that is used for computing the sky atmosphere color.
   *
   * @type {number}
   * @default 50.0
   */
  this.atmosphereLightIntensity = 50.0;

  /**
   * The Rayleigh scattering coefficient used in the atmospheric scattering equations for the sky atmosphere.
   *
   * @type {Cartesian3}
   * @default Cartesian3(5.5e-6, 13.0e-6, 28.4e-6)
   */
  this.atmosphereRayleighCoefficient = new Cartesian3(5.5e-6, 13.0e-6, 28.4e-6);

  /**
   * The Mie scattering coefficient used in the atmospheric scattering equations for the sky atmosphere.
   *
   * @type {Cartesian3}
   * @default Cartesian3(21e-6, 21e-6, 21e-6)
   */
  this.atmosphereMieCoefficient = new Cartesian3(21e-6, 21e-6, 21e-6);

  /**
   * The Rayleigh scale height used in the atmospheric scattering equations for the sky atmosphere, in meters.
   *
   * @type {number}
   * @default 10000.0
   */
  this.atmosphereRayleighScaleHeight = 10000.0;

  /**
   * The Mie scale height used in the atmospheric scattering equations for the sky atmosphere, in meters.
   *
   * @type {number}
   * @default 3200.0
   */
  this.atmosphereMieScaleHeight = 3200.0;

  /**
   * The anisotropy of the medium to consider for Mie scattering.
   * <p>
   * Valid values are between -1.0 and 1.0.
   * </p>
   * @type {number}
   * @default 0.9
   */
  this.atmosphereMieAnisotropy = 0.9;

  /**
   * The hue shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A hue shift of 1.0 indicates a complete rotation of the hues available.
   * @type {number}
   * @default 0.0
   */
  this.hueShift = 0.0;

  /**
   * The saturation shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A saturation shift of -1.0 is monochrome.
   * @type {number}
   * @default 0.0
   */
  this.saturationShift = 0.0;

  /**
   * The brightness shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A brightness shift of -1.0 is complete darkness, which will let space show through.
   * @type {number}
   * @default 0.0
   */
  this.brightnessShift = 0.0;

  this._hueSaturationBrightness = new Cartesian3();

  // outer radius, inner radius, dynamic atmosphere color flag
  const radiiAndDynamicAtmosphereColor = new Cartesian3();

  radiiAndDynamicAtmosphereColor.x =
    ellipsoid.maximumRadius * outerEllipsoidScale;
  radiiAndDynamicAtmosphereColor.y = ellipsoid.maximumRadius;

  // Toggles whether the sun position is used. 0 treats the sun as always directly overhead.
  radiiAndDynamicAtmosphereColor.z = 0;

  this._radiiAndDynamicAtmosphereColor = radiiAndDynamicAtmosphereColor;

  const that = this;

  this._command.uniformMap = {
    u_radiiAndDynamicAtmosphereColor: function () {
      return that._radiiAndDynamicAtmosphereColor;
    },
    u_hsbShift: function () {
      that._hueSaturationBrightness.x = that.hueShift;
      that._hueSaturationBrightness.y = that.saturationShift;
      that._hueSaturationBrightness.z = that.brightnessShift;
      return that._hueSaturationBrightness;
    },
    u_atmosphereLightIntensity: function () {
      return that.atmosphereLightIntensity;
    },
    u_atmosphereRayleighCoefficient: function () {
      return that.atmosphereRayleighCoefficient;
    },
    u_atmosphereMieCoefficient: function () {
      return that.atmosphereMieCoefficient;
    },
    u_atmosphereRayleighScaleHeight: function () {
      return that.atmosphereRayleighScaleHeight;
    },
    u_atmosphereMieScaleHeight: function () {
      return that.atmosphereMieScaleHeight;
    },
    u_atmosphereMieAnisotropy: function () {
      return that.atmosphereMieAnisotropy;
    },
  };
}

Object.defineProperties(SkyAtmosphere.prototype, {
  /**
   * Gets the ellipsoid the atmosphere is drawn around.
   * @memberof SkyAtmosphere.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },
});

/**
 * @private
 */
SkyAtmosphere.prototype.setDynamicAtmosphereColor = function (
  enableLighting,
  useSunDirection
) {
  const lightEnum = enableLighting ? (useSunDirection ? 2.0 : 1.0) : 0.0;
  this._radiiAndDynamicAtmosphereColor.z = lightEnum;
};

const scratchModelMatrix = new Matrix4();

/**
 * @private
 */
SkyAtmosphere.prototype.update = function (frameState, globe) {
  if (!this.show) {
    return undefined;
  }

  const mode = frameState.mode;
  if (mode !== SceneMode.SCENE3D && mode !== SceneMode.MORPHING) {
    return undefined;
  }

  // The atmosphere is only rendered during the render pass; it is not pickable, it doesn't cast shadows, etc.
  if (!frameState.passes.render) {
    return undefined;
  }

  // Align the ellipsoid geometry so it always faces the same direction as the
  // camera to reduce artifacts when rendering atmosphere per-vertex
  const rotationMatrix = Matrix4.fromRotationTranslation(
    frameState.context.uniformState.inverseViewRotation,
    Cartesian3.ZERO,
    scratchModelMatrix
  );
  const rotationOffsetMatrix = Matrix4.multiplyTransformation(
    rotationMatrix,
    Axis.Y_UP_TO_Z_UP,
    scratchModelMatrix
  );
  const modelMatrix = Matrix4.multiply(
    this._scaleMatrix,
    rotationOffsetMatrix,
    scratchModelMatrix
  );
  Matrix4.clone(modelMatrix, this._modelMatrix);

  const context = frameState.context;

  const colorCorrect = hasColorCorrection(this);
  const translucent = frameState.globeTranslucencyState.translucent;
  const perFragmentAtmosphere =
    this.perFragmentAtmosphere || translucent || !defined(globe) || !globe.show;

  const command = this._command;

  if (!defined(command.vertexArray)) {
    const geometry = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        radii: new Cartesian3(1.0, 1.0, 1.0),
        slicePartitions: 256,
        stackPartitions: 256,
        vertexFormat: VertexFormat.POSITION_ONLY,
      })
    );
    command.vertexArray = VertexArray.fromGeometry({
      context: context,
      geometry: geometry,
      attributeLocations: GeometryPipeline.createAttributeLocations(geometry),
      bufferUsage: BufferUsage.STATIC_DRAW,
    });
    command.renderState = RenderState.fromCache({
      cull: {
        enabled: true,
        face: CullFace.FRONT,
      },
      blending: BlendingState.ALPHA_BLEND,
      depthMask: false,
    });
  }

  const flags =
    colorCorrect | (perFragmentAtmosphere << 2) | (translucent << 3);

  if (flags !== this._flags) {
    this._flags = flags;

    const defines = [];

    if (colorCorrect) {
      defines.push("COLOR_CORRECT");
    }

    if (perFragmentAtmosphere) {
      defines.push("PER_FRAGMENT_ATMOSPHERE");
    }

    if (translucent) {
      defines.push("GLOBE_TRANSLUCENT");
    }

    const vs = new ShaderSource({
      defines: defines,
      sources: [AtmosphereCommon, SkyAtmosphereCommon, SkyAtmosphereVS],
    });

    const fs = new ShaderSource({
      defines: defines,
      sources: [AtmosphereCommon, SkyAtmosphereCommon, SkyAtmosphereFS],
    });

    this._spSkyAtmosphere = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
    });

    command.shaderProgram = this._spSkyAtmosphere;
  }

  return command;
};

function hasColorCorrection(skyAtmosphere) {
  return !(
    CesiumMath.equalsEpsilon(
      skyAtmosphere.hueShift,
      0.0,
      CesiumMath.EPSILON7
    ) &&
    CesiumMath.equalsEpsilon(
      skyAtmosphere.saturationShift,
      0.0,
      CesiumMath.EPSILON7
    ) &&
    CesiumMath.equalsEpsilon(
      skyAtmosphere.brightnessShift,
      0.0,
      CesiumMath.EPSILON7
    )
  );
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see SkyAtmosphere#destroy
 */
SkyAtmosphere.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * skyAtmosphere = skyAtmosphere && skyAtmosphere.destroy();
 *
 * @see SkyAtmosphere#isDestroyed
 */
SkyAtmosphere.prototype.destroy = function () {
  const command = this._command;
  command.vertexArray = command.vertexArray && command.vertexArray.destroy();
  this._spSkyAtmosphere =
    this._spSkyAtmosphere && this._spSkyAtmosphere.destroy();
  return destroyObject(this);
};
export default SkyAtmosphere;
