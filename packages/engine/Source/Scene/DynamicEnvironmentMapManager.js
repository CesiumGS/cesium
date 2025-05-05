import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import JulianDate from "../Core/JulianDate.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelFormat from "../Core/PixelFormat.js";
import SceneMode from "./SceneMode.js";
import Transforms from "../Core/Transforms.js";
import ComputeCommand from "../Renderer/ComputeCommand.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import CubeMap from "../Renderer/CubeMap.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import Texture from "../Renderer/Texture.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import Atmosphere from "./Atmosphere.js";
import DynamicAtmosphereLightingType from "./DynamicAtmosphereLightingType.js";
import AtmosphereCommon from "../Shaders/AtmosphereCommon.js";
import ComputeIrradianceFS from "../Shaders/ComputeIrradianceFS.js";
import ComputeRadianceMapFS from "../Shaders/ComputeRadianceMapFS.js";
import ConvolveSpecularMapFS from "../Shaders/ConvolveSpecularMapFS.js";
import ConvolveSpecularMapVS from "../Shaders/ConvolveSpecularMapVS.js";

/**
 * @typedef {object} DynamicEnvironmentMapManager.ConstructorOptions
 * Options for the DynamicEnvironmentMapManager constructor
 * @property {boolean} [enabled=true] If true, the environment map and related properties will continue to update.
 * @property {number} [mipmapLevels=7] The number of mipmap levels to generate for specular maps. More mipmap levels will produce a higher resolution specular reflection.
 * @property {number} [maximumSecondsDifference=3600] The maximum amount of elapsed seconds before a new environment map is created.
 * @property {number} [maximumPositionEpsilon=1000] The maximum difference in position before a new environment map is created, in meters. Small differences in position will not visibly affect results.
 * @property {number} [atmosphereScatteringIntensity=2.0] The intensity of the scattered light emitted from the atmosphere. This should be adjusted relative to the value of {@link Scene.light} intensity.
 * @property {number} [gamma=1.0] The gamma correction to apply to the range of light emitted from the environment. 1.0 uses the unmodified emitted light color.
 * @property {number} [brightness=1.0] The brightness of light emitted from the environment. 1.0 uses the unmodified emitted environment color. Less than 1.0 makes the light darker while greater than 1.0 makes it brighter.
 * @property {number} [saturation=1.0] The saturation of the light emitted from the environment. 1.0 uses the unmodified emitted environment color. Less than 1.0 reduces the saturation while greater than 1.0 increases it.
 * @property {Color} [groundColor=DynamicEnvironmentMapManager.AVERAGE_EARTH_GROUND_COLOR] Solid color used to represent the ground.
 * @property {number} [groundAlbedo=0.31] The percentage of light reflected from the ground. The average earth albedo is 0.31.
 */

/**
 * Generates an environment map at the given position based on scene's current lighting conditions. From this, it produces multiple levels of specular maps and spherical harmonic coefficients than can be used with {@link ImageBasedLighting} for models or tilesets.
 * @alias DynamicEnvironmentMapManager
 * @constructor
 * @param {DynamicEnvironmentMapManager.ConstructorOptions} [options] An object describing initialization options.
 *
 * @example
 * // Enable time-of-day environment mapping in a scene
 * scene.atmosphere.dynamicLighting = Cesium.DynamicAtmosphereLightingType.SUNLIGHT;
 *
 * // Decrease the directional lighting contribution
 * scene.light.intensity = 0.5
 *
 * // Increase the intensity of of the environment map lighting contribution
 * const environmentMapManager = tileset.environmentMapManager;
 * environmentMapManager.atmosphereScatteringIntensity = 3.0;
 *
 * @example
 * // Change the ground color used for a model's environment map to a forest green
 * const environmentMapManager = model.environmentMapManager;
 * environmentMapManager.groundColor = Cesium.Color.fromCssColorString("#203b34");
 */
function DynamicEnvironmentMapManager(options) {
  this._position = undefined;

  this._radianceMapDirty = false;
  this._radianceCommandsDirty = false;
  this._convolutionsCommandsDirty = false;
  this._irradianceCommandDirty = false;
  this._irradianceTextureDirty = false;
  this._sphericalHarmonicCoefficientsDirty = false;

  this._shouldRegenerateShaders = false;
  this._shouldReset = false;

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const mipmapLevels = Math.min(
    defaultValue(options.mipmapLevels, 7),
    Math.log2(ContextLimits.maximumCubeMapSize),
  );

  this._mipmapLevels = mipmapLevels;
  this._radianceMapComputeCommands = new Array(6);
  this._convolutionComputeCommands = new Array((mipmapLevels - 1) * 6);
  this._irradianceComputeCommand = undefined;

  this._radianceMapFS = undefined;
  this._irradianceMapFS = undefined;
  this._convolveSP = undefined;
  this._va = undefined;

  this._radianceMapTextures = new Array(6);
  this._specularMapTextures = new Array((mipmapLevels - 1) * 6);
  this._radianceCubeMap = undefined;
  this._irradianceMapTexture = undefined;

  this._sphericalHarmonicCoefficients =
    DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS.slice();

  this._lastTime = new JulianDate();
  const width = Math.pow(2, mipmapLevels - 1);
  this._textureDimensions = new Cartesian2(width, width);

  this._radiiAndDynamicAtmosphereColor = new Cartesian3();
  this._sceneEnvironmentMap = undefined;
  this._backgroundColor = undefined;

  // If this DynamicEnvironmentMapManager has an owner, only its owner should update or destroy it.
  // This is because in a Cesium3DTileset multiple models may reference one tileset's DynamicEnvironmentMapManager.
  this._owner = undefined;

  /**
   * If true, the environment map and related properties will continue to update.
   * @type {boolean}
   * @default true
   */
  this.enabled = defaultValue(options.enabled, true);

  /**
   * Disables updates. For internal use.
   * @private
   * @default true
   */
  this.shouldUpdate = true;

  /**
   * The maximum amount of elapsed seconds before a new environment map is created.
   * @type {number}
   * @default 3600
   */
  this.maximumSecondsDifference = defaultValue(
    options.maximumSecondsDifference,
    60 * 60,
  );

  /**
   * The maximum difference in position before a new environment map is created, in meters. Small differences in position will not visibly affect results.
   * @type {number}
   * @default 1000
   */
  this.maximumPositionEpsilon = defaultValue(
    options.maximumPositionEpsilon,
    1000.0,
  );

  /**
   * The intensity of the scattered light emitted from the atmosphere. This should be adjusted relative to the value of {@link Scene.light} intensity.
   * @type {number}
   * @default 2.0
   * @see DirectionalLight.intensity
   * @see SunLight.intensity
   */
  this.atmosphereScatteringIntensity = defaultValue(
    options.atmosphereScatteringIntensity,
    2.0,
  );

  /**
   * The gamma correction to apply to the range of light emitted from the environment. 1.0 uses the unmodified incoming light color.
   * @type {number}
   * @default 1.0
   */
  this.gamma = defaultValue(options.gamma, 1.0);

  /**
   * The brightness of light emitted from the environment. 1.0 uses the unmodified emitted environment color. Less than 1.0
   * makes the light darker while greater than 1.0 makes it brighter.
   * @type {number}
   * @default 1.0
   */
  this.brightness = defaultValue(options.brightness, 1.0);

  /**
   * The saturation of the light emitted from the environment. 1.0 uses the unmodified emitted environment color. Less than 1.0 reduces the
   * saturation while greater than 1.0 increases it.
   * @type {number}
   * @default 1.0
   */
  this.saturation = defaultValue(options.saturation, 1.0);

  /**
   * Solid color used to represent the ground.
   * @type {Color}
   * @default DynamicEnvironmentMapManager.AVERAGE_EARTH_GROUND_COLOR
   */
  this.groundColor = defaultValue(
    options.groundColor,
    DynamicEnvironmentMapManager.AVERAGE_EARTH_GROUND_COLOR,
  );

  /**
   * The percentage of light reflected from the ground. The average earth albedo is 0.31.
   * @type {number}
   * @default 0.31
   */
  this.groundAlbedo = defaultValue(options.groundAlbedo, 0.31);
}

Object.defineProperties(DynamicEnvironmentMapManager.prototype, {
  /**
   * A reference to the DynamicEnvironmentMapManager's owner, if any.
   * @memberof DynamicEnvironmentMapManager.prototype
   * @type {object|undefined}
   * @readonly
   * @private
   */
  owner: {
    get: function () {
      return this._owner;
    },
  },

  /**
   * True if model shaders need to be regenerated to account for updates.
   * @memberof DynamicEnvironmentMapManager.prototype
   * @type {boolean}
   * @readonly
   * @private
   */
  shouldRegenerateShaders: {
    get: function () {
      return this._shouldRegenerateShaders;
    },
  },

  /**
   * The position around which the environment map is generated.
   * @memberof DynamicEnvironmentMapManager.prototype
   * @type {Cartesian3|undefined}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      if (
        Cartesian3.equalsEpsilon(
          value,
          this._position,
          0.0,
          this.maximumPositionEpsilon,
        )
      ) {
        return;
      }

      this._position = Cartesian3.clone(value, this._position);
      this._shouldReset = true;
    },
  },

  /**
   * The computed radiance map, or <code>undefined</code> if it has not yet been created.
   * @memberof DynamicEnvironmentMapManager.prototype
   * @type {CubeMap|undefined}
   * @readonly
   * @private
   */
  radianceCubeMap: {
    get: function () {
      return this._radianceCubeMap;
    },
  },

  /**
   * The maximum number of mip levels available in the radiance cubemap.
   * @memberof DynamicEnvironmentMapManager.prototype
   * @type {number}
   * @readonly
   * @private
   */
  maximumMipmapLevel: {
    get: function () {
      return this._mipmapLevels;
    },
  },

  /**
   * The third order spherical harmonic coefficients used for the diffuse color of image-based lighting.
   * <p>
   * There are nine <code>Cartesian3</code> coefficients.
   * The order of the coefficients is: L<sub>0,0</sub>, L<sub>1,-1</sub>, L<sub>1,0</sub>, L<sub>1,1</sub>, L<sub>2,-2</sub>, L<sub>2,-1</sub>, L<sub>2,0</sub>, L<sub>2,1</sub>, L<sub>2,2</sub>
   * </p>
   * @memberof DynamicEnvironmentMapManager.prototype
   * @readonly
   * @type {Cartesian3[]}
   * @see {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf|An Efficient Representation for Irradiance Environment Maps}
   * @private
   */
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
  },
});

// Internally manage a queue of commands across all instances to prevent too many commands from being added in a single frame and using too much memory at once.
DynamicEnvironmentMapManager._maximumComputeCommandCount = 8; // This value is updated once a context is created.
DynamicEnvironmentMapManager._activeComputeCommandCount = 0;
DynamicEnvironmentMapManager._nextFrameCommandQueue = [];
/**
 * Add a command to the queue. If possible, it will be added to the list of commands for the next frame. Otherwise, it will be added to a backlog
 * and attempted next frame.
 * @private
 * @param {ComputeCommand} command The created command
 * @param {FrameState} frameState The current frame state
 */
DynamicEnvironmentMapManager._queueCommand = (command, frameState) => {
  if (
    DynamicEnvironmentMapManager._activeComputeCommandCount >=
    DynamicEnvironmentMapManager._maximumComputeCommandCount
  ) {
    // Command will instead be scheduled next frame
    DynamicEnvironmentMapManager._nextFrameCommandQueue.push(command);
    return;
  }

  frameState.commandList.push(command);
  DynamicEnvironmentMapManager._activeComputeCommandCount++;
};
/**
 * If there are any backlogged commands, queue up as many as possible for the next frame.
 * @private
 * @param {FrameState} frameState The current frame state
 */
DynamicEnvironmentMapManager._updateCommandQueue = (frameState) => {
  DynamicEnvironmentMapManager._maximumComputeCommandCount = Math.log2(
    ContextLimits.maximumCubeMapSize,
  ); // Scale relative to GPU resources available

  if (
    DynamicEnvironmentMapManager._nextFrameCommandQueue.length > 0 &&
    DynamicEnvironmentMapManager._activeComputeCommandCount <
      DynamicEnvironmentMapManager._maximumComputeCommandCount
  ) {
    let command = DynamicEnvironmentMapManager._nextFrameCommandQueue.shift();
    while (
      defined(command) &&
      DynamicEnvironmentMapManager._activeComputeCommandCount <
        DynamicEnvironmentMapManager._maximumComputeCommandCount
    ) {
      if (command.owner.isDestroyed() || command.canceled) {
        command = DynamicEnvironmentMapManager._nextFrameCommandQueue.shift();
        continue;
      }

      frameState.commandList.push(command);
      DynamicEnvironmentMapManager._activeComputeCommandCount++;
      command = DynamicEnvironmentMapManager._nextFrameCommandQueue.shift();
    }

    if (defined(command)) {
      DynamicEnvironmentMapManager._nextFrameCommandQueue.push(command);
    }
  }
};

/**
 * Sets the owner for the input DynamicEnvironmentMapManager if there wasn't another owner.
 * Destroys the owner's previous DynamicEnvironmentMapManager if setting is successful.
 * @param {DynamicEnvironmentMapManager} [environmentMapManager] A DynamicEnvironmentMapManager (or undefined) being attached to an object
 * @param {object} owner An Object that should receive the new DynamicEnvironmentMapManager
 * @param {string} key The Key for the Object to reference the DynamicEnvironmentMapManager
 * @private
 */
DynamicEnvironmentMapManager.setOwner = function (
  environmentMapManager,
  owner,
  key,
) {
  // Don't destroy the DynamicEnvironmentMapManager if it's already owned by newOwner
  if (environmentMapManager === owner[key]) {
    return;
  }
  // Destroy the existing DynamicEnvironmentMapManager, if any
  owner[key] = owner[key] && owner[key].destroy();
  if (defined(environmentMapManager)) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(environmentMapManager._owner)) {
      throw new DeveloperError(
        "DynamicEnvironmentMapManager should only be assigned to one object",
      );
    }
    //>>includeEnd('debug');
    environmentMapManager._owner = owner;
    owner[key] = environmentMapManager;
  }
};

/**
 * Cancels any in-progress commands and marks the environment map as dirty.
 * @private
 */
DynamicEnvironmentMapManager.prototype.reset = function () {
  let length = this._radianceMapComputeCommands.length;
  for (let i = 0; i < length; ++i) {
    if (defined(this._radianceMapComputeCommands[i])) {
      this._radianceMapComputeCommands[i].canceled = true;
    }
    this._radianceMapComputeCommands[i] = undefined;
  }

  length = this._convolutionComputeCommands.length;
  for (let i = 0; i < length; ++i) {
    if (defined(this._convolutionComputeCommands[i])) {
      this._convolutionComputeCommands[i].canceled = true;
    }
    this._convolutionComputeCommands[i] = undefined;
  }

  if (defined(this._irradianceComputeCommand)) {
    this._irradianceComputeCommand.canceled = true;
    this._irradianceComputeCommand = undefined;
  }

  this._radianceMapDirty = true;
  this._radianceCommandsDirty = true;
  this._convolutionsCommandsDirty = false;
  this._irradianceCommandDirty = false;
};

const scratchPackedAtmosphere = new Cartesian3();
const scratchSurfacePosition = new Cartesian3();

/**
 * Update atmosphere properties and returns true if the environment map needs to be regenerated.
 * @param {DynamicEnvironmentMapManager} manager this manager
 * @param {FrameState} frameState the current frameState
 * @returns {boolean} true if the environment map needs to be regenerated.
 * @private
 */
function atmosphereNeedsUpdate(manager, frameState) {
  const position = manager._position;
  const atmosphere = frameState.atmosphere;

  const ellipsoid = frameState.mapProjection.ellipsoid;
  const surfacePosition = ellipsoid.scaleToGeodeticSurface(
    position,
    scratchSurfacePosition,
  );
  const outerEllipsoidScale = 1.025;

  // Pack outer radius, inner radius, and dynamic atmosphere flag
  const radiiAndDynamicAtmosphereColor = scratchPackedAtmosphere;
  const radius = defined(surfacePosition)
    ? Cartesian3.magnitude(surfacePosition)
    : ellipsoid.maximumRadius;
  radiiAndDynamicAtmosphereColor.x = radius * outerEllipsoidScale;
  radiiAndDynamicAtmosphereColor.y = radius;
  radiiAndDynamicAtmosphereColor.z = atmosphere.dynamicLighting;

  if (
    !Cartesian3.equalsEpsilon(
      manager._radiiAndDynamicAtmosphereColor,
      radiiAndDynamicAtmosphereColor,
    ) ||
    frameState.environmentMap !== manager._sceneEnvironmentMap ||
    frameState.backgroundColor !== manager._backgroundColor
  ) {
    Cartesian3.clone(
      radiiAndDynamicAtmosphereColor,
      manager._radiiAndDynamicAtmosphereColor,
    );
    manager._sceneEnvironmentMap = frameState.environmentMap;
    manager._backgroundColor = frameState.backgroundColor;
    return true;
  }

  return false;
}

const scratchCartesian = new Cartesian3();
const scratchMatrix = new Matrix4();
const scratchAdjustments = new Cartesian4();
const scratchColor = new Color();

/**
 * Renders the highest resolution specular map by creating compute commands for each cube face
 * @param {DynamicEnvironmentMapManager} manager this manager
 * @param {FrameState} frameState the current frameState
 * @private
 */
function updateRadianceMap(manager, frameState) {
  const context = frameState.context;
  const textureDimensions = manager._textureDimensions;

  if (!defined(manager._radianceCubeMap)) {
    manager._radianceCubeMap = new CubeMap({
      context: context,
      width: textureDimensions.x,
      height: textureDimensions.y,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      pixelFormat: PixelFormat.RGBA,
    });
  }

  if (manager._radianceCommandsDirty) {
    let fs = manager._radianceMapFS;
    if (!defined(fs)) {
      fs = new ShaderSource({
        sources: [AtmosphereCommon, ComputeRadianceMapFS],
      });
      manager._radianceMapFS = fs;
    }

    if (Atmosphere.requiresColorCorrect(frameState.atmosphere)) {
      fs.defines.push("ATMOSPHERE_COLOR_CORRECT");
    }

    const position = manager._position;
    const radiiAndDynamicAtmosphereColor =
      manager._radiiAndDynamicAtmosphereColor;

    const ellipsoid = frameState.mapProjection.ellipsoid;
    const enuToFixedFrame = Transforms.eastNorthUpToFixedFrame(
      position,
      ellipsoid,
      scratchMatrix,
    );

    const adjustments = scratchAdjustments;

    adjustments.x = manager.brightness;
    adjustments.y = manager.saturation;
    adjustments.z = manager.gamma;
    adjustments.w = manager.atmosphereScatteringIntensity;

    if (
      manager.brightness !== 1.0 ||
      manager.saturation !== 1.0 ||
      manager.gamma !== 1.0
    ) {
      fs.defines.push("ENVIRONMENT_COLOR_CORRECT");
    }

    let i = 0;
    for (const face of CubeMap.faceNames()) {
      let texture = manager._radianceMapTextures[i];
      // Destroy any existing textures that have no yet been cleaned up
      if (defined(texture) && !texture.isDestroyed()) {
        texture.destroy();
      }

      texture = new Texture({
        context: context,
        width: textureDimensions.x,
        height: textureDimensions.y,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        pixelFormat: PixelFormat.RGBA,
      });
      manager._radianceMapTextures[i] = texture;

      const index = i;
      const command = new ComputeCommand({
        fragmentShaderSource: fs,
        outputTexture: texture,
        uniformMap: {
          u_radiiAndDynamicAtmosphereColor: () =>
            radiiAndDynamicAtmosphereColor,
          u_enuToFixedFrame: () => enuToFixedFrame,
          u_faceDirection: () => CubeMap.getDirection(face, scratchCartesian),
          u_positionWC: () => position,
          u_brightnessSaturationGammaIntensity: () => adjustments,
          u_groundColor: () => {
            return manager.groundColor.withAlpha(
              manager.groundAlbedo,
              scratchColor,
            );
          },
        },
        owner: manager,
      });
      command.postExecute = () => {
        if (manager.isDestroyed() || command.canceled) {
          DynamicEnvironmentMapManager._activeComputeCommandCount--;
          return;
        }

        const commands = manager._radianceMapComputeCommands;
        commands[index] = undefined;

        const framebuffer = new Framebuffer({
          context: context,
          colorTextures: [manager._radianceMapTextures[index]],
        });

        // Copy the output texture into the corresponding cubemap face
        framebuffer._bind();
        manager._radianceCubeMap[face].copyFromFramebuffer();
        framebuffer._unBind();
        framebuffer.destroy();

        DynamicEnvironmentMapManager._activeComputeCommandCount--;

        if (!commands.some(defined)) {
          manager._convolutionsCommandsDirty = true;
          manager._shouldRegenerateShaders = true;
        }
      };

      manager._radianceMapComputeCommands[i] = command;
      DynamicEnvironmentMapManager._queueCommand(command, frameState);
      i++;
    }
    manager._radianceCommandsDirty = false;
  }
}

/**
 * Creates a mipmap chain for the cubemap by convolving the environment map for each roughness level
 * @param {DynamicEnvironmentMapManager} manager this manager
 * @param {FrameState} frameState the current frameState
 * @private
 */
function updateSpecularMaps(manager, frameState) {
  const radianceCubeMap = manager._radianceCubeMap;
  radianceCubeMap.generateMipmap();

  const mipmapLevels = manager._mipmapLevels;
  const textureDimensions = manager._textureDimensions;
  let width = textureDimensions.x / 2;
  let height = textureDimensions.y / 2;
  const context = frameState.context;

  let facesCopied = 0;
  const getPostExecute = (command, index, texture, face, level) => () => {
    if (manager.isDestroyed() || command.canceled) {
      DynamicEnvironmentMapManager._activeComputeCommandCount--;
      return;
    }

    // Copy output texture to corresponding face and mipmap level
    const commands = manager._convolutionComputeCommands;
    commands[index] = undefined;

    radianceCubeMap.copyFace(frameState, texture, face, level);
    facesCopied++;
    DynamicEnvironmentMapManager._activeComputeCommandCount--;

    texture.destroy();
    manager._specularMapTextures[index] = undefined;

    // All faces for each mipmap level have been copied
    const length = manager._specularMapTextures.length;
    if (facesCopied >= length) {
      manager._irradianceCommandDirty = true;
      radianceCubeMap.sampler = new Sampler({
        minificationFilter: TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
      });

      manager._shouldRegenerateShaders = true;

      // Cleanup shared resources
      manager._va.destroy();
      manager._va = undefined;
      manager._convolveSP.destroy();
      manager._convolveSP = undefined;
    }
  };

  let index = 0;
  for (let level = 1; level < mipmapLevels; ++level) {
    for (const face of CubeMap.faceNames()) {
      if (defined(manager._specularMapTextures[index])) {
        manager._specularMapTextures[index].destroy();
      }

      const texture = (manager._specularMapTextures[index] = new Texture({
        context: context,
        width: width,
        height: height,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        pixelFormat: PixelFormat.RGBA,
      }));

      let vertexArray = manager._va;
      if (!defined(vertexArray)) {
        vertexArray = CubeMap.createVertexArray(context, face);
        manager._va = vertexArray;
      }

      let shaderProgram = manager._convolveSP;
      if (!defined(shaderProgram)) {
        shaderProgram = ShaderProgram.fromCache({
          context: context,
          vertexShaderSource: ConvolveSpecularMapVS,
          fragmentShaderSource: ConvolveSpecularMapFS,
          attributeLocations: {
            positions: 0,
          },
        });
        manager._convolveSP = shaderProgram;
      }

      const command = new ComputeCommand({
        shaderProgram: shaderProgram,
        vertexArray: vertexArray,
        outputTexture: texture,
        // Persist so we can use a shared shader progam and vertex array across all commands
        // Shared resources are instead destroyed in postExecute
        persists: true,
        owner: manager,
        uniformMap: {
          u_roughness: () => level / (mipmapLevels - 1),
          u_radianceTexture: () => radianceCubeMap ?? context.defaultTexture,
          u_faceDirection: () => {
            return CubeMap.getDirection(face, scratchCartesian);
          },
        },
      });
      command.postExecute = getPostExecute(
        command,
        index,
        texture,
        face,
        level,
      );
      manager._convolutionComputeCommands[index] = command;
      DynamicEnvironmentMapManager._queueCommand(command, frameState);
      ++index;
    }

    width /= 2;
    height /= 2;
  }
}

const irradianceTextureDimensions = new Cartesian2(3, 3); // 9 coefficients

/**
 * Computes spherical harmonic coefficients by convolving the environment map.
 * @param {DynamicEnvironmentMapManager} manager this manager
 * @param {FrameState} frameState the current frameState
 * @private
 */
function updateIrradianceResources(manager, frameState) {
  const context = frameState.context;
  const dimensions = irradianceTextureDimensions;

  let texture = manager._irradianceMapTexture;
  if (defined(texture) && !texture.isDestroyed()) {
    texture.destroy();
  }

  texture = new Texture({
    context: context,
    width: dimensions.x,
    height: dimensions.y,
    pixelDatatype: PixelDatatype.FLOAT,
    pixelFormat: PixelFormat.RGBA,
  });
  manager._irradianceMapTexture = texture;

  let fs = manager._irradianceMapFS;
  if (!defined(fs)) {
    fs = new ShaderSource({
      sources: [ComputeIrradianceFS],
    });
    manager._irradianceMapFS = fs;
  }

  const command = new ComputeCommand({
    fragmentShaderSource: fs,
    outputTexture: texture,
    owner: manager,
    uniformMap: {
      u_radianceMap: () => manager._radianceCubeMap ?? context.defaultTexture,
    },
  });

  command.postExecute = () => {
    if (manager.isDestroyed() || command.canceled) {
      DynamicEnvironmentMapManager._activeComputeCommandCount--;
      return;
    }
    manager._irradianceTextureDirty = false;
    manager._irradianceComputeCommand = undefined;
    manager._sphericalHarmonicCoefficientsDirty = true;
    manager._irradianceMapFS = undefined;

    DynamicEnvironmentMapManager._activeComputeCommandCount--;
  };

  manager._irradianceComputeCommand = command;
  DynamicEnvironmentMapManager._queueCommand(command, frameState);
  manager._irradianceTextureDirty = true;
}

/**
 * Copies coefficients from the output texture using readPixels.
 * @param {DynamicEnvironmentMapManager} manager this manager
 * @param {FrameState} frameState the current frameState
 * @private
 */
function updateSphericalHarmonicCoefficients(manager, frameState) {
  const context = frameState.context;

  if (!defined(manager._irradianceMapTexture)) {
    // Operation was canceled
    return;
  }

  const framebuffer = new Framebuffer({
    context: context,
    colorTextures: [manager._irradianceMapTexture],
    destroyAttachments: false,
  });

  const dimensions = irradianceTextureDimensions;
  const data = context.readPixels({
    x: 0,
    y: 0,
    width: dimensions.x,
    height: dimensions.y,
    framebuffer: framebuffer,
  });

  for (let i = 0; i < 9; ++i) {
    manager._sphericalHarmonicCoefficients[i] = Cartesian3.unpack(data, i * 4);
    Cartesian3.multiplyByScalar(
      manager._sphericalHarmonicCoefficients[i],
      manager.atmosphereScatteringIntensity,
      manager._sphericalHarmonicCoefficients[i],
    );
  }

  framebuffer.destroy();
  manager._irradianceMapTexture.destroy();
  manager._irradianceMapTexture = undefined;
  manager._shouldRegenerateShaders = true;
}

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * build the resources for the environment maps.
 * <p>
 * Do not call this function directly.
 * </p>
 * @private
 */
DynamicEnvironmentMapManager.prototype.update = function (frameState) {
  const mode = frameState.mode;
  const isSupported =
    // A FrameState type works here because the function only references the context parameter.
    // @ts-ignore
    DynamicEnvironmentMapManager.isDynamicUpdateSupported(frameState);

  if (
    !isSupported ||
    !this.enabled ||
    !this.shouldUpdate ||
    !defined(this._position) ||
    mode === SceneMode.MORPHING
  ) {
    this._shouldRegenerateShaders = false;
    return;
  }

  DynamicEnvironmentMapManager._updateCommandQueue(frameState);

  const dynamicLighting = frameState.atmosphere.dynamicLighting;
  const regenerateEnvironmentMap =
    atmosphereNeedsUpdate(this, frameState) ||
    (dynamicLighting === DynamicAtmosphereLightingType.SUNLIGHT &&
      !JulianDate.equalsEpsilon(
        frameState.time,
        this._lastTime,
        this.maximumSecondsDifference,
      ));

  if (this._shouldReset || regenerateEnvironmentMap) {
    this.reset();
    this._shouldReset = false;
    this._lastTime = JulianDate.clone(frameState.time, this._lastTime);
    return;
  }

  if (this._radianceMapDirty) {
    updateRadianceMap(this, frameState);
    this._radianceMapDirty = false;
  }

  if (this._convolutionsCommandsDirty) {
    updateSpecularMaps(this, frameState);
    this._convolutionsCommandsDirty = false;
  }

  if (this._irradianceCommandDirty) {
    updateIrradianceResources(this, frameState);
    this._irradianceCommandDirty = false;
  }

  if (this._irradianceTextureDirty) {
    this._shouldRegenerateShaders = false;
    return;
  }

  if (this._sphericalHarmonicCoefficientsDirty) {
    updateSphericalHarmonicCoefficients(this, frameState);
    this._sphericalHarmonicCoefficientsDirty = false;
    return;
  }

  this._shouldRegenerateShaders = false;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 * @see DynamicEnvironmentMapManager#destroy
 */
DynamicEnvironmentMapManager.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * @throws {DeveloperError} This object was destroyed, i.e., destroy() was called.
 * @example
 * mapManager = mapManager && mapManager.destroy();
 * @see DynamicEnvironmentMapManager#isDestroyed
 */
DynamicEnvironmentMapManager.prototype.destroy = function () {
  // Cancel in-progress commands
  let length = this._radianceMapComputeCommands.length;
  for (let i = 0; i < length; ++i) {
    this._radianceMapComputeCommands[i] = undefined;
  }

  length = this._convolutionComputeCommands.length;
  for (let i = 0; i < length; ++i) {
    this._convolutionComputeCommands[i] = undefined;
  }

  this._irradianceMapComputeCommand = undefined;

  // Destroy all textures
  length = this._radianceMapTextures.length;
  for (let i = 0; i < length; ++i) {
    this._radianceMapTextures[i] =
      this._radianceMapTextures[i] &&
      !this._radianceMapTextures[i].isDestroyed() &&
      this._radianceMapTextures[i].destroy();
  }

  length = this._specularMapTextures.length;
  for (let i = 0; i < length; ++i) {
    this._specularMapTextures[i] =
      this._specularMapTextures[i] &&
      !this._specularMapTextures[i].isDestroyed() &&
      this._specularMapTextures[i].destroy();
  }

  this._radianceCubeMap =
    this._radianceCubeMap && this._radianceCubeMap.destroy();
  this._irradianceMapTexture =
    this._irradianceMapTexture &&
    !this._irradianceMapTexture.isDestroyed() &&
    this._irradianceMapTexture.destroy();

  if (defined(this._va)) {
    this._va.destroy();
  }

  if (defined(this._convolveSP)) {
    this._convolveSP.destroy();
  }

  return destroyObject(this);
};

/**
 * Returns <code>true</code> if dynamic updates are supported in the current WebGL rendering context.
 * Dynamic updates requires the EXT_color_buffer_float or EXT_color_buffer_half_float extension.
 *
 * @param {Scene} scene The object containing the rendering context
 * @returns {boolean} true if supported
 */
DynamicEnvironmentMapManager.isDynamicUpdateSupported = function (scene) {
  const context = scene.context;
  return context.halfFloatingPointTexture || context.colorBufferFloat;
};

/**
 * Average hue of ground color on earth, a warm green-gray.
 * @type {Color}
 * @readonly
 */
DynamicEnvironmentMapManager.AVERAGE_EARTH_GROUND_COLOR = Object.freeze(
  Color.fromCssColorString("#717145"),
);

/**
 * The default third order spherical harmonic coefficients used for the diffuse color of image-based lighting, a white ambient light with low intensity.
 * <p>
 * There are nine <code>Cartesian3</code> coefficients.
 * The order of the coefficients is: L<sub>0,0</sub>, L<sub>1,-1</sub>, L<sub>1,0</sub>, L<sub>1,1</sub>, L<sub>2,-2</sub>, L<sub>2,-1</sub>, L<sub>2,0</sub>, L<sub>2,1</sub>, L<sub>2,2</sub>
 * </p>
 * @readonly
 * @type {Cartesian3[]}
 * @see {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf|An Efficient Representation for Irradiance Environment Maps}
 */
DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS =
  Object.freeze([
    Object.freeze(new Cartesian3(0.35449, 0.35449, 0.35449)),
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
    Cartesian3.ZERO,
  ]);

export default DynamicEnvironmentMapManager;
