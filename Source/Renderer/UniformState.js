import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EncodedCartesian3 from "../Core/EncodedCartesian3.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import Simon1994PlanetaryPositions from "../Core/Simon1994PlanetaryPositions.js";
import Transforms from "../Core/Transforms.js";
import SceneMode from "../Scene/SceneMode.js";
import SunLight from "../Scene/SunLight.js";

/**
 * @private
 * @constructor
 */
function UniformState() {
  /**
   * @type {Texture}
   */
  this.globeDepthTexture = undefined;
  /**
   * @type {Number}
   */
  this.gamma = undefined;

  this._viewport = new BoundingRectangle();
  this._viewportCartesian4 = new Cartesian4();
  this._viewportDirty = false;
  this._viewportOrthographicMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._viewportTransformation = Matrix4.clone(Matrix4.IDENTITY);

  this._model = Matrix4.clone(Matrix4.IDENTITY);
  this._view = Matrix4.clone(Matrix4.IDENTITY);
  this._inverseView = Matrix4.clone(Matrix4.IDENTITY);
  this._projection = Matrix4.clone(Matrix4.IDENTITY);
  this._infiniteProjection = Matrix4.clone(Matrix4.IDENTITY);
  this._entireFrustum = new Cartesian2();
  this._currentFrustum = new Cartesian2();
  this._frustumPlanes = new Cartesian4();
  this._farDepthFromNearPlusOne = undefined;
  this._log2FarDepthFromNearPlusOne = undefined;
  this._oneOverLog2FarDepthFromNearPlusOne = undefined;

  this._frameState = undefined;
  this._temeToPseudoFixed = Matrix3.clone(Matrix4.IDENTITY);

  // Derived members
  this._view3DDirty = true;
  this._view3D = new Matrix4();

  this._inverseView3DDirty = true;
  this._inverseView3D = new Matrix4();

  this._inverseModelDirty = true;
  this._inverseModel = new Matrix4();

  this._inverseTransposeModelDirty = true;
  this._inverseTransposeModel = new Matrix3();

  this._viewRotation = new Matrix3();
  this._inverseViewRotation = new Matrix3();

  this._viewRotation3D = new Matrix3();
  this._inverseViewRotation3D = new Matrix3();

  this._inverseProjectionDirty = true;
  this._inverseProjection = new Matrix4();

  this._modelViewDirty = true;
  this._modelView = new Matrix4();

  this._modelView3DDirty = true;
  this._modelView3D = new Matrix4();

  this._modelViewRelativeToEyeDirty = true;
  this._modelViewRelativeToEye = new Matrix4();

  this._inverseModelViewDirty = true;
  this._inverseModelView = new Matrix4();

  this._inverseModelView3DDirty = true;
  this._inverseModelView3D = new Matrix4();

  this._viewProjectionDirty = true;
  this._viewProjection = new Matrix4();

  this._inverseViewProjectionDirty = true;
  this._inverseViewProjection = new Matrix4();

  this._modelViewProjectionDirty = true;
  this._modelViewProjection = new Matrix4();

  this._inverseModelViewProjectionDirty = true;
  this._inverseModelViewProjection = new Matrix4();

  this._modelViewProjectionRelativeToEyeDirty = true;
  this._modelViewProjectionRelativeToEye = new Matrix4();

  this._modelViewInfiniteProjectionDirty = true;
  this._modelViewInfiniteProjection = new Matrix4();

  this._normalDirty = true;
  this._normal = new Matrix3();

  this._normal3DDirty = true;
  this._normal3D = new Matrix3();

  this._inverseNormalDirty = true;
  this._inverseNormal = new Matrix3();

  this._inverseNormal3DDirty = true;
  this._inverseNormal3D = new Matrix3();

  this._encodedCameraPositionMCDirty = true;
  this._encodedCameraPositionMC = new EncodedCartesian3();
  this._cameraPosition = new Cartesian3();

  this._sunPositionWC = new Cartesian3();
  this._sunPositionColumbusView = new Cartesian3();
  this._sunDirectionWC = new Cartesian3();
  this._sunDirectionEC = new Cartesian3();
  this._moonDirectionEC = new Cartesian3();

  this._lightDirectionWC = new Cartesian3();
  this._lightDirectionEC = new Cartesian3();
  this._lightColor = new Cartesian3();
  this._lightColorHdr = new Cartesian3();

  this._pass = undefined;
  this._mode = undefined;
  this._mapProjection = undefined;
  this._ellipsoid = undefined;
  this._cameraDirection = new Cartesian3();
  this._cameraRight = new Cartesian3();
  this._cameraUp = new Cartesian3();
  this._frustum2DWidth = 0.0;
  this._eyeHeight = 0.0;
  this._eyeHeight2D = new Cartesian2();
  this._pixelRatio = 1.0;
  this._orthographicIn3D = false;
  this._backgroundColor = new Color();

  this._brdfLut = undefined;
  this._environmentMap = undefined;

  this._sphericalHarmonicCoefficients = undefined;
  this._specularEnvironmentMaps = undefined;
  this._specularEnvironmentMapsDimensions = new Cartesian2();
  this._specularEnvironmentMapsMaximumLOD = undefined;

  this._fogDensity = undefined;

  this._invertClassificationColor = undefined;

  this._imagerySplitPosition = 0.0;
  this._pixelSizePerMeter = undefined;
  this._geometricToleranceOverMeter = undefined;

  this._minimumDisableDepthTestDistance = undefined;
}

Object.defineProperties(UniformState.prototype, {
  /**
   * @memberof UniformState.prototype
   * @type {FrameState}
   * @readonly
   */
  frameState: {
    get: function () {
      return this._frameState;
    },
  },
  /**
   * @memberof UniformState.prototype
   * @type {BoundingRectangle}
   */
  viewport: {
    get: function () {
      return this._viewport;
    },
    set: function (viewport) {
      if (!BoundingRectangle.equals(viewport, this._viewport)) {
        BoundingRectangle.clone(viewport, this._viewport);

        var v = this._viewport;
        var vc = this._viewportCartesian4;
        vc.x = v.x;
        vc.y = v.y;
        vc.z = v.width;
        vc.w = v.height;

        this._viewportDirty = true;
      }
    },
  },

  /**
   * @memberof UniformState.prototype
   * @private
   */
  viewportCartesian4: {
    get: function () {
      return this._viewportCartesian4;
    },
  },

  viewportOrthographic: {
    get: function () {
      cleanViewport(this);
      return this._viewportOrthographicMatrix;
    },
  },

  viewportTransformation: {
    get: function () {
      cleanViewport(this);
      return this._viewportTransformation;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  model: {
    get: function () {
      return this._model;
    },
    set: function (matrix) {
      Matrix4.clone(matrix, this._model);

      this._modelView3DDirty = true;
      this._inverseModelView3DDirty = true;
      this._inverseModelDirty = true;
      this._inverseTransposeModelDirty = true;
      this._modelViewDirty = true;
      this._inverseModelViewDirty = true;
      this._modelViewRelativeToEyeDirty = true;
      this._inverseModelViewDirty = true;
      this._modelViewProjectionDirty = true;
      this._inverseModelViewProjectionDirty = true;
      this._modelViewProjectionRelativeToEyeDirty = true;
      this._modelViewInfiniteProjectionDirty = true;
      this._normalDirty = true;
      this._inverseNormalDirty = true;
      this._normal3DDirty = true;
      this._inverseNormal3DDirty = true;
      this._encodedCameraPositionMCDirty = true;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseModel: {
    get: function () {
      if (this._inverseModelDirty) {
        this._inverseModelDirty = false;

        Matrix4.inverse(this._model, this._inverseModel);
      }

      return this._inverseModel;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @private
   */
  inverseTransposeModel: {
    get: function () {
      var m = this._inverseTransposeModel;
      if (this._inverseTransposeModelDirty) {
        this._inverseTransposeModelDirty = false;

        Matrix4.getMatrix3(this.inverseModel, m);
        Matrix3.transpose(m, m);
      }

      return m;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  view: {
    get: function () {
      return this._view;
    },
  },

  /**
   * The 3D view matrix.  In 3D mode, this is identical to {@link UniformState#view},
   * but in 2D and Columbus View it is a synthetic matrix based on the equivalent position
   * of the camera in the 3D world.
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  view3D: {
    get: function () {
      updateView3D(this);
      return this._view3D;
    },
  },

  /**
   * The 3x3 rotation matrix of the current view matrix ({@link UniformState#view}).
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  viewRotation: {
    get: function () {
      updateView3D(this);
      return this._viewRotation;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  viewRotation3D: {
    get: function () {
      updateView3D(this);
      return this._viewRotation3D;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseView: {
    get: function () {
      return this._inverseView;
    },
  },

  /**
   * the 4x4 inverse-view matrix that transforms from eye to 3D world coordinates.  In 3D mode, this is
   * identical to {@link UniformState#inverseView}, but in 2D and Columbus View it is a synthetic matrix
   * based on the equivalent position of the camera in the 3D world.
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseView3D: {
    get: function () {
      updateInverseView3D(this);
      return this._inverseView3D;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  inverseViewRotation: {
    get: function () {
      return this._inverseViewRotation;
    },
  },

  /**
   * The 3x3 rotation matrix of the current 3D inverse-view matrix ({@link UniformState#inverseView3D}).
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  inverseViewRotation3D: {
    get: function () {
      updateInverseView3D(this);
      return this._inverseViewRotation3D;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  projection: {
    get: function () {
      return this._projection;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseProjection: {
    get: function () {
      cleanInverseProjection(this);
      return this._inverseProjection;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  infiniteProjection: {
    get: function () {
      return this._infiniteProjection;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  modelView: {
    get: function () {
      cleanModelView(this);
      return this._modelView;
    },
  },

  /**
   * The 3D model-view matrix.  In 3D mode, this is equivalent to {@link UniformState#modelView}.  In 2D and
   * Columbus View, however, it is a synthetic matrix based on the equivalent position of the camera in the 3D world.
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  modelView3D: {
    get: function () {
      cleanModelView3D(this);
      return this._modelView3D;
    },
  },

  /**
   * Model-view relative to eye matrix.
   *
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  modelViewRelativeToEye: {
    get: function () {
      cleanModelViewRelativeToEye(this);
      return this._modelViewRelativeToEye;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseModelView: {
    get: function () {
      cleanInverseModelView(this);
      return this._inverseModelView;
    },
  },

  /**
   * The inverse of the 3D model-view matrix.  In 3D mode, this is equivalent to {@link UniformState#inverseModelView}.
   * In 2D and Columbus View, however, it is a synthetic matrix based on the equivalent position of the camera in the 3D world.
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseModelView3D: {
    get: function () {
      cleanInverseModelView3D(this);
      return this._inverseModelView3D;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  viewProjection: {
    get: function () {
      cleanViewProjection(this);
      return this._viewProjection;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseViewProjection: {
    get: function () {
      cleanInverseViewProjection(this);
      return this._inverseViewProjection;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  modelViewProjection: {
    get: function () {
      cleanModelViewProjection(this);
      return this._modelViewProjection;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  inverseModelViewProjection: {
    get: function () {
      cleanInverseModelViewProjection(this);
      return this._inverseModelViewProjection;
    },
  },

  /**
   * Model-view-projection relative to eye matrix.
   *
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  modelViewProjectionRelativeToEye: {
    get: function () {
      cleanModelViewProjectionRelativeToEye(this);
      return this._modelViewProjectionRelativeToEye;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Matrix4}
   */
  modelViewInfiniteProjection: {
    get: function () {
      cleanModelViewInfiniteProjection(this);
      return this._modelViewInfiniteProjection;
    },
  },

  /**
   * A 3x3 normal transformation matrix that transforms normal vectors in model coordinates to
   * eye coordinates.
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  normal: {
    get: function () {
      cleanNormal(this);
      return this._normal;
    },
  },

  /**
   * A 3x3 normal transformation matrix that transforms normal vectors in 3D model
   * coordinates to eye coordinates.  In 3D mode, this is identical to
   * {@link UniformState#normal}, but in 2D and Columbus View it represents the normal transformation
   * matrix as if the camera were at an equivalent location in 3D mode.
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  normal3D: {
    get: function () {
      cleanNormal3D(this);
      return this._normal3D;
    },
  },

  /**
   * An inverse 3x3 normal transformation matrix that transforms normal vectors in model coordinates
   * to eye coordinates.
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  inverseNormal: {
    get: function () {
      cleanInverseNormal(this);
      return this._inverseNormal;
    },
  },

  /**
   * An inverse 3x3 normal transformation matrix that transforms normal vectors in eye coordinates
   * to 3D model coordinates.  In 3D mode, this is identical to
   * {@link UniformState#inverseNormal}, but in 2D and Columbus View it represents the normal transformation
   * matrix as if the camera were at an equivalent location in 3D mode.
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  inverseNormal3D: {
    get: function () {
      cleanInverseNormal3D(this);
      return this._inverseNormal3D;
    },
  },

  /**
   * The near distance (<code>x</code>) and the far distance (<code>y</code>) of the frustum defined by the camera.
   * This is the largest possible frustum, not an individual frustum used for multi-frustum rendering.
   * @memberof UniformState.prototype
   * @type {Cartesian2}
   */
  entireFrustum: {
    get: function () {
      return this._entireFrustum;
    },
  },

  /**
   * The near distance (<code>x</code>) and the far distance (<code>y</code>) of the frustum defined by the camera.
   * This is the individual frustum used for multi-frustum rendering.
   * @memberof UniformState.prototype
   * @type {Cartesian2}
   */
  currentFrustum: {
    get: function () {
      return this._currentFrustum;
    },
  },

  /**
   * The distances to the frustum planes. The top, bottom, left and right distances are
   * the x, y, z, and w components, respectively.
   * @memberof UniformState.prototype
   * @type {Cartesian4}
   */
  frustumPlanes: {
    get: function () {
      return this._frustumPlanes;
    },
  },

  /**
   * The far plane's distance from the near plane, plus 1.0.
   *
   * @memberof UniformState.prototype
   * @type {Number}
   */
  farDepthFromNearPlusOne: {
    get: function () {
      return this._farDepthFromNearPlusOne;
    },
  },

  /**
   * The log2 of {@link UniformState#farDepthFromNearPlusOne}.
   *
   * @memberof UniformState.prototype
   * @type {Number}
   */
  log2FarDepthFromNearPlusOne: {
    get: function () {
      return this._log2FarDepthFromNearPlusOne;
    },
  },

  /**
   * 1.0 divided by {@link UniformState#log2FarDepthFromNearPlusOne}.
   *
   * @memberof UniformState.prototype
   * @type {Number}
   */
  oneOverLog2FarDepthFromNearPlusOne: {
    get: function () {
      return this._oneOverLog2FarDepthFromNearPlusOne;
    },
  },

  /**
   * The height in meters of the eye (camera) above or below the ellipsoid.
   * @memberof UniformState.prototype
   * @type {Number}
   */
  eyeHeight: {
    get: function () {
      return this._eyeHeight;
    },
  },

  /**
   * The height (<code>x</code>) and the height squared (<code>y</code>)
   * in meters of the eye (camera) above the 2D world plane. This uniform is only valid
   * when the {@link SceneMode} is <code>SCENE2D</code>.
   * @memberof UniformState.prototype
   * @type {Cartesian2}
   */
  eyeHeight2D: {
    get: function () {
      return this._eyeHeight2D;
    },
  },

  /**
   * The sun position in 3D world coordinates at the current scene time.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  sunPositionWC: {
    get: function () {
      return this._sunPositionWC;
    },
  },

  /**
   * The sun position in 2D world coordinates at the current scene time.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  sunPositionColumbusView: {
    get: function () {
      return this._sunPositionColumbusView;
    },
  },

  /**
   * A normalized vector to the sun in 3D world coordinates at the current scene time.  Even in 2D or
   * Columbus View mode, this returns the direction to the sun in the 3D scene.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  sunDirectionWC: {
    get: function () {
      return this._sunDirectionWC;
    },
  },

  /**
   * A normalized vector to the sun in eye coordinates at the current scene time.  In 3D mode, this
   * returns the actual vector from the camera position to the sun position.  In 2D and Columbus View, it returns
   * the vector from the equivalent 3D camera position to the position of the sun in the 3D scene.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  sunDirectionEC: {
    get: function () {
      return this._sunDirectionEC;
    },
  },

  /**
   * A normalized vector to the moon in eye coordinates at the current scene time.  In 3D mode, this
   * returns the actual vector from the camera position to the moon position.  In 2D and Columbus View, it returns
   * the vector from the equivalent 3D camera position to the position of the moon in the 3D scene.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  moonDirectionEC: {
    get: function () {
      return this._moonDirectionEC;
    },
  },

  /**
   * A normalized vector to the scene's light source in 3D world coordinates.  Even in 2D or
   * Columbus View mode, this returns the direction to the light in the 3D scene.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  lightDirectionWC: {
    get: function () {
      return this._lightDirectionWC;
    },
  },

  /**
   * A normalized vector to the scene's light source in eye coordinates.  In 3D mode, this
   * returns the actual vector from the camera position to the light.  In 2D and Columbus View, it returns
   * the vector from the equivalent 3D camera position in the 3D scene.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  lightDirectionEC: {
    get: function () {
      return this._lightDirectionEC;
    },
  },

  /**
   * The color of light emitted by the scene's light source. This is equivalent to the light
   * color multiplied by the light intensity limited to a maximum luminance of 1.0 suitable
   * for non-HDR lighting.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  lightColor: {
    get: function () {
      return this._lightColor;
    },
  },

  /**
   * The high dynamic range color of light emitted by the scene's light source. This is equivalent to
   * the light color multiplied by the light intensity suitable for HDR lighting.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  lightColorHdr: {
    get: function () {
      return this._lightColorHdr;
    },
  },

  /**
   * The high bits of the camera position.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  encodedCameraPositionMCHigh: {
    get: function () {
      cleanEncodedCameraPositionMC(this);
      return this._encodedCameraPositionMC.high;
    },
  },

  /**
   * The low bits of the camera position.
   * @memberof UniformState.prototype
   * @type {Cartesian3}
   */
  encodedCameraPositionMCLow: {
    get: function () {
      cleanEncodedCameraPositionMC(this);
      return this._encodedCameraPositionMC.low;
    },
  },

  /**
   * A 3x3 matrix that transforms from True Equator Mean Equinox (TEME) axes to the
   * pseudo-fixed axes at the Scene's current time.
   * @memberof UniformState.prototype
   * @type {Matrix3}
   */
  temeToPseudoFixedMatrix: {
    get: function () {
      return this._temeToPseudoFixed;
    },
  },

  /**
   * Gets the scaling factor for transforming from the canvas
   * pixel space to canvas coordinate space.
   * @memberof UniformState.prototype
   * @type {Number}
   */
  pixelRatio: {
    get: function () {
      return this._pixelRatio;
    },
  },

  /**
   * A scalar used to mix a color with the fog color based on the distance to the camera.
   * @memberof UniformState.prototype
   * @type {Number}
   */
  fogDensity: {
    get: function () {
      return this._fogDensity;
    },
  },

  /**
   * A scalar that represents the geometric tolerance per meter
   * @memberof UniformState.prototype
   * @type {Number}
   */
  geometricToleranceOverMeter: {
    get: function () {
      return this._geometricToleranceOverMeter;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Pass}
   */
  pass: {
    get: function () {
      return this._pass;
    },
  },

  /**
   * The current background color
   * @memberof UniformState.prototype
   * @type {Color}
   */
  backgroundColor: {
    get: function () {
      return this._backgroundColor;
    },
  },

  /**
   * The look up texture used to find the BRDF for a material
   * @memberof UniformState.prototype
   * @type {Texture}
   */
  brdfLut: {
    get: function () {
      return this._brdfLut;
    },
  },

  /**
   * The environment map of the scene
   * @memberof UniformState.prototype
   * @type {CubeMap}
   */
  environmentMap: {
    get: function () {
      return this._environmentMap;
    },
  },

  /**
   * The spherical harmonic coefficients of the scene.
   * @memberof UniformState.prototype
   * @type {Cartesian3[]}
   */
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
  },

  /**
   * The specular environment map atlas of the scene.
   * @memberof UniformState.prototype
   * @type {Texture}
   */
  specularEnvironmentMaps: {
    get: function () {
      return this._specularEnvironmentMaps;
    },
  },

  /**
   * The dimensions of the specular environment map atlas of the scene.
   * @memberof UniformState.prototype
   * @type {Cartesian2}
   */
  specularEnvironmentMapsDimensions: {
    get: function () {
      return this._specularEnvironmentMapsDimensions;
    },
  },

  /**
   * The maximum level-of-detail of the specular environment map atlas of the scene.
   * @memberof UniformState.prototype
   * @type {Number}
   */
  specularEnvironmentMapsMaximumLOD: {
    get: function () {
      return this._specularEnvironmentMapsMaximumLOD;
    },
  },

  /**
   * @memberof UniformState.prototype
   * @type {Number}
   */
  imagerySplitPosition: {
    get: function () {
      return this._imagerySplitPosition;
    },
  },

  /**
   * The distance from the camera at which to disable the depth test of billboards, labels and points
   * to, for example, prevent clipping against terrain. When set to zero, the depth test should always
   * be applied. When less than zero, the depth test should never be applied.
   *
   * @memberof UniformState.prototype
   * @type {Number}
   */
  minimumDisableDepthTestDistance: {
    get: function () {
      return this._minimumDisableDepthTestDistance;
    },
  },

  /**
   * The highlight color of unclassified 3D Tiles.
   *
   * @memberof UniformState.prototype
   * @type {Color}
   */
  invertClassificationColor: {
    get: function () {
      return this._invertClassificationColor;
    },
  },

  /**
   * Whether or not the current projection is orthographic in 3D.
   *
   * @memberOf UniformState.prototype
   * @type {Boolean}
   */
  orthographicIn3D: {
    get: function () {
      return this._orthographicIn3D;
    },
  },

  /**
   * The current ellipsoid.
   *
   * @memberOf UniformState.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return defaultValue(this._ellipsoid, Ellipsoid.WGS84);
    },
  },
});

function setView(uniformState, matrix) {
  Matrix4.clone(matrix, uniformState._view);
  Matrix4.getMatrix3(matrix, uniformState._viewRotation);

  uniformState._view3DDirty = true;
  uniformState._inverseView3DDirty = true;
  uniformState._modelViewDirty = true;
  uniformState._modelView3DDirty = true;
  uniformState._modelViewRelativeToEyeDirty = true;
  uniformState._inverseModelViewDirty = true;
  uniformState._inverseModelView3DDirty = true;
  uniformState._viewProjectionDirty = true;
  uniformState._inverseViewProjectionDirty = true;
  uniformState._modelViewProjectionDirty = true;
  uniformState._modelViewProjectionRelativeToEyeDirty = true;
  uniformState._modelViewInfiniteProjectionDirty = true;
  uniformState._normalDirty = true;
  uniformState._inverseNormalDirty = true;
  uniformState._normal3DDirty = true;
  uniformState._inverseNormal3DDirty = true;
}

function setInverseView(uniformState, matrix) {
  Matrix4.clone(matrix, uniformState._inverseView);
  Matrix4.getMatrix3(matrix, uniformState._inverseViewRotation);
}

function setProjection(uniformState, matrix) {
  Matrix4.clone(matrix, uniformState._projection);

  uniformState._inverseProjectionDirty = true;
  uniformState._viewProjectionDirty = true;
  uniformState._inverseViewProjectionDirty = true;
  uniformState._modelViewProjectionDirty = true;
  uniformState._modelViewProjectionRelativeToEyeDirty = true;
}

function setInfiniteProjection(uniformState, matrix) {
  Matrix4.clone(matrix, uniformState._infiniteProjection);

  uniformState._modelViewInfiniteProjectionDirty = true;
}

function setCamera(uniformState, camera) {
  Cartesian3.clone(camera.positionWC, uniformState._cameraPosition);
  Cartesian3.clone(camera.directionWC, uniformState._cameraDirection);
  Cartesian3.clone(camera.rightWC, uniformState._cameraRight);
  Cartesian3.clone(camera.upWC, uniformState._cameraUp);

  var positionCartographic = camera.positionCartographic;
  if (!defined(positionCartographic)) {
    uniformState._eyeHeight = -uniformState._ellipsoid.maximumRadius;
  } else {
    uniformState._eyeHeight = positionCartographic.height;
  }

  uniformState._encodedCameraPositionMCDirty = true;
}

var transformMatrix = new Matrix3();
var sunCartographicScratch = new Cartographic();
function setSunAndMoonDirections(uniformState, frameState) {
  if (
    !defined(
      Transforms.computeIcrfToFixedMatrix(frameState.time, transformMatrix)
    )
  ) {
    transformMatrix = Transforms.computeTemeToPseudoFixedMatrix(
      frameState.time,
      transformMatrix
    );
  }

  var position = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(
    frameState.time,
    uniformState._sunPositionWC
  );
  Matrix3.multiplyByVector(transformMatrix, position, position);

  Cartesian3.normalize(position, uniformState._sunDirectionWC);

  position = Matrix3.multiplyByVector(
    uniformState.viewRotation3D,
    position,
    uniformState._sunDirectionEC
  );
  Cartesian3.normalize(position, position);

  position = Simon1994PlanetaryPositions.computeMoonPositionInEarthInertialFrame(
    frameState.time,
    uniformState._moonDirectionEC
  );
  Matrix3.multiplyByVector(transformMatrix, position, position);
  Matrix3.multiplyByVector(uniformState.viewRotation3D, position, position);
  Cartesian3.normalize(position, position);

  var projection = frameState.mapProjection;
  var ellipsoid = projection.ellipsoid;
  var sunCartographic = ellipsoid.cartesianToCartographic(
    uniformState._sunPositionWC,
    sunCartographicScratch
  );
  projection.project(sunCartographic, uniformState._sunPositionColumbusView);
}

/**
 * Synchronizes the frustum's state with the camera state.  This is called
 * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
 * are set to the right value.
 *
 * @param {Object} camera The camera to synchronize with.
 */
UniformState.prototype.updateCamera = function (camera) {
  setView(this, camera.viewMatrix);
  setInverseView(this, camera.inverseViewMatrix);
  setCamera(this, camera);

  this._entireFrustum.x = camera.frustum.near;
  this._entireFrustum.y = camera.frustum.far;
  this.updateFrustum(camera.frustum);

  this._orthographicIn3D =
    this._mode !== SceneMode.SCENE2D &&
    camera.frustum instanceof OrthographicFrustum;
};

/**
 * Synchronizes the frustum's state with the uniform state.  This is called
 * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
 * are set to the right value.
 *
 * @param {Object} frustum The frustum to synchronize with.
 */
UniformState.prototype.updateFrustum = function (frustum) {
  setProjection(this, frustum.projectionMatrix);
  if (defined(frustum.infiniteProjectionMatrix)) {
    setInfiniteProjection(this, frustum.infiniteProjectionMatrix);
  }
  this._currentFrustum.x = frustum.near;
  this._currentFrustum.y = frustum.far;

  this._farDepthFromNearPlusOne = frustum.far - frustum.near + 1.0;
  this._log2FarDepthFromNearPlusOne = CesiumMath.log2(
    this._farDepthFromNearPlusOne
  );
  this._oneOverLog2FarDepthFromNearPlusOne =
    1.0 / this._log2FarDepthFromNearPlusOne;

  if (defined(frustum._offCenterFrustum)) {
    frustum = frustum._offCenterFrustum;
  }

  this._frustumPlanes.x = frustum.top;
  this._frustumPlanes.y = frustum.bottom;
  this._frustumPlanes.z = frustum.left;
  this._frustumPlanes.w = frustum.right;
};

UniformState.prototype.updatePass = function (pass) {
  this._pass = pass;
};

var EMPTY_ARRAY = [];
var defaultLight = new SunLight();

/**
 * Synchronizes frame state with the uniform state.  This is called
 * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
 * are set to the right value.
 *
 * @param {FrameState} frameState The frameState to synchronize with.
 */
UniformState.prototype.update = function (frameState) {
  this._mode = frameState.mode;
  this._mapProjection = frameState.mapProjection;
  this._ellipsoid = frameState.mapProjection.ellipsoid;
  this._pixelRatio = frameState.pixelRatio;

  var camera = frameState.camera;
  this.updateCamera(camera);

  if (frameState.mode === SceneMode.SCENE2D) {
    this._frustum2DWidth = camera.frustum.right - camera.frustum.left;
    this._eyeHeight2D.x = this._frustum2DWidth * 0.5;
    this._eyeHeight2D.y = this._eyeHeight2D.x * this._eyeHeight2D.x;
  } else {
    this._frustum2DWidth = 0.0;
    this._eyeHeight2D.x = 0.0;
    this._eyeHeight2D.y = 0.0;
  }

  setSunAndMoonDirections(this, frameState);

  var light = defaultValue(frameState.light, defaultLight);
  if (light instanceof SunLight) {
    this._lightDirectionWC = Cartesian3.clone(
      this._sunDirectionWC,
      this._lightDirectionWC
    );
    this._lightDirectionEC = Cartesian3.clone(
      this._sunDirectionEC,
      this._lightDirectionEC
    );
  } else {
    this._lightDirectionWC = Cartesian3.normalize(
      Cartesian3.negate(light.direction, this._lightDirectionWC),
      this._lightDirectionWC
    );
    this._lightDirectionEC = Matrix3.multiplyByVector(
      this.viewRotation3D,
      this._lightDirectionWC,
      this._lightDirectionEC
    );
  }

  var lightColor = light.color;
  var lightColorHdr = Cartesian3.fromElements(
    lightColor.red,
    lightColor.green,
    lightColor.blue,
    this._lightColorHdr
  );
  lightColorHdr = Cartesian3.multiplyByScalar(
    lightColorHdr,
    light.intensity,
    lightColorHdr
  );
  var maximumComponent = Cartesian3.maximumComponent(lightColorHdr);
  if (maximumComponent > 1.0) {
    Cartesian3.divideByScalar(
      lightColorHdr,
      maximumComponent,
      this._lightColor
    );
  } else {
    Cartesian3.clone(lightColorHdr, this._lightColor);
  }

  var brdfLutGenerator = frameState.brdfLutGenerator;
  var brdfLut = defined(brdfLutGenerator)
    ? brdfLutGenerator.colorTexture
    : undefined;
  this._brdfLut = brdfLut;

  this._environmentMap = defaultValue(
    frameState.environmentMap,
    frameState.context.defaultCubeMap
  );

  // IE 11 doesn't optimize out uniforms that are #ifdef'd out. So undefined values for the spherical harmonic
  // coefficients and specular environment map atlas dimensions cause a crash.
  this._sphericalHarmonicCoefficients = defaultValue(
    frameState.sphericalHarmonicCoefficients,
    EMPTY_ARRAY
  );
  this._specularEnvironmentMaps = frameState.specularEnvironmentMaps;
  this._specularEnvironmentMapsMaximumLOD =
    frameState.specularEnvironmentMapsMaximumLOD;

  if (defined(this._specularEnvironmentMaps)) {
    Cartesian2.clone(
      this._specularEnvironmentMaps.dimensions,
      this._specularEnvironmentMapsDimensions
    );
  }

  this._fogDensity = frameState.fog.density;

  this._invertClassificationColor = frameState.invertClassificationColor;

  this._frameState = frameState;
  this._temeToPseudoFixed = Transforms.computeTemeToPseudoFixedMatrix(
    frameState.time,
    this._temeToPseudoFixed
  );

  // Convert the relative imagerySplitPosition to absolute pixel coordinates
  this._imagerySplitPosition =
    frameState.imagerySplitPosition * frameState.context.drawingBufferWidth;
  var fov = camera.frustum.fov;
  var viewport = this._viewport;
  var pixelSizePerMeter;
  if (defined(fov)) {
    if (viewport.height > viewport.width) {
      pixelSizePerMeter = (Math.tan(0.5 * fov) * 2.0) / viewport.height;
    } else {
      pixelSizePerMeter = (Math.tan(0.5 * fov) * 2.0) / viewport.width;
    }
  } else {
    pixelSizePerMeter = 1.0 / Math.max(viewport.width, viewport.height);
  }

  this._geometricToleranceOverMeter =
    pixelSizePerMeter * frameState.maximumScreenSpaceError;
  Color.clone(frameState.backgroundColor, this._backgroundColor);

  this._minimumDisableDepthTestDistance =
    frameState.minimumDisableDepthTestDistance;
  this._minimumDisableDepthTestDistance *= this._minimumDisableDepthTestDistance;
  if (this._minimumDisableDepthTestDistance === Number.POSITIVE_INFINITY) {
    this._minimumDisableDepthTestDistance = -1.0;
  }
};

function cleanViewport(uniformState) {
  if (uniformState._viewportDirty) {
    var v = uniformState._viewport;
    Matrix4.computeOrthographicOffCenter(
      v.x,
      v.x + v.width,
      v.y,
      v.y + v.height,
      0.0,
      1.0,
      uniformState._viewportOrthographicMatrix
    );
    Matrix4.computeViewportTransformation(
      v,
      0.0,
      1.0,
      uniformState._viewportTransformation
    );
    uniformState._viewportDirty = false;
  }
}

function cleanInverseProjection(uniformState) {
  if (uniformState._inverseProjectionDirty) {
    uniformState._inverseProjectionDirty = false;

    if (
      uniformState._mode !== SceneMode.SCENE2D &&
      uniformState._mode !== SceneMode.MORPHING &&
      !uniformState._orthographicIn3D
    ) {
      Matrix4.inverse(
        uniformState._projection,
        uniformState._inverseProjection
      );
    } else {
      Matrix4.clone(Matrix4.ZERO, uniformState._inverseProjection);
    }
  }
}

// Derived
function cleanModelView(uniformState) {
  if (uniformState._modelViewDirty) {
    uniformState._modelViewDirty = false;

    Matrix4.multiplyTransformation(
      uniformState._view,
      uniformState._model,
      uniformState._modelView
    );
  }
}

function cleanModelView3D(uniformState) {
  if (uniformState._modelView3DDirty) {
    uniformState._modelView3DDirty = false;

    Matrix4.multiplyTransformation(
      uniformState.view3D,
      uniformState._model,
      uniformState._modelView3D
    );
  }
}

function cleanInverseModelView(uniformState) {
  if (uniformState._inverseModelViewDirty) {
    uniformState._inverseModelViewDirty = false;

    Matrix4.inverse(uniformState.modelView, uniformState._inverseModelView);
  }
}

function cleanInverseModelView3D(uniformState) {
  if (uniformState._inverseModelView3DDirty) {
    uniformState._inverseModelView3DDirty = false;

    Matrix4.inverse(uniformState.modelView3D, uniformState._inverseModelView3D);
  }
}

function cleanViewProjection(uniformState) {
  if (uniformState._viewProjectionDirty) {
    uniformState._viewProjectionDirty = false;

    Matrix4.multiply(
      uniformState._projection,
      uniformState._view,
      uniformState._viewProjection
    );
  }
}

function cleanInverseViewProjection(uniformState) {
  if (uniformState._inverseViewProjectionDirty) {
    uniformState._inverseViewProjectionDirty = false;

    Matrix4.inverse(
      uniformState.viewProjection,
      uniformState._inverseViewProjection
    );
  }
}

function cleanModelViewProjection(uniformState) {
  if (uniformState._modelViewProjectionDirty) {
    uniformState._modelViewProjectionDirty = false;

    Matrix4.multiply(
      uniformState._projection,
      uniformState.modelView,
      uniformState._modelViewProjection
    );
  }
}

function cleanModelViewRelativeToEye(uniformState) {
  if (uniformState._modelViewRelativeToEyeDirty) {
    uniformState._modelViewRelativeToEyeDirty = false;

    var mv = uniformState.modelView;
    var mvRte = uniformState._modelViewRelativeToEye;
    mvRte[0] = mv[0];
    mvRte[1] = mv[1];
    mvRte[2] = mv[2];
    mvRte[3] = mv[3];
    mvRte[4] = mv[4];
    mvRte[5] = mv[5];
    mvRte[6] = mv[6];
    mvRte[7] = mv[7];
    mvRte[8] = mv[8];
    mvRte[9] = mv[9];
    mvRte[10] = mv[10];
    mvRte[11] = mv[11];
    mvRte[12] = 0.0;
    mvRte[13] = 0.0;
    mvRte[14] = 0.0;
    mvRte[15] = mv[15];
  }
}

function cleanInverseModelViewProjection(uniformState) {
  if (uniformState._inverseModelViewProjectionDirty) {
    uniformState._inverseModelViewProjectionDirty = false;

    Matrix4.inverse(
      uniformState.modelViewProjection,
      uniformState._inverseModelViewProjection
    );
  }
}

function cleanModelViewProjectionRelativeToEye(uniformState) {
  if (uniformState._modelViewProjectionRelativeToEyeDirty) {
    uniformState._modelViewProjectionRelativeToEyeDirty = false;

    Matrix4.multiply(
      uniformState._projection,
      uniformState.modelViewRelativeToEye,
      uniformState._modelViewProjectionRelativeToEye
    );
  }
}

function cleanModelViewInfiniteProjection(uniformState) {
  if (uniformState._modelViewInfiniteProjectionDirty) {
    uniformState._modelViewInfiniteProjectionDirty = false;

    Matrix4.multiply(
      uniformState._infiniteProjection,
      uniformState.modelView,
      uniformState._modelViewInfiniteProjection
    );
  }
}

function cleanNormal(uniformState) {
  if (uniformState._normalDirty) {
    uniformState._normalDirty = false;

    var m = uniformState._normal;
    Matrix4.getMatrix3(uniformState.inverseModelView, m);
    Matrix3.getRotation(m, m);
    Matrix3.transpose(m, m);
  }
}

function cleanNormal3D(uniformState) {
  if (uniformState._normal3DDirty) {
    uniformState._normal3DDirty = false;

    var m = uniformState._normal3D;
    Matrix4.getMatrix3(uniformState.inverseModelView3D, m);
    Matrix3.getRotation(m, m);
    Matrix3.transpose(m, m);
  }
}

function cleanInverseNormal(uniformState) {
  if (uniformState._inverseNormalDirty) {
    uniformState._inverseNormalDirty = false;
    Matrix4.getMatrix3(
      uniformState.inverseModelView,
      uniformState._inverseNormal
    );
    Matrix3.getRotation(
      uniformState._inverseNormal,
      uniformState._inverseNormal
    );
  }
}

function cleanInverseNormal3D(uniformState) {
  if (uniformState._inverseNormal3DDirty) {
    uniformState._inverseNormal3DDirty = false;
    Matrix4.getMatrix3(
      uniformState.inverseModelView3D,
      uniformState._inverseNormal3D
    );
    Matrix3.getRotation(
      uniformState._inverseNormal3D,
      uniformState._inverseNormal3D
    );
  }
}

var cameraPositionMC = new Cartesian3();

function cleanEncodedCameraPositionMC(uniformState) {
  if (uniformState._encodedCameraPositionMCDirty) {
    uniformState._encodedCameraPositionMCDirty = false;

    Matrix4.multiplyByPoint(
      uniformState.inverseModel,
      uniformState._cameraPosition,
      cameraPositionMC
    );
    EncodedCartesian3.fromCartesian(
      cameraPositionMC,
      uniformState._encodedCameraPositionMC
    );
  }
}

var view2Dto3DPScratch = new Cartesian3();
var view2Dto3DRScratch = new Cartesian3();
var view2Dto3DUScratch = new Cartesian3();
var view2Dto3DDScratch = new Cartesian3();
var view2Dto3DCartographicScratch = new Cartographic();
var view2Dto3DCartesian3Scratch = new Cartesian3();
var view2Dto3DMatrix4Scratch = new Matrix4();

function view2Dto3D(
  position2D,
  direction2D,
  right2D,
  up2D,
  frustum2DWidth,
  mode,
  projection,
  result
) {
  // The camera position and directions are expressed in the 2D coordinate system where the Y axis is to the East,
  // the Z axis is to the North, and the X axis is out of the map.  Express them instead in the ENU axes where
  // X is to the East, Y is to the North, and Z is out of the local horizontal plane.
  var p = view2Dto3DPScratch;
  p.x = position2D.y;
  p.y = position2D.z;
  p.z = position2D.x;

  var r = view2Dto3DRScratch;
  r.x = right2D.y;
  r.y = right2D.z;
  r.z = right2D.x;

  var u = view2Dto3DUScratch;
  u.x = up2D.y;
  u.y = up2D.z;
  u.z = up2D.x;

  var d = view2Dto3DDScratch;
  d.x = direction2D.y;
  d.y = direction2D.z;
  d.z = direction2D.x;

  // In 2D, the camera height is always 12.7 million meters.
  // The apparent height is equal to half the frustum width.
  if (mode === SceneMode.SCENE2D) {
    p.z = frustum2DWidth * 0.5;
  }

  // Compute the equivalent camera position in the real (3D) world.
  // In 2D and Columbus View, the camera can travel outside the projection, and when it does so
  // there's not really any corresponding location in the real world.  So clamp the unprojected
  // longitude and latitude to their valid ranges.
  var cartographic = projection.unproject(p, view2Dto3DCartographicScratch);
  cartographic.longitude = CesiumMath.clamp(
    cartographic.longitude,
    -Math.PI,
    Math.PI
  );
  cartographic.latitude = CesiumMath.clamp(
    cartographic.latitude,
    -CesiumMath.PI_OVER_TWO,
    CesiumMath.PI_OVER_TWO
  );
  var ellipsoid = projection.ellipsoid;
  var position3D = ellipsoid.cartographicToCartesian(
    cartographic,
    view2Dto3DCartesian3Scratch
  );

  // Compute the rotation from the local ENU at the real world camera position to the fixed axes.
  var enuToFixed = Transforms.eastNorthUpToFixedFrame(
    position3D,
    ellipsoid,
    view2Dto3DMatrix4Scratch
  );

  // Transform each camera direction to the fixed axes.
  Matrix4.multiplyByPointAsVector(enuToFixed, r, r);
  Matrix4.multiplyByPointAsVector(enuToFixed, u, u);
  Matrix4.multiplyByPointAsVector(enuToFixed, d, d);

  // Compute the view matrix based on the new fixed-frame camera position and directions.
  if (!defined(result)) {
    result = new Matrix4();
  }

  result[0] = r.x;
  result[1] = u.x;
  result[2] = -d.x;
  result[3] = 0.0;
  result[4] = r.y;
  result[5] = u.y;
  result[6] = -d.y;
  result[7] = 0.0;
  result[8] = r.z;
  result[9] = u.z;
  result[10] = -d.z;
  result[11] = 0.0;
  result[12] = -Cartesian3.dot(r, position3D);
  result[13] = -Cartesian3.dot(u, position3D);
  result[14] = Cartesian3.dot(d, position3D);
  result[15] = 1.0;

  return result;
}

function updateView3D(that) {
  if (that._view3DDirty) {
    if (that._mode === SceneMode.SCENE3D) {
      Matrix4.clone(that._view, that._view3D);
    } else {
      view2Dto3D(
        that._cameraPosition,
        that._cameraDirection,
        that._cameraRight,
        that._cameraUp,
        that._frustum2DWidth,
        that._mode,
        that._mapProjection,
        that._view3D
      );
    }
    Matrix4.getMatrix3(that._view3D, that._viewRotation3D);
    that._view3DDirty = false;
  }
}

function updateInverseView3D(that) {
  if (that._inverseView3DDirty) {
    Matrix4.inverseTransformation(that.view3D, that._inverseView3D);
    Matrix4.getMatrix3(that._inverseView3D, that._inverseViewRotation3D);
    that._inverseView3DDirty = false;
  }
}
export default UniformState;
