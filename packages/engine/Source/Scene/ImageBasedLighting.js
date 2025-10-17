import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import Frozen from "../Core/Frozen.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import SpecularEnvironmentCubeMap from "./SpecularEnvironmentCubeMap.js";

/**
 * Properties for managing image-based lighting on tilesets and models.
 * Also manages the necessary resources and textures.
 * <p>
 * If specular environment maps are used, {@link ImageBasedLighting#destroy} must be called
 * when the image-based lighting is no longer needed to clean up GPU resources properly.
 * If a model or tileset creates an instance of ImageBasedLighting, it will handle this.
 * Otherwise, the application is responsible for calling destroy().
 *</p>
 *
 * @alias ImageBasedLighting
 * @constructor
 *
 * @param {Cartesian2} [options.imageBasedLightingFactor=Cartesian2(1.0, 1.0)] Scales diffuse and specular image-based lighting from the earth, sky, atmosphere and star skybox.
 * @param {Cartesian3[]} [options.sphericalHarmonicCoefficients] The third order spherical harmonic coefficients used for the diffuse color of image-based lighting.
 * @param {string} [options.specularEnvironmentMaps] A URL to a KTX2 file that contains a cube map of the specular lighting and the convoluted specular mipmaps.
 */
function ImageBasedLighting(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const imageBasedLightingFactor = defined(options.imageBasedLightingFactor)
    ? Cartesian2.clone(options.imageBasedLightingFactor)
    : new Cartesian2(1.0, 1.0);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object(
    "options.imageBasedLightingFactor",
    imageBasedLightingFactor,
  );
  Check.typeOf.number.greaterThanOrEquals(
    "options.imageBasedLightingFactor.x",
    imageBasedLightingFactor.x,
    0.0,
  );
  Check.typeOf.number.lessThanOrEquals(
    "options.imageBasedLightingFactor.x",
    imageBasedLightingFactor.x,
    1.0,
  );
  Check.typeOf.number.greaterThanOrEquals(
    "options.imageBasedLightingFactor.y",
    imageBasedLightingFactor.y,
    0.0,
  );
  Check.typeOf.number.lessThanOrEquals(
    "options.imageBasedLightingFactor.y",
    imageBasedLightingFactor.y,
    1.0,
  );
  //>>includeEnd('debug');

  this._imageBasedLightingFactor = imageBasedLightingFactor;

  const sphericalHarmonicCoefficients = options.sphericalHarmonicCoefficients;

  //>>includeStart('debug', pragmas.debug);
  if (
    defined(sphericalHarmonicCoefficients) &&
    (!Array.isArray(sphericalHarmonicCoefficients) ||
      sphericalHarmonicCoefficients.length !== 9)
  ) {
    throw new DeveloperError(
      "options.sphericalHarmonicCoefficients must be an array of 9 Cartesian3 values.",
    );
  }
  //>>includeEnd('debug');
  this._sphericalHarmonicCoefficients = sphericalHarmonicCoefficients;

  // The specular environment map texture is created in update();
  this._specularEnvironmentMaps = options.specularEnvironmentMaps;
  this._specularEnvironmentCubeMap = undefined;
  this._specularEnvironmentCubeMapDirty = true;
  this._specularEnvironmentMapLoaded = false;
  this._previousSpecularEnvironmentMapLoaded = false;

  this._useDefaultSpecularMaps = false;
  this._useDefaultSphericalHarmonics = false;
  this._shouldRegenerateShaders = false;

  // Store the previous frame number to prevent redundant update calls
  this._previousFrameNumber = undefined;
  this._previousFrameContext = undefined;

  // Keeps track of the last values for use during update logic
  this._previousImageBasedLightingFactor = Cartesian2.clone(
    imageBasedLightingFactor,
  );
  this._previousSphericalHarmonicCoefficients = sphericalHarmonicCoefficients;
  this._removeErrorListener = undefined;
}

Object.defineProperties(ImageBasedLighting.prototype, {
  /**
   * Cesium adds lighting from the earth, sky, atmosphere, and star skybox.
   * This cartesian is used to scale the final diffuse and specular lighting
   * contribution from those sources to the final color. A value of 0.0 will
   * disable those light sources.
   *
   * @memberof ImageBasedLighting.prototype
   *
   * @type {Cartesian2}
   * @default Cartesian2(1.0, 1.0)
   */
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
        0.0,
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.x",
        value.x,
        1.0,
      );
      Check.typeOf.number.greaterThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        0.0,
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        1.0,
      );
      //>>includeEnd('debug');
      this._previousImageBasedLightingFactor = Cartesian2.clone(
        this._imageBasedLightingFactor,
        this._previousImageBasedLightingFactor,
      );
      this._imageBasedLightingFactor = Cartesian2.clone(
        value,
        this._imageBasedLightingFactor,
      );
    },
  },

  /**
   * The third order spherical harmonic coefficients used for the diffuse color of image-based lighting. When <code>undefined</code>, a diffuse irradiance
   * computed from the atmosphere color is used.
   * <p>
   * There are nine <code>Cartesian3</code> coefficients.
   * The order of the coefficients is: L<sub>0,0</sub>, L<sub>1,-1</sub>, L<sub>1,0</sub>, L<sub>1,1</sub>, L<sub>2,-2</sub>, L<sub>2,-1</sub>, L<sub>2,0</sub>, L<sub>2,1</sub>, L<sub>2,2</sub>
   * </p>
   *
   * These values can be obtained by preprocessing the environment map using the <code>cmgen</code> tool of
   * {@link https://github.com/google/filament/releases|Google's Filament project}.
   * Be sure to use the <code>--no-mirror</code> option in <code>cmgen</code>.
   *
   * @memberof ImageBasedLighting.prototype
   *
   * @type {Cartesian3[]}
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Image-Based Lighting.html|Sandcastle Image Based Lighting Demo}
   * @see {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf|An Efficient Representation for Irradiance Environment Maps}
   */
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && (!Array.isArray(value) || value.length !== 9)) {
        throw new DeveloperError(
          "sphericalHarmonicCoefficients must be an array of 9 Cartesian3 values.",
        );
      }
      //>>includeEnd('debug');
      this._previousSphericalHarmonicCoefficients =
        this._sphericalHarmonicCoefficients;
      this._sphericalHarmonicCoefficients = value;
    },
  },

  /**
   * A URL to a KTX2 file that contains a cube map of the specular lighting and the convoluted specular mipmaps.
   *
   * @memberof ImageBasedLighting.prototype
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Image-Based Lighting.html|Sandcastle Image Based Lighting Demo}
   * @type {string}
   * @see ImageBasedLighting#sphericalHarmonicCoefficients
   */
  specularEnvironmentMaps: {
    get: function () {
      return this._specularEnvironmentMaps;
    },
    set: function (value) {
      if (value !== this._specularEnvironmentMaps) {
        this._specularEnvironmentCubeMapDirty =
          this._specularEnvironmentCubeMapDirty ||
          value !== this._specularEnvironmentMaps;
        this._specularEnvironmentMapLoaded = false;
      }
      this._specularEnvironmentMaps = value;
    },
  },

  /**
   * Whether or not image-based lighting is enabled.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {boolean}
   *
   * @private
   */
  enabled: {
    get: function () {
      return (
        this._imageBasedLightingFactor.x > 0.0 ||
        this._imageBasedLightingFactor.y > 0.0
      );
    },
  },

  /**
   * Whether or not the models that use this lighting should regenerate their shaders,
   * based on the properties and resources have changed.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {boolean}
   *
   * @private
   */
  shouldRegenerateShaders: {
    get: function () {
      return this._shouldRegenerateShaders;
    },
  },

  /**
   * The texture atlas for the specular environment maps.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {SpecularEnvironmentCubeMap}
   *
   * @private
   */
  specularEnvironmentCubeMap: {
    get: function () {
      return this._specularEnvironmentCubeMap;
    },
  },

  /**
   * Whether or not to use the default spherical harmonics coefficients.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {boolean}
   *
   * @private
   */
  useDefaultSphericalHarmonics: {
    get: function () {
      return this._useDefaultSphericalHarmonics;
    },
  },

  /**
   * Whether or not to use the default specular environment maps.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {boolean}
   *
   * @private
   */
  useDefaultSpecularMaps: {
    get: function () {
      return this._useDefaultSpecularMaps;
    },
  },

  /**
   * Whether or not the image-based lighting settings use specular environment maps.
   *
   * @memberof ImageBasedLighting.prototype
   * @type {boolean}
   *
   * @private
   */
  useSpecularEnvironmentMaps: {
    get: function () {
      return (
        (defined(this._specularEnvironmentCubeMap) &&
          this._specularEnvironmentCubeMap.ready) ||
        this._useDefaultSpecularMaps
      );
    },
  },
});

function createSpecularEnvironmentCubeMap(imageBasedLighting, context) {
  if (!SpecularEnvironmentCubeMap.isSupported(context)) {
    return;
  }

  imageBasedLighting._specularEnvironmentCubeMap =
    imageBasedLighting._specularEnvironmentCubeMap &&
    imageBasedLighting._specularEnvironmentCubeMap.destroy();

  if (defined(imageBasedLighting._specularEnvironmentMaps)) {
    const cubeMap = new SpecularEnvironmentCubeMap(
      imageBasedLighting._specularEnvironmentMaps,
    );
    imageBasedLighting._specularEnvironmentCubeMap = cubeMap;

    imageBasedLighting._removeErrorListener =
      cubeMap.errorEvent.addEventListener((error) => {
        console.error(`Error loading specularEnvironmentMaps: ${error}`);
      });
  }

  // Regenerate shaders so they do not use an environment map.
  // Will be set to true again if there was a new environment map and it is ready.
  imageBasedLighting._shouldRegenerateShaders = true;
}

ImageBasedLighting.prototype.update = function (frameState) {
  if (
    frameState.frameNumber === this._previousFrameNumber &&
    frameState.context === this._previousFrameContext
  ) {
    return;
  }

  this._previousFrameNumber = frameState.frameNumber;
  const context = (this._previousFrameContext = frameState.context);

  frameState.brdfLutGenerator.update(frameState);
  this._shouldRegenerateShaders = false;

  const iblFactor = this._imageBasedLightingFactor;
  const previousIBLFactor = this._previousImageBasedLightingFactor;
  if (!Cartesian2.equals(iblFactor, previousIBLFactor)) {
    this._shouldRegenerateShaders =
      (iblFactor.x > 0.0 && previousIBLFactor.x === 0.0) ||
      (iblFactor.x === 0.0 && previousIBLFactor.x > 0.0);
    this._shouldRegenerateShaders =
      this._shouldRegenerateShaders ||
      (iblFactor.y > 0.0 && previousIBLFactor.y === 0.0) ||
      (iblFactor.y === 0.0 && previousIBLFactor.y > 0.0);

    this._previousImageBasedLightingFactor = Cartesian2.clone(
      this._imageBasedLightingFactor,
      this._previousImageBasedLightingFactor,
    );
  }

  if (
    this._previousSphericalHarmonicCoefficients !==
    this._sphericalHarmonicCoefficients
  ) {
    this._shouldRegenerateShaders =
      this._shouldRegenerateShaders ||
      defined(this._previousSphericalHarmonicCoefficients) !==
        defined(this._sphericalHarmonicCoefficients);

    this._previousSphericalHarmonicCoefficients =
      this._sphericalHarmonicCoefficients;
  }

  this._shouldRegenerateShaders =
    this._shouldRegenerateShaders ||
    this._previousSpecularEnvironmentMapLoaded !==
      this._specularEnvironmentMapLoaded;

  this._previousSpecularEnvironmentMapLoaded =
    this._specularEnvironmentMapLoaded;

  if (this._specularEnvironmentCubeMapDirty) {
    createSpecularEnvironmentCubeMap(this, context);
    this._specularEnvironmentCubeMapDirty = false;
  }

  if (defined(this._specularEnvironmentCubeMap)) {
    this._specularEnvironmentCubeMap.update(frameState);
    if (this._specularEnvironmentCubeMap.ready) {
      this._specularEnvironmentMapLoaded = true;
    }
  }

  const recompileWithDefaultCubeMap =
    !defined(this._specularEnvironmentCubeMap) &&
    defined(frameState.specularEnvironmentMaps) &&
    !this._useDefaultSpecularMaps;
  const recompileWithoutDefaultCubeMap =
    !defined(frameState.specularEnvironmentMaps) &&
    this._useDefaultSpecularMaps;

  const recompileWithDefaultSHCoeffs =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients) &&
    !this._useDefaultSphericalHarmonics;
  const recompileWithoutDefaultSHCoeffs =
    !defined(frameState.sphericalHarmonicCoefficients) &&
    this._useDefaultSphericalHarmonics;

  this._shouldRegenerateShaders =
    this._shouldRegenerateShaders ||
    recompileWithDefaultCubeMap ||
    recompileWithoutDefaultCubeMap ||
    recompileWithDefaultSHCoeffs ||
    recompileWithoutDefaultSHCoeffs;

  this._useDefaultSpecularMaps =
    !defined(this._specularEnvironmentCubeMap) &&
    defined(frameState.specularEnvironmentMaps);
  this._useDefaultSphericalHarmonics =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see ImageBasedLighting#destroy
 * @private
 */
ImageBasedLighting.prototype.isDestroyed = function () {
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
 * @example
 * imageBasedLighting = imageBasedLighting && imageBasedLighting.destroy();
 *
 * @see ImageBasedLighting#isDestroyed
 * @private
 */
ImageBasedLighting.prototype.destroy = function () {
  this._specularEnvironmentCubeMap =
    this._specularEnvironmentCubeMap &&
    this._specularEnvironmentCubeMap.destroy();
  this._removeErrorListener =
    this._removeErrorListener && this._removeErrorListener();
  return destroyObject(this);
};

export default ImageBasedLighting;
