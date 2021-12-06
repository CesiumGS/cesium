import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import defined from "../Core/defined.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import OctahedralProjectedCubeMap from "./OctahedralProjectedCubeMap.js";

var scratchIBLReferenceFrameMatrix4 = new Matrix4();
var scratchIBLReferenceFrameMatrix3 = new Matrix3();

/**
 * Object to manage image based lighting parameters including textures.
 *
 * @constructor
 *
 * @param {Cartesian2} [options.imageBasedLightingFactor=Cartesian2(1.0, 1.0)] Scales diffuse and specular image-based lighting from the earth, sky, atmosphere and star skybox.
 * @param {Cartesian3} [options.lightColor] The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
 * @param {Number} [options.luminanceAtZenith=0.2] The sun's luminance at the zenith in kilo candela per meter squared to use for this model's procedural environment map.
 * @param {Cartesian3[]} [options.sphericalHarmonicCoefficients] The third order spherical harmonic coefficients used for the diffuse color of image-based lighting.
 * @param {String} [options.specularEnvironmentMaps] A URL to a KTX2 file that contains a cube map of the specular lighting and the convoluted specular mipmaps.
 */
export default function ImageBasedLightingParameters(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var iblFactor = new Cartesian2(1.0, 1.0);
  Cartesian2.clone(options.imageBasedLightingFactor, iblFactor);
  this._imageBasedLightingFactor = iblFactor;

  this._lightColor = Cartesian3.clone(options.lightColor);
  this._luminanceAtZenith = defaultValue(options.luminanceAtZenith, 0.2);
  this._sphericalHarmonicCoefficients = options.sphericalHarmonicCoefficients;

  // The model/tileset will set this with a setter after construction.
  this._referenceMatrix = Matrix3.clone(Matrix3.IDENTITY);
  // Derived from reference matrix and the current view matrix
  this._iblReferenceFrameMatrix = Matrix3.clone(Matrix3.IDENTITY);

  // The specular environment map texture is created in update();
  this._specularEnvironmentMaps = options.specularEnvironmentMaps;
  this._specularMapAtlasDirty = true;
  this._specularEnvironmentMapAtlas = undefined;

  this._shouldRegenerateShaders = true;
  this._useDefaultSpecularMaps = false;
  this._useDefaultSphericalHarmonics = false;
}

Object.defineProperties(ImageBasedLightingParameters.prototype, {
  /**
   * The reference frame to use for transforming the image based lighting. This
   * is either the model's modelMatrix, or another reference matrix (e.g. the
   * tileset modelMatrix).
   *
   * @type {Matrix4}
   * @private
   */
  referenceMatrix: {
    get: function () {
      return this._referenceMatrix;
    },
    set: function (value) {
      this._referenceMatrix = value;
    },
  },
  lightColor: {
    get: function () {
      return this._lightColor;
    },
    set: function (value) {
      var lightColor = this._lightColor;
      if (value === lightColor || Cartesian3.equals(value, lightColor)) {
        return;
      }
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (defined(lightColor) && !defined(value)) ||
        (defined(value) && !defined(lightColor));
      this._lightColor = Cartesian3.clone(value, lightColor);
    },
  },
  imageBasedLightingFactor: {
    get: function () {
      return this._imageBasedLightingFactor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("imageBasedLightingFactor", value);
      Check.typeOf.number.greaterThanOrEquals(
        "imageBasedLightingFactor.x",
        value.x,
        0.0
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.x",
        value.x,
        1.0
      );
      Check.typeOf.number.greaterThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        0.0
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        1.0
      );
      //>>includeEnd('debug');
      var imageBasedLightingFactor = this._imageBasedLightingFactor;
      if (
        value === imageBasedLightingFactor ||
        Cartesian2.equals(value, imageBasedLightingFactor)
      ) {
        return;
      }
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (this._imageBasedLightingFactor.x > 0.0 && value.x === 0.0) ||
        (this._imageBasedLightingFactor.x === 0.0 && value.x > 0.0);
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (this._imageBasedLightingFactor.y > 0.0 && value.y === 0.0) ||
        (this._imageBasedLightingFactor.y === 0.0 && value.y > 0.0);
      Cartesian2.clone(value, this._imageBasedLightingFactor);
    },
  },
  iblReferenceFrameMatrix: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && (!Array.isArray(value) || value.length !== 9)) {
        throw new DeveloperError(
          "sphericalHarmonicCoefficients must be an array of 9 Cartesian3 values."
        );
      }
      //>>includeEnd('debug');
      if (value === this._sphericalHarmonicCoefficients) {
        return;
      }
      this._sphericalHarmonicCoefficients = value;
      this._shouldRegenerateShaders = true;
    },
  },
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
  },
  specularEnvironmentMapAtlas: {
    get: function () {
      return this._specularEnvironmentMaps;
    },
    set: function (value) {
      this._shouldUpdateSpecularMapAtlas =
        this._shouldUpdateSpecularMapAtlas ||
        value !== this._specularEnvironmentMaps;
      this._specularEnvironmentMaps = value;
    },
  },
  luminanceAtZenith: {
    get: function () {
      return this._luminanceAtZenith;
    },
    set: function (value) {
      var lum = this._luminanceAtZenith;
      if (value === lum) {
        return;
      }
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (defined(lum) && !defined(value)) ||
        (defined(value) && !defined(lum));
      this._luminanceAtZenith = value;
    },
  },
});

function createSpecularMapAtlas(iblParameters, context) {
  if (!OctahedralProjectedCubeMap.isSupported(context)) {
    return;
  }

  iblParameters._specularEnvironmentMapAtlas =
    iblParameters._specularEnvironmentMapAtlas &&
    iblParameters._specularEnvironmentMapAtlas.destroy();

  if (defined(iblParameters._specularEnvironmentMaps)) {
    var atlas = new OctahedralProjectedCubeMap(
      iblParameters._specularEnvironmentMaps
    );
    iblParameters._specularEnvironmentMapAtlas = atlas;

    atlas.readyPromise
      .then(function () {
        iblParameters._shouldRegenerateShaders = true;
      })
      .otherwise(function (error) {
        console.error("Error loading specularEnvironmentMaps: " + error);
      });
  }

  iblParameters._shouldRegenerateShaders = true;
}

ImageBasedLightingParameters.prototype.update = function (frameState) {
  frameState.brdfLutGenerator.update(frameState);

  var context = frameState.context;

  if (this._specularMapAtlasDirty) {
    createSpecularMapAtlas(this, context);
    this._specularMapAtlasDirty = false;
  }

  if (defined(this._specularEnvironmentMapAtlas)) {
    this._specularEnvironmentMapAtlas.update(frameState);
  }

  var recompileWithDefaultAtlas =
    !defined(this._specularEnvironmentMapAtlas) &&
    defined(frameState.specularEnvironmentMaps) &&
    !this._useDefaultSpecularMaps;
  var recompileWithoutDefaultAtlas =
    !defined(frameState.specularEnvironmentMaps) &&
    this._useDefaultSpecularMaps;

  var recompileWithDefaultSHCoeffs =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients) &&
    !this._useDefaultSphericalHarmonics;
  var recompileWithoutDefaultSHCoeffs =
    !defined(frameState.sphericalHarmonicCoefficients) &&
    this._useDefaultSphericalHarmonics;

  this._shouldRegenerateShaders =
    this._shouldRegenerateShaders ||
    recompileWithDefaultAtlas ||
    recompileWithoutDefaultAtlas ||
    recompileWithDefaultSHCoeffs ||
    recompileWithoutDefaultSHCoeffs;

  this._useDefaultSpecularMaps =
    !defined(this._specularEnvironmentMapAtlas) &&
    defined(frameState.specularEnvironmentMaps);
  this._useDefaultSphericalHarmonics =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients);

  var usesSH =
    defined(this._sphericalHarmonicCoefficients) ||
    this._useDefaultSphericalHarmonics;
  var usesSM =
    (defined(this._specularEnvironmentMapAtlas) &&
      this._specularEnvironmentMapAtlas.ready) ||
    this._useDefaultSpecularMaps;

  if (usesSH || usesSM) {
    var iblReferenceFrameMatrix3 = scratchIBLReferenceFrameMatrix3;
    var iblReferenceFrameMatrix4 = scratchIBLReferenceFrameMatrix4;

    iblReferenceFrameMatrix4 = Matrix4.multiply(
      context.uniformState.view3D,
      this._referenceMatrix,
      iblReferenceFrameMatrix4
    );
    iblReferenceFrameMatrix3 = Matrix4.getMatrix3(
      iblReferenceFrameMatrix4,
      iblReferenceFrameMatrix3
    );
    iblReferenceFrameMatrix3 = Matrix3.getRotation(
      iblReferenceFrameMatrix3,
      iblReferenceFrameMatrix3
    );
    this._iblReferenceFrameMatrix = Matrix3.transpose(
      iblReferenceFrameMatrix3,
      this._iblReferenceFrameMatrix
    );
  }
};

ImageBasedLightingParameters.prototype.isDestroyed = function () {
  return false;
};

ImageBasedLightingParameters.prototype.destroy = function () {
  this._specularEnvironmentMapAtlas =
    this._specularEnvironmentMapAtlas &&
    this._specularEnvironmentMapAtlas.destroy();
  return destroyObject(this);
};
