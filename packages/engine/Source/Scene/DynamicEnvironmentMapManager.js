import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import SkyAtmosphere from "./SkyAtmosphere.js";
import ComputeCommand from "../Renderer/ComputeCommand.js";
import Framebuffer from "../Renderer/Framebuffer.js";
import Texture from "../Renderer/Texture.js";
import PixelDatatype from "../Renderer/PixelDatatype";
import PixelFormat from "../Core/PixelFormat";
import Sampler from "../Renderer/Sampler.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import SkyAtmosphereCommon from "../Shaders/SkyAtmosphereCommon.js";
import AtmosphereCommon from "../Shaders/AtmosphereCommon.js";
import ComputeIrradianceMapFS from "../Shaders/ComputeIrradianceMapFS.js";
import ComputeRadianceMapFS from "../Shaders/ComputeRadianceMapFS.js";
import ConvolveSpecularMapFS from "../Shaders/ConvolveSpecularMapFS.js";
import ConvolveSpecularMapVS from "../Shaders/ConvolveSpecularMapVS.js";
import CesiumMath from "../Core/Math.js";
import CubeMap from "../Renderer/CubeMap.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Transforms from "../Core/Transforms.js";
import Matrix4 from "../Core/Matrix4.js";
import JulianDate from "../Core/JulianDate.js";

/**
 * TODO
 */
function DynamicEnvironmentMapManager() {
  this._position = undefined;
  this.enabled = true;

  this._radianceCommandsDirty = true;
  this._radianceMapDirty = true;
  this._convolutionsCommandsDirty = false;
  this._irradianceCommandDirty = false;
  this._irradianceTextureDirty = false;

  this._mipmapLevels = 10; // TODO: get this from texture dimensions (or vice versa);
  this._radianceMapComputeCommands = new Array(6);
  this._convolutionComputeCommands = new Array((this._mipmapLevels - 1) * 6);
  this._irradianceComputeCommand = undefined; // TODO: Clearer naming: Specular and SH?

  this._va = undefined;

  this._radianceMapTextures = new Array(6);
  this._specularMapTextures = new Array(this._mipmapLevels * 6);
  this._radianceMapAtlas = undefined;
  this._radianceCubeMap = undefined;

  this._irradianceMapTexture = undefined;

  this._sphericalHarmonicCoefficientsDirty = true;
  this._sphericalHarmonicCoefficients = new Array(9);

  this._lastTime = new JulianDate();
  this._textureDimensions = new Cartesian2(512, 512);
  
  /**
   * TODO
   */
  this.maximumSecondsDifference = 60 * 20;
}

Object.defineProperties(DynamicEnvironmentMapManager.prototype, {
  /**
   * TODO
   *
   * @memberof DynamicEnvironmentMapManager.prototype
   * @type {Cartesian3|undefined}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      if (
        Cartesian3.equalsEpsilon(value, this._position, CesiumMath.EPSILON8)
      ) {
        return;
      }

      this._position = value;
      this._reset();
    },
  },

  /**
   * Returns a texture containing the computed radiance map, or undefined if it has not yet been created.
   *
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
   * The third order spherical harmonic coefficients used for the diffuse color of image-based lighting.
   * <p>
   * There are nine <code>Cartesian3</code> coefficients.
   * The order of the coefficients is: L<sub>0,0</sub>, L<sub>1,-1</sub>, L<sub>1,0</sub>, L<sub>1,1</sub>, L<sub>2,-2</sub>, L<sub>2,-1</sub>, L<sub>2,0</sub>, L<sub>2,1</sub>, L<sub>2,2</sub>
   * </p>
   *
   *
   * @memberof DynamicEnvironmentMapManager.prototype
   * @readonly
   * @type {Cartesian3[]|undefined}
   * @see {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf|An Efficient Representation for Irradiance Environment Maps}
   * @private
   */
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
  },

  /**
   * The maximum number of mip levels.
   * @memberOf SpecularEnvironmentCubeMap.prototype
   * @type {number}
   * @readonly
   * @private
   */
    maximumMipmapLevel: {
      get: function () {
        return this._mipmapLevels;
      },
    },
});

DynamicEnvironmentMapManager.prototype._reset = function () {
  for (const command of this._radianceMapComputeCommands) {
    if (defined(command)) {
      command.canceled = true;
    }
  }

  for (const command of this._convolutionComputeCommands) {
    if (defined(command)) {
      command.canceled = true;
    }
  }

  if (defined(this._irradianceMapComputeCommand)) {
    this._irradianceMapComputeCommand.canceled = true;
    this._irradianceMapComputeCommand = undefined;
  }
  this._radianceMapDirty = true;
  this._radianceCommandsDirty = true;
};

const scratchCartesian = new Cartesian3();
const scratchSurfacePosition = new Cartesian3();
const scratchMatrix = new Matrix4();

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * build the resources for the environment maps.
 * <p>
 * Do not call this function directly.
 * </p>
 * @private
 */
DynamicEnvironmentMapManager.prototype.update = function (frameState) {
  if (!this.enabled || !defined(this._position)) {
    return false;
  }

  if (!JulianDate.equalsEpsilon(frameState.time, this._lastTime, this.maximumSecondsDifference)) {
    this._reset();
    this._lastTime = JulianDate.clone(frameState.time, this._lastTime);
  }

  const context = frameState.context;
  const textureDimensions = this._textureDimensions;
  const pixelFormat = PixelFormat.RGBA;
  const pixelDatatype = PixelDatatype.UNSIGNED_BYTE;
  const position = this._position;

  const ellipsoid = frameState.mapProjection.ellipsoid;
  const surfacePosition = ellipsoid.scaleToGeodeticSurface(position, scratchSurfacePosition);
  const outerEllipsoidScale = 1.025;

  // outer radius, inner radius, dynamic atmosphere color flag
  const radiiAndDynamicAtmosphereColor = new Cartesian3();
  const radius = Cartesian3.magnitude(surfacePosition);
  radiiAndDynamicAtmosphereColor.x =
    radius * outerEllipsoidScale;
  radiiAndDynamicAtmosphereColor.y = radius;

  // Toggles whether the sun position is used. 0 treats the sun as always directly overhead.
  radiiAndDynamicAtmosphereColor.z = 1;

  const skyAtmosphere = new SkyAtmosphere(ellipsoid); // TODO

  if (this._radianceMapDirty) {
    if (!defined(this._radianceCubeMap)) {
      this._radianceCubeMap = new CubeMap({
        context: context,
        width: textureDimensions.x,
        height: textureDimensions.y,
        pixelFormat: pixelFormat,
        pixelDatatype: pixelDatatype,
      });
    }

    if (this._radianceCommandsDirty) {
      const fs = new ShaderSource({
        sources: [AtmosphereCommon, SkyAtmosphereCommon, ComputeRadianceMapFS],
      });

      let i = 0;
      for (const face of this._radianceCubeMap.faces()) {
        const texture = (this._radianceMapTextures[i] = new Texture({
          context: context,
          width: textureDimensions.x,
          height: textureDimensions.y,
          pixelDatatype: pixelDatatype,
          pixelFormat: pixelFormat,
        })); // TODO: Don't recreate the textures

        const index = i;
        const command = new ComputeCommand({
          fragmentShaderSource: fs,
          outputTexture: texture,
          uniformMap: {
            u_radiiAndDynamicAtmosphereColor: () => {
              return radiiAndDynamicAtmosphereColor;
            },
            u_atmosphereLightIntensity: () => {
              return skyAtmosphere.atmosphereLightIntensity;
            },
            u_atmosphereRayleighCoefficient: () => {
              return skyAtmosphere.atmosphereRayleighCoefficient;
            },
            u_atmosphereMieCoefficient: () => {
              return skyAtmosphere.atmosphereMieCoefficient;
            },
            u_atmosphereRayleighScaleHeight: () => {
              return skyAtmosphere.atmosphereRayleighScaleHeight;
            },
            u_atmosphereMieScaleHeight: () => {
              return skyAtmosphere.atmosphereMieScaleHeight;
            },
            u_atmosphereMieAnisotropy: () => {
              return skyAtmosphere.atmosphereMieAnisotropy;
            },
            u_enuToFixedFrame: () => {
                return Transforms.eastNorthUpToFixedFrame(this._position, ellipsoid, scratchMatrix);
            },
            u_faceDirection: () => {
              return this._radianceCubeMap.getDirection(face, scratchCartesian);
            },
            u_positionWC: () => {
              return position;
            },
          },
          persists: false,
          owner: this,
          postExecute: () => {
            const commands = this._radianceMapComputeCommands;
            commands[index] = undefined;

            const framebuffer = new Framebuffer({
              context: context,
              colorTextures: [this._radianceMapTextures[index]],
              destroyAttachments: false,
            });

            framebuffer._bind();
            face.copyFromFramebuffer();
            framebuffer._unBind();
            framebuffer.destroy();

            if (!commands.some(defined)) {
              this._radianceMapDirty = false;
              this._convolutionsCommandsDirty = true;
            }
          },
        });
        frameState.commandList.push(command);
        this._radianceMapComputeCommands[i] = command;
        i++;
        this._radianceCommandsDirty = false;
      }
    }

    return false;
  }

  const mipmapLevels = this._mipmapLevels;
  if (this._convolutionsCommandsDirty) {
    let width = textureDimensions.x / 2;
    let height = textureDimensions.y / 2;
    this._radianceCubeMap.generateMipmap();

    let facesCopied = 0;
    for (let level = 1; level < mipmapLevels; ++level) { 
      for (const [faceIndex, face] of CubeMap.faceNames.entries()) {
        const w = width;
        const h = height;
        const index = level * 6 + faceIndex;
        const texture = (this._specularMapTextures[index] = new Texture({
          context: context,
          width: w,
          height: h,
          pixelDatatype: pixelDatatype,
          pixelFormat: pixelFormat,
        }));

        let vertexArray = this._va;
        if (!defined(vertexArray)) {
          vertexArray = CubeMap.createVertexArray(context, face);
          this._va = vertexArray;
        }

        let shaderProgram = this._sp;
        if (!defined(shaderProgram)) {
          shaderProgram = this._sp = ShaderProgram.fromCache({
            context: context,
            vertexShaderSource: ConvolveSpecularMapVS,
            fragmentShaderSource: ConvolveSpecularMapFS,
            attributeLocations: {
              positions: 0,
            },
          });
        }

        const command = new ComputeCommand({
          shaderProgram: shaderProgram,
          vertexArray: vertexArray,
          outputTexture: texture,
          persists: true,
              owner: this,
              uniformMap: {
                u_roughness: () => {
                  return level / (mipmapLevels - 1);
                },
                u_radianceTexture: () => {
                  return this._radianceCubeMap;
                },
                u_faceDirection: () => {
                  return CubeMap.getDirection(face, scratchCartesian);
                },
              },
              // eslint-disable-next-line no-loop-func
              postExecute: () => {
                const commands = this._convolutionComputeCommands;
                commands[index] = undefined;

                this._radianceCubeMap.copyFace(frameState, texture, face, level);

                // TODO: Can we re-used the cubemaps instead?
                // this._specularMapTextures[level].destroy();
                // this._specularMapTextures[level] = undefined;

                facesCopied++;

                if (facesCopied === 6 * (mipmapLevels - 1)) {
                  this._irradianceCommandDirty = true;
                  this._radianceCubeMap.sampler = new Sampler({
                      minificationFilter: TextureMinificationFilter.LINEAR_MIPMAP_LINEAR
                  });
                }
              }
        });
        this._convolutionComputeCommands[index] = command;
        frameState.commandList.push(command);
      }

      width /= 2;
      height /= 2;
    }
    this._convolutionsCommandsDirty = false;
    return false;
  }

  if (this._irradianceCommandDirty) {
    const dimensions = new Cartesian2(3, 3); // 9 coefficients
    const texture = new Texture({
      context: context,
      width: dimensions.x,
      height: dimensions.y,
      pixelDatatype: PixelDatatype.FLOAT,
      pixelFormat: pixelFormat,
    });
    this._irradianceMapTexture = texture;
    const fs = new ShaderSource({
      sources: [ComputeIrradianceMapFS],
    });
    const command = new ComputeCommand({
      fragmentShaderSource: fs,
      outputTexture: texture,
      uniformMap: {
        u_radianceMap: () => {
          return this._radianceCubeMap;
        },
      },
      postExecute: () => {
        this._irradianceTextureDirty = false;
        this._irradianceComputeCommand = undefined;
        this._sphericalHarmonicCoefficientsDirty = true;
      },
    });
    this._irradianceComputeCommand = command;
    frameState.commandList.push(command);
    this._irradianceCommandDirty = false;
    this._irradianceTextureDirty = true;
  }

  if (this._irradianceTextureDirty) {
    return false;
  }

  if (this._sphericalHarmonicCoefficientsDirty && defined(this._irradianceMapTexture)) {
    const framebuffer = new Framebuffer({
      context: context,
      colorTextures: [this._irradianceMapTexture],
      destroyAttachments: false,
    });
    const data = context.readPixels({
        x: 0,
        y: 0,
        width: 3,
        height: 3,
        framebuffer: framebuffer,
      });

    for (let i = 0; i < 9; ++i) {
      this._sphericalHarmonicCoefficients[i] = Cartesian3.unpack(data, i * 4);
    }

    framebuffer.destroy();
    this._sphericalHarmonicCoefficientsDirty = false;
    return true;
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
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
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * mapManager = mapManager && mapManager.destroy();
 *
 * @see DynamicEnvironmentMapManager#isDestroyed
 */
DynamicEnvironmentMapManager.prototype.destroy = function () {
  return destroyObject(this);
};

export default DynamicEnvironmentMapManager;