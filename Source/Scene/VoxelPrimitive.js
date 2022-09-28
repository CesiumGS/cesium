import buildVoxelDrawCommands from "./VoxelDrawCommands.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import Material from "./Material.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";
import PolylineCollection from "./PolylineCollection.js";
import VoxelShapeType from "./VoxelShapeType.js";
import VoxelTraversal from "./VoxelTraversal.js";
import CustomShader from "./Model/CustomShader.js";

/**
 * A primitive that renders voxel data from a {@link VoxelProvider}.
 *
 * @alias VoxelPrimitive
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {VoxelProvider} [options.provider] The voxel provider that supplies the primitive with tile data.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The model matrix used to transform the primitive.
 * @param {CustomShader} [options.customShader] The custom shader used to style the primitive.
 * @param {Clock} [options.clock] The clock used to control time dynamic behavior.
 *
 * @see VoxelProvider
 * @see Cesium3DTilesVoxelProvider
 * @see GltfVoxelProvider
 * @see VoxelShapeType
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function VoxelPrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * @type {Boolean}
   * @private
   */
  this._ready = false;

  /**
   * @type {Promise.<Boolean>}
   * @private
   */
  this._readyPromise = defer();

  /**
   * @type {VoxelProvider}
   * @private
   */
  this._provider = defaultValue(
    options.provider,
    VoxelPrimitive.DefaultProvider
  );

  /**
   * This member is not created until the provider and shape are ready.
   *
   * @type {VoxelTraversal}
   * @private
   */
  this._traversal = undefined;

  /**
   * This member is not created until the provider is ready.
   *
   * @type {VoxelShape}
   * @private
   */
  this._shape = undefined;

  /**
   * @type {Boolean}
   * @private
   */
  this._shapeVisible = false;

  /**
   * This member is not created until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._paddingBefore = new Cartesian3();

  /**
   * This member is not created until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._paddingAfter = new Cartesian3();

  /**
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._minBounds = new Cartesian3();

  /**
   * Used to detect if the shape is dirty.
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._minBoundsOld = new Cartesian3();

  /**
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._maxBounds = new Cartesian3();

  /**
   * Used to detect if the shape is dirty.
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._maxBoundsOld = new Cartesian3();

  /**
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._minClippingBounds = new Cartesian3();

  /**
   * Used to detect if the clipping is dirty.
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._minClippingBoundsOld = new Cartesian3();

  /**
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._maxClippingBounds = new Cartesian3();

  /**
   * Used to detect if the clipping is dirty.
   * This member is not known until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._maxClippingBoundsOld = new Cartesian3();

  /**
   * Clipping planes on the primitive
   *
   * @type {ClippingPlaneCollection}
   * @private
   */
  this._clippingPlanes = undefined;

  /**
   * Keeps track of when the clipping planes change
   *
   * @type {Number}
   * @private
   */
  this._clippingPlanesState = 0;

  /**
   * Keeps track of when the clipping planes are enabled / disabled
   * @type {Boolean}
   * @private
   */
  this._clippingPlanesEnabled = false;

  /**
   * The primitive's model matrix.
   *
   * @type {Matrix4}
   * @private
   */
  this._modelMatrix = defaultValue(
    options.modelMatrix,
    Matrix4.clone(Matrix4.IDENTITY, new Matrix4())
  );

  /**
   * The primitive's model matrix multiplied by the provider's model matrix.
   * This member is not known until the provider is ready.
   *
   * @type {Matrix4}
   * @private
   */
  this._compoundModelMatrix = new Matrix4();

  /**
   * Used to detect if the shape is dirty.
   * This member is not known until the provider is ready.
   *
   * @type {Matrix4}
   * @private
   */
  this._compoundModelMatrixOld = new Matrix4();

  /**
   * @type {CustomShader}
   * @private
   */
  this._customShader = defaultValue(
    options.customShader,
    VoxelPrimitive.DefaultCustomShader
  );

  /**
   * @type {Event}
   * @private
   */
  this._customShaderCompilationEvent = new Event();

  /**
   * @type {Boolean}
   * @private
   */
  this._shaderDirty = true;

  /**
   * @type {DrawCommand}
   * @private
   */
  this._drawCommand = undefined;

  /**
   * @type {DrawCommand}
   * @private
   */
  this._drawCommandPick = undefined;

  /**
   * @type {Object}
   * @private
   */
  this._pickId = undefined;

  /**
   * @type {Clock}
   * @private
   */
  this._clock = options.clock;

  // Transforms and other values that are computed when the shape changes

  /**
   * @type {Matrix4}
   * @private
   */
  this._transformPositionWorldToUv = new Matrix4();

  /**
   * @type {Matrix4}
   * @private
   */
  this._transformPositionUvToWorld = new Matrix4();

  /**
   * @type {Matrix3}
   * @private
   */
  this._transformDirectionWorldToLocal = new Matrix3();

  /**
   * @type {Matrix3}
   * @private
   */
  this._transformNormalLocalToWorld = new Matrix3();

  /**
   * @type {Number}
   * @private
   */
  this._stepSizeUv = 1.0;

  // Rendering
  /**
   * @type {Boolean}
   * @private
   */
  this._jitter = true;

  /**
   * @type {Boolean}
   * @private
   */
  this._nearestSampling = false;

  /**
   * @type {Number}
   * @private
   */
  this._levelBlendFactor = 0.0;

  /**
   * @type {Number}
   * @private
   */
  this._stepSizeMultiplier = 1.0;

  /**
   * @type {Boolean}
   * @private
   */
  this._depthTest = true;

  /**
   * @type {Boolean}
   * @private
   */
  this._useLogDepth = undefined;

  /**
   * @type {Number}
   * @private
   */
  this._screenSpaceError = 4.0; // in pixels

  // Debug / statistics
  /**
   * @type {PolylineCollection}
   * @private
   */
  this._debugPolylines = new PolylineCollection();

  /**
   * @type {Boolean}
   * @private
   */
  this._debugDraw = false;

  /**
   * @type {Boolean}
   * @private
   */
  this._disableRender = false;

  /**
   * @type {Boolean}
   * @private
   */
  this._disableUpdate = false;

  /**
   * @type {Object.<string, any>}
   * @private
   */
  this._uniforms = {
    octreeInternalNodeTexture: undefined,
    octreeInternalNodeTilesPerRow: 0,
    octreeInternalNodeTexelSizeUv: new Cartesian2(),
    octreeLeafNodeTexture: undefined,
    octreeLeafNodeTilesPerRow: 0,
    octreeLeafNodeTexelSizeUv: new Cartesian2(),
    megatextureTextures: [],
    megatextureSliceDimensions: new Cartesian2(),
    megatextureTileDimensions: new Cartesian2(),
    megatextureVoxelSizeUv: new Cartesian2(),
    megatextureSliceSizeUv: new Cartesian2(),
    megatextureTileSizeUv: new Cartesian2(),
    dimensions: new Cartesian3(),
    paddingBefore: new Cartesian3(),
    paddingAfter: new Cartesian3(),
    transformPositionViewToUv: new Matrix4(),
    transformPositionUvToView: new Matrix4(),
    transformDirectionViewToLocal: new Matrix3(),
    transformNormalLocalToWorld: new Matrix3(),
    cameraPositionUv: new Cartesian3(),
    ndcSpaceAxisAlignedBoundingBox: new Cartesian4(),
    clippingPlanesTexture: undefined,
    clippingPlanesMatrix: new Matrix4(),
    stepSize: 0,
    pickColor: new Color(),
  };

  /**
   * Shape specific shader defines from the previous shape update. Used to detect if the shader needs to be rebuilt.
   * @type {Object.<string, any>}
   * @private
   */
  this._shapeDefinesOld = {};

  /**
   * Map uniform names to functions that return the uniform values.
   * @type {Object.<string, function():any>}
   * @private
   */
  this._uniformMap = {};

  const uniforms = this._uniforms;
  const uniformMap = this._uniformMap;
  for (const key in uniforms) {
    if (uniforms.hasOwnProperty(key)) {
      const name = `u_${key}`;
      uniformMap[name] = function () {
        return uniforms[key];
      };
    }
  }

  // If the provider fails to initialize the primitive will fail too.
  const provider = this._provider;
  const primitive = this;
  provider.readyPromise.catch(function (error) {
    primitive._readyPromise.reject(error);
  });
}

Object.defineProperties(VoxelPrimitive.prototype, {
  /**
   * Gets a value indicating whether or not the primitive is ready for use.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets the promise that will be resolved when the primitive is ready for use.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Promise.<VoxelPrimitive>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Gets the {@link VoxelProvider} associated with this primitive.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {VoxelProvider}
   * @readonly
   */
  provider: {
    get: function () {
      return this._provider;
    },
  },

  /**
   * Gets the bounding sphere.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {BoundingSphere}
   * @readonly
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  boundingSphere: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "boundingSphere must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._shape.boundingSphere;
    },
  },

  /**
   * Gets the oriented bounding box.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {OrientedBoundingBox}
   * @readonly
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  orientedBoundingBox: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "orientedBoundingBox must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._shape.orientedBoundingBox;
    },
  },

  /**
   * Gets the model matrix.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Matrix4}
   * @readonly
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (modelMatrix) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("modelMatrix", modelMatrix);
      //>>includeEnd('debug');

      this._modelMatrix = Matrix4.clone(modelMatrix, new Matrix4());
    },
  },

  /**
   * Gets the compound model matrix
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Matrix4}
   * @readonly
   */
  compoundModelMatrix: {
    get: function () {
      return this._compoundModelMatrix;
    },
  },

  /**
   * Gets the shape type.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {VoxelShapeType}
   * @readonly
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  shape: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "shape must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._provider.shape;
    },
  },

  /**
   * Gets the voxel dimensions.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   * @readonly
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  dimensions: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "dimensions must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._provider.dimensions;
    },
  },

  /**
   * Gets the minimum value per channel of the voxel data.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Number[]}
   * @readonly
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  minimumValues: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "minimumValues must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._provider.minimumValues;
    },
  },

  /**
   * Gets the maximum value per channel of the voxel data.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Number[]}
   * @readonly
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  maximumValues: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "maximumValues must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._provider.maximumValues;
    },
  },

  /**
   * Gets or sets whether or not this primitive should be displayed.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   */
  show: {
    get: function () {
      return !this._disableRender;
    },
    set: function (show) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("show", show);
      //>>includeEnd('debug');

      this._disableRender = !show;
    },
  },

  /**
   * Gets or sets whether or not the primitive should update when the view changes.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   */
  disableUpdate: {
    get: function () {
      return this._disableUpdate;
    },
    set: function (disableUpdate) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("disableUpdate", disableUpdate);
      //>>includeEnd('debug');

      this._disableUpdate = disableUpdate;
    },
  },

  /**
   * Gets or sets whether or not to render debug visualizations.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   */
  debugDraw: {
    get: function () {
      return this._debugDraw;
    },
    set: function (debugDraw) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("debugDraw", debugDraw);
      //>>includeEnd('debug');

      this._debugDraw = debugDraw;
    },
  },

  /**
   * Gets or sets whether or not to test against depth when rendering.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   */
  depthTest: {
    get: function () {
      return this._depthTest;
    },
    set: function (depthTest) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("depthTest", depthTest);
      //>>includeEnd('debug');

      if (this._depthTest !== depthTest) {
        this._depthTest = depthTest;
        this._shaderDirty = true;
      }
    },
  },

  /**
   * Gets or sets whether or not to jitter the view ray during the raymarch.
   * This reduces stair-step artifacts but introduces noise.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   */
  jitter: {
    get: function () {
      return this._jitter;
    },
    set: function (jitter) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("jitter", jitter);
      //>>includeEnd('debug');

      if (this._jitter !== jitter) {
        this._jitter = jitter;
        this._shaderDirty = true;
      }
    },
  },

  /**
   * Gets or sets the nearest sampling.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   */
  nearestSampling: {
    get: function () {
      return this._nearestSampling;
    },
    set: function (nearestSampling) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("nearestSampling", nearestSampling);
      //>>includeEnd('debug');

      if (this._nearestSampling !== nearestSampling) {
        this._nearestSampling = nearestSampling;
        this._shaderDirty = true;
      }
    },
  },

  /**
   * Controls how quickly to blend between different levels of the tree.
   * 0.0 means an instantaneous pop.
   * 1.0 means a full linear blend.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Number}
   */
  levelBlendFactor: {
    get: function () {
      return this._levelBlendFactor;
    },
    set: function (levelBlendFactor) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("levelBlendFactor", levelBlendFactor);
      //>>includeEnd('debug');

      this._levelBlendFactor = CesiumMath.clamp(levelBlendFactor, 0.0, 1.0);
    },
  },

  /**
   * Gets or sets the screen space error in pixels. If the screen space size
   * of a voxel is greater than the screen space error, the tile is subdivided.
   * Lower screen space error corresponds with higher detail rendering, but could
   * result in worse performance and higher memory consumption.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Number}
   */
  screenSpaceError: {
    get: function () {
      return this._screenSpaceError;
    },
    set: function (screenSpaceError) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("screenSpaceError", screenSpaceError);
      //>>includeEnd('debug');

      this._screenSpaceError = screenSpaceError;
    },
  },

  /**
   * Gets or sets the step size multiplier used during raymarching.
   * The lower the value, the higher the rendering quality, but
   * also the worse the performance.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Number}
   */
  stepSize: {
    get: function () {
      return this._stepSizeMultiplier;
    },
    set: function (stepSize) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("stepSize", stepSize);
      //>>includeEnd('debug');

      this._stepSizeMultiplier = stepSize;
    },
  },

  /**
   * Gets or sets the minimum bounds. TODO: fill in the rest later
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   */
  minBounds: {
    get: function () {
      return this._minBounds;
    },
    set: function (minBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("minBounds", minBounds);
      //>>includeEnd('debug');

      this._minBounds = Cartesian3.clone(minBounds, this._minBounds);
    },
  },

  /**
   * Gets or sets the maximum bounds. TODO: fill in the rest later.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   */
  maxBounds: {
    get: function () {
      return this._maxBounds;
    },
    set: function (maxBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("maxBounds", maxBounds);
      //>>includeEnd('debug');

      this._maxBounds = Cartesian3.clone(maxBounds, this._maxBounds);
    },
  },

  /**
   * Gets or sets the minimum clipping location in the shape's local coordinate system.
   * Any voxel content outside the range is clipped.
   * The minimum value is 0 and the maximum value is 1.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   */
  minClippingBounds: {
    get: function () {
      return this._minClippingBounds;
    },
    set: function (minClippingBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("minClippingBounds", minClippingBounds);
      //>>includeEnd('debug');

      this._minClippingBounds = Cartesian3.clone(
        minClippingBounds,
        this._minClippingBounds
      );
    },
  },

  /**
   * Gets or sets the maximum clipping location in the shape's local coordinate system.
   * Any voxel content outside the range is clipped.
   * The minimum value is 0 and the maximum value is 1.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   */
  maxClippingBounds: {
    get: function () {
      return this._maxClippingBounds;
    },
    set: function (maxClippingBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("maxClippingBounds", maxClippingBounds);
      //>>includeEnd('debug');

      this._maxClippingBounds = Cartesian3.clone(
        maxClippingBounds,
        this._maxClippingBounds
      );
    },
  },

  /**
   * The {@link ClippingPlaneCollection} used to selectively disable rendering the primitive.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {ClippingPlaneCollection}
   */
  clippingPlanes: {
    get: function () {
      return this._clippingPlanes;
    },
    set: function (clippingPlanes) {
      // Don't need to check if undefined, it's handled in the setOwner function
      ClippingPlaneCollection.setOwner(clippingPlanes, this, "_clippingPlanes");
    },
  },

  /**
   * Gets or sets the custom shader. If undefined, {@link VoxelPrimitive.DefaultCustomShader} is set.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {CustomShader}
   */
  customShader: {
    get: function () {
      return this._customShader;
    },
    set: function (customShader) {
      if (this._customShader !== customShader) {
        // Delete old custom shader entries from the uniform map
        const uniformMap = this._uniformMap;
        const oldCustomShader = this._customShader;
        const oldCustomShaderUniformMap = oldCustomShader.uniformMap;
        for (const uniformName in oldCustomShaderUniformMap) {
          if (oldCustomShaderUniformMap.hasOwnProperty(uniformName)) {
            // If the custom shader was set but the voxel shader was never
            // built, the custom shader uniforms wouldn't have been added to
            // the uniform map. But it doesn't matter because the delete
            // operator ignores if the key doesn't exist.
            delete uniformMap[uniformName];
          }
        }

        if (!defined(customShader)) {
          this._customShader = VoxelPrimitive.DefaultCustomShader;
        } else {
          this._customShader = customShader;
        }
        this._shaderDirty = true;
      }
    },
  },

  /**
   * Gets an event that is raised whenever a custom shader is compiled.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Event}
   * @readonly
   */
  customShaderCompilationEvent: {
    get: function () {
      return this._customShaderCompilationEvent;
    },
  },
});

// TODO 3-channel + 1-channel metadata is a problem right now
// Individually, they both work, but together the 1-channel is messed up

const scratchDimensions = new Cartesian3();
const scratchIntersect = new Cartesian4();
const scratchNdcAabb = new Cartesian4();
const scratchScale = new Cartesian3();
const scratchLocalScale = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchRotationAndLocalScale = new Matrix3();
const scratchTransformPositionWorldToLocal = new Matrix4();
const scratchTransformPositionLocalToWorld = new Matrix4();
const scratchTransformPositionLocalToProjection = new Matrix4();

const transformPositionLocalToUv = Matrix4.fromRotationTranslation(
  Matrix3.fromUniformScale(0.5, new Matrix3()),
  new Cartesian3(0.5, 0.5, 0.5),
  new Matrix4()
);
const transformPositionUvToLocal = Matrix4.fromRotationTranslation(
  Matrix3.fromUniformScale(2.0, new Matrix3()),
  new Cartesian3(-1.0, -1.0, -1.0),
  new Matrix4()
);

/**
 * Updates the voxel primitive.
 * @function
 *
 * @param {FrameState} frameState
 * @private
 */
VoxelPrimitive.prototype.update = function (frameState) {
  // Update the provider, if applicable.
  const provider = this._provider;
  if (defined(provider.update)) {
    provider.update(frameState);
  }

  // Update the custom shader in case it has texture uniforms.
  this._customShader.update(frameState);

  // Exit early if it's not ready yet.
  if (!this._ready && !provider.ready) {
    return;
  }

  // Initialize from the ready provider. This only happens once.
  const context = frameState.context;
  if (!this._ready) {
    // Don't make the primitive ready until after its first update because
    // external code may want to change some of its properties before it's rendered.
    const primitive = this;
    frameState.afterRender.push(function () {
      primitive._ready = true;
      primitive._readyPromise.resolve(primitive);
    });

    initFromProvider(this, provider, context);
    return;
  }

  // Check if the shape is dirty before updating it. This needs to happen every
  // frame because the member variables can be modified externally via the
  // getters.
  const shapeDirty = checkTransformAndBounds(this, provider);
  const shape = this._shape;
  if (shapeDirty) {
    this._shapeVisible = updateShapeAndTransforms(this, shape, provider);
    if (checkShapeDefines(this, shape)) {
      this._shaderDirty = true;
    }
  }
  if (!this._shapeVisible) {
    return;
  }

  // Update the traversal and prepare for rendering.
  const keyframeLocation = getKeyframeLocation(
    provider.timeIntervalCollection,
    this._clock
  );

  const traversal = this._traversal;
  const sampleCountOld = traversal._sampleCount;

  traversal.update(
    frameState,
    keyframeLocation,
    shapeDirty, // recomputeBoundingVolumes
    this._disableUpdate // pauseUpdate
  );

  if (sampleCountOld !== traversal._sampleCount) {
    this._shaderDirty = true;
  }

  if (!traversal.isRenderable(traversal.rootNode)) {
    return;
  }

  if (this._debugDraw) {
    // Debug draw bounding boxes and other things. Must go after traversal update
    // because that's what updates the tile bounding boxes.
    debugDraw(this, frameState);
  }

  if (this._disableRender) {
    return;
  }

  // Check if log depth changed
  if (this._useLogDepth !== frameState.useLogDepth) {
    this._useLogDepth = frameState.useLogDepth;
    this._shaderDirty = true;
  }

  // Check if clipping planes changed
  const clippingPlanesChanged = updateClippingPlanes(this, frameState);
  if (clippingPlanesChanged) {
    this._shaderDirty = true;
  }

  const leafNodeTexture = traversal.leafNodeTexture;
  const uniforms = this._uniforms;
  if (defined(leafNodeTexture)) {
    uniforms.octreeLeafNodeTexture = traversal.leafNodeTexture;
    uniforms.octreeLeafNodeTexelSizeUv = Cartesian2.clone(
      traversal.leafNodeTexelSizeUv,
      uniforms.octreeLeafNodeTexelSizeUv
    );
    uniforms.octreeLeafNodeTilesPerRow = traversal.leafNodeTilesPerRow;
  }

  // Rebuild shaders
  if (this._shaderDirty) {
    buildVoxelDrawCommands(this, context);
    this._shaderDirty = false;
  }

  // Calculate the NDC-space AABB to "scissor" the fullscreen quad
  const transformPositionWorldToProjection =
    context.uniformState.viewProjection;
  const orientedBoundingBox = shape.orientedBoundingBox;
  const ndcAabb = orientedBoundingBoxToNdcAabb(
    orientedBoundingBox,
    transformPositionWorldToProjection,
    scratchNdcAabb
  );

  // If the object is offscreen, don't render it.
  const offscreen =
    ndcAabb.x === +1.0 ||
    ndcAabb.y === +1.0 ||
    ndcAabb.z === -1.0 ||
    ndcAabb.w === -1.0;
  if (offscreen) {
    return;
  }

  // Prepare to render: update uniforms that can change every frame
  // Using a uniform instead of going through RenderState's scissor because the viewport is not accessible here, and the scissor command needs pixel coordinates.
  uniforms.ndcSpaceAxisAlignedBoundingBox = Cartesian4.clone(
    ndcAabb,
    uniforms.ndcSpaceAxisAlignedBoundingBox
  );
  const transformPositionViewToWorld = context.uniformState.inverseView;
  uniforms.transformPositionViewToUv = Matrix4.multiply(
    this._transformPositionWorldToUv,
    transformPositionViewToWorld,
    uniforms.transformPositionViewToUv
  );
  const transformPositionWorldToView = context.uniformState.view;
  uniforms.transformPositionUvToView = Matrix4.multiply(
    transformPositionWorldToView,
    this._transformPositionUvToWorld,
    uniforms.transformPositionUvToView
  );
  const transformDirectionViewToWorld =
    context.uniformState.inverseViewRotation;
  uniforms.transformDirectionViewToLocal = Matrix3.multiply(
    this._transformDirectionWorldToLocal,
    transformDirectionViewToWorld,
    uniforms.transformDirectionViewToLocal
  );
  uniforms.transformNormalLocalToWorld = Matrix3.clone(
    this._transformNormalLocalToWorld,
    uniforms.transformNormalLocalToWorld
  );
  const cameraPositionWorld = frameState.camera.positionWC;
  uniforms.cameraPositionUv = Matrix4.multiplyByPoint(
    this._transformPositionWorldToUv,
    cameraPositionWorld,
    uniforms.cameraPositionUv
  );
  uniforms.stepSize = this._stepSizeUv * this._stepSizeMultiplier;

  // Render the primitive
  const command = frameState.passes.pick
    ? this._drawCommandPick
    : this._drawCommand;
  command.boundingVolume = shape.boundingSphere;
  frameState.commandList.push(command);
};

/**
 * Initialize primitive properties that are derived from the voxel provider
 * @param {VoxelPrimitive} primitive
 * @param {VoxelProvider} provider
 * @param {Context} context
 * @private
 */
function initFromProvider(primitive, provider, context) {
  const uniforms = primitive._uniforms;

  primitive._pickId = context.createPickId({ primitive });
  uniforms.pickColor = Color.clone(primitive._pickId.color, uniforms.pickColor);

  // Set the bounds
  const {
    shape: shapeType,
    minBounds = VoxelShapeType.getMinBounds(shapeType),
    maxBounds = VoxelShapeType.getMaxBounds(shapeType),
  } = provider;

  primitive.minBounds = minBounds;
  primitive.maxBounds = maxBounds;
  primitive.minClippingBounds = VoxelShapeType.getMinBounds(shapeType);
  primitive.maxClippingBounds = VoxelShapeType.getMaxBounds(shapeType);

  checkTransformAndBounds(primitive, provider);

  // Create the shape object, and update it so it is valid for VoxelTraversal
  const ShapeConstructor = VoxelShapeType.getShapeConstructor(shapeType);
  primitive._shape = new ShapeConstructor();
  primitive._shapeVisible = updateShapeAndTransforms(
    primitive,
    primitive._shape,
    provider
  );

  const { shaderDefines, shaderUniforms: shapeUniforms } = primitive._shape;
  primitive._shapeDefinesOld = clone(shaderDefines, true);

  // Add shape uniforms to the uniform map
  const uniformMap = primitive._uniformMap;
  for (const key in shapeUniforms) {
    if (shapeUniforms.hasOwnProperty(key)) {
      const name = `u_${key}`;

      //>>includeStart('debug', pragmas.debug);
      if (defined(uniformMap[name])) {
        oneTimeWarning(
          `VoxelPrimitive: Uniform name "${name}" is already defined`
        );
      }
      //>>includeEnd('debug');

      uniformMap[name] = function () {
        return shapeUniforms[key];
      };
    }
  }

  // Set uniforms that come from the provider.
  // Note that minBounds and maxBounds can be set dynamically, so their uniforms aren't set here.
  uniforms.dimensions = Cartesian3.clone(
    provider.dimensions,
    uniforms.dimensions
  );
  primitive._paddingBefore = Cartesian3.clone(
    defaultValue(provider.paddingBefore, Cartesian3.ZERO),
    primitive._paddingBefore
  );
  uniforms.paddingBefore = Cartesian3.clone(
    primitive._paddingBefore,
    uniforms.paddingBefore
  );
  primitive._paddingAfter = Cartesian3.clone(
    defaultValue(provider.paddingAfter, Cartesian3.ZERO),
    primitive._paddingBefore
  );
  uniforms.paddingAfter = Cartesian3.clone(
    primitive._paddingAfter,
    uniforms.paddingAfter
  );

  // Create the VoxelTraversal, and set related uniforms
  primitive._traversal = setupTraversal(primitive, provider, context);
  setTraversalUniforms(primitive._traversal, uniforms);
}

/**
 * Track changes in provider transform and primitive bounds
 * @param {VoxelPrimitive} primitive
 * @param {VoxelProvider} provider
 * @returns {Boolean} Whether any of the transform or bounds changed
 * @private
 */
function checkTransformAndBounds(primitive, provider) {
  const providerTransform = defaultValue(
    provider.modelMatrix,
    Matrix4.IDENTITY
  );
  primitive._compoundModelMatrix = Matrix4.multiplyTransformation(
    providerTransform,
    primitive._modelMatrix,
    primitive._compoundModelMatrix
  );
  const numChanges =
    updateBound(primitive, "_compoundModelMatrix", "_compoundModelMatrixOld") +
    updateBound(primitive, "_minBounds", "_minBoundsOld") +
    updateBound(primitive, "_maxBounds", "_maxBoundsOld") +
    updateBound(primitive, "_minClippingBounds", "_minClippingBoundsOld") +
    updateBound(primitive, "_maxClippingBounds", "_maxClippingBoundsOld");
  return numChanges > 0;
}

/**
 * Compare old and new values of a bound and update the old if it is different.
 * @param {VoxelPrimitive} The primitive with bounds properties
 * @param {String} oldBoundKey A key pointing to a bounds property of type Cartesian3 or Matrix4
 * @param {String} newBoundKey A key pointing to a bounds property of the same type as the property at oldBoundKey
 * @returns {Number} 1 if the bound value changed, 0 otherwise
 *
 * @private
 */
function updateBound(primitive, newBoundKey, oldBoundKey) {
  const newBound = primitive[newBoundKey];
  const BoundClass = newBound.constructor;
  const changed = !BoundClass.equals(newBound, primitive[oldBoundKey]);
  if (changed) {
    primitive[oldBoundKey] = BoundClass.clone(newBound, primitive[oldBoundKey]);
  }
  return changed ? 1 : 0;
}

/**
 * Update the shape and related transforms
 * @param {VoxelPrimitive} primitive
 * @param {VoxelShape} shape
 * @param {VoxelProvider} provider
 * @returns {Boolean} True if the shape is visible
 * @private
 */
function updateShapeAndTransforms(primitive, shape, provider) {
  const visible = shape.update(
    primitive.compoundModelMatrix,
    primitive.minBounds,
    primitive.maxBounds,
    primitive.minClippingBounds,
    primitive.maxClippingBounds
  );
  if (!visible) {
    return false;
  }

  const transformPositionLocalToWorld = shape.shapeTransform;
  const transformPositionWorldToLocal = Matrix4.inverse(
    transformPositionLocalToWorld,
    scratchTransformPositionWorldToLocal
  );
  const rotation = Matrix4.getRotation(
    transformPositionLocalToWorld,
    scratchRotation
  );
  // Note that inverse(rotation) is the same as transpose(rotation)
  const scale = Matrix4.getScale(transformPositionLocalToWorld, scratchScale);
  const maximumScaleComponent = Cartesian3.maximumComponent(scale);
  const localScale = Cartesian3.divideByScalar(
    scale,
    maximumScaleComponent,
    scratchLocalScale
  );
  const rotationAndLocalScale = Matrix3.multiplyByScale(
    rotation,
    localScale,
    scratchRotationAndLocalScale
  );

  // Set member variables when the shape is dirty
  const dimensions = provider.dimensions;
  primitive._stepSizeUv = shape.computeApproximateStepSize(dimensions);
  //  TODO: check which of the `multiply` can be `multiplyTransformation`
  primitive._transformPositionWorldToUv = Matrix4.multiply(
    transformPositionLocalToUv,
    transformPositionWorldToLocal,
    primitive._transformPositionWorldToUv
  );
  primitive._transformPositionUvToWorld = Matrix4.multiply(
    transformPositionLocalToWorld,
    transformPositionUvToLocal,
    primitive._transformPositionUvToWorld
  );
  primitive._transformDirectionWorldToLocal = Matrix4.getMatrix3(
    transformPositionWorldToLocal,
    primitive._transformDirectionWorldToLocal
  );
  primitive._transformNormalLocalToWorld = Matrix3.inverseTranspose(
    rotationAndLocalScale,
    primitive._transformNormalLocalToWorld
  );

  return true;
}

/**
 * Set up a VoxelTraversal based on dimensions and types from the primitive and provider
 * @param {VoxelPrimitive} primitive
 * @param {VoxelProvider} provider
 * @param {Context} context
 * @returns {VoxelTraversal}
 * @private
 */
function setupTraversal(primitive, provider, context) {
  const dimensions = Cartesian3.clone(provider.dimensions, scratchDimensions);
  Cartesian3.add(dimensions, primitive._paddingBefore, dimensions);
  Cartesian3.add(dimensions, primitive._paddingAfter, dimensions);

  // It's ok for memory byte length to be undefined.
  // The system will choose a default memory size.
  const maximumTileCount = provider.maximumTileCount;
  const maximumTextureMemoryByteLength = defined(maximumTileCount)
    ? VoxelTraversal.getApproximateTextureMemoryByteLength(
        maximumTileCount,
        dimensions,
        provider.types,
        provider.componentTypes
      )
    : undefined;

  const keyframeCount = defaultValue(provider.keyframeCount, 1);

  return new VoxelTraversal(
    primitive,
    context,
    dimensions,
    provider.types,
    provider.componentTypes,
    keyframeCount,
    maximumTextureMemoryByteLength
  );
}

/**
 * Set uniforms that come from the traversal.
 * TODO: should this be done in VoxelTraversal?
 * @param {VoxelTraversal} traversal
 * @param {Object} uniforms
 * @private
 */
function setTraversalUniforms(traversal, uniforms) {
  uniforms.octreeInternalNodeTexture = traversal.internalNodeTexture;
  uniforms.octreeInternalNodeTexelSizeUv = Cartesian2.clone(
    traversal.internalNodeTexelSizeUv,
    uniforms.octreeInternalNodeTexelSizeUv
  );
  uniforms.octreeInternalNodeTilesPerRow = traversal.internalNodeTilesPerRow;

  const megatextures = traversal.megatextures;
  const megatexture = megatextures[0];
  const megatextureLength = megatextures.length;
  uniforms.megatextureTextures = new Array(megatextureLength);
  for (let i = 0; i < megatextureLength; i++) {
    uniforms.megatextureTextures[i] = megatextures[i].texture;
  }

  uniforms.megatextureSliceDimensions = Cartesian2.clone(
    megatexture.sliceCountPerRegion,
    uniforms.megatextureSliceDimensions
  );
  uniforms.megatextureTileDimensions = Cartesian2.clone(
    megatexture.regionCountPerMegatexture,
    uniforms.megatextureTileDimensions
  );
  uniforms.megatextureVoxelSizeUv = Cartesian2.clone(
    megatexture.voxelSizeUv,
    uniforms.megatextureVoxelSizeUv
  );
  uniforms.megatextureSliceSizeUv = Cartesian2.clone(
    megatexture.sliceSizeUv,
    uniforms.megatextureSliceSizeUv
  );
  uniforms.megatextureTileSizeUv = Cartesian2.clone(
    megatexture.regionSizeUv,
    uniforms.megatextureTileSizeUv
  );
}

/**
 * Track changes in shape-related shader defines
 * @param {VoxelPrimitive} primitive
 * @param {VoxelShape} shape
 * @returns {Boolean} True if any of the shape defines changed, requiring a shader rebuild
 * @private
 */
function checkShapeDefines(primitive, shape) {
  const shapeDefines = shape.shaderDefines;
  const shapeDefinesChanged = Object.keys(shapeDefines).some(
    (key) => shapeDefines[key] !== primitive._shapeDefinesOld[key]
  );
  if (shapeDefinesChanged) {
    primitive._shapeDefinesOld = clone(shapeDefines, true);
  }
  return shapeDefinesChanged;
}

/**
 * Find the keyframe location to render at. Doesn't need to be a whole number.
 * @param {TimeIntervalCollection} timeIntervalCollection
 * @param {Clock} clock
 * @returns {Number}
 *
 * @private
 */
function getKeyframeLocation(timeIntervalCollection, clock) {
  if (!defined(timeIntervalCollection) || !defined(clock)) {
    return 0.0;
  }
  let date = clock.currentTime;
  let timeInterval;
  let timeIntervalIndex = timeIntervalCollection.indexOf(date);
  if (timeIntervalIndex >= 0) {
    timeInterval = timeIntervalCollection.get(timeIntervalIndex);
  } else {
    // Date fell outside the range
    timeIntervalIndex = ~timeIntervalIndex;
    if (timeIntervalIndex === timeIntervalCollection.length) {
      // Date past range
      timeIntervalIndex = timeIntervalCollection.length - 1;
      timeInterval = timeIntervalCollection.get(timeIntervalIndex);
      date = timeInterval.stop;
    } else {
      // Date before range
      timeInterval = timeIntervalCollection.get(timeIntervalIndex);
      date = timeInterval.start;
    }
  }
  // De-lerp between the start and end of the interval
  const totalSeconds = JulianDate.secondsDifference(
    timeInterval.stop,
    timeInterval.start
  );
  const secondsDifferenceStart = JulianDate.secondsDifference(
    date,
    timeInterval.start
  );
  const t = secondsDifferenceStart / totalSeconds;

  return timeIntervalIndex + t;
}

/**
 * Update the clipping planes state and associated uniforms
 *
 * @param {VoxelPrimitive} primitive
 * @param {FrameState} frameState
 * @returns {Boolean} Whether the clipping planes changed, requiring a shader rebuild
 * @private
 */
function updateClippingPlanes(primitive, frameState) {
  const clippingPlanes = primitive.clippingPlanes;
  if (!defined(clippingPlanes)) {
    return false;
  }

  clippingPlanes.update(frameState);

  const { clippingPlanesState, enabled } = clippingPlanes;
  if (
    primitive._clippingPlanesState === clippingPlanesState &&
    primitive._clippingPlanesEnabled === enabled
  ) {
    return false;
  }
  primitive._clippingPlanesState = clippingPlanesState;
  primitive._clippingPlanesEnabled = enabled;

  if (enabled) {
    const uniforms = primitive._uniforms;
    uniforms.clippingPlanesTexture = clippingPlanes.texture;

    // Compute the clipping plane's transformation to uv space and then take the inverse
    // transpose to properly transform the hessian normal form of the plane.

    // transpose(inverse(worldToUv * clippingPlaneLocalToWorld))
    // transpose(inverse(clippingPlaneLocalToWorld) * inverse(worldToUv))
    // transpose(inverse(clippingPlaneLocalToWorld) * uvToWorld)

    uniforms.clippingPlanesMatrix = Matrix4.transpose(
      Matrix4.multiplyTransformation(
        Matrix4.inverse(
          clippingPlanes.modelMatrix,
          uniforms.clippingPlanesMatrix
        ),
        primitive._transformPositionUvToWorld,
        uniforms.clippingPlanesMatrix
      ),
      uniforms.clippingPlanesMatrix
    );
  }

  return true;
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see VoxelPrimitive#destroy
 */
VoxelPrimitive.prototype.isDestroyed = function () {
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
 * @see VoxelPrimitive#isDestroyed
 *
 * @example
 * voxelPrimitive = voxelPrimitive && voxelPrimitive.destroy();
 */
VoxelPrimitive.prototype.destroy = function () {
  const drawCommand = this._drawCommand;
  if (defined(drawCommand)) {
    drawCommand.shaderProgram =
      drawCommand.shaderProgram && drawCommand.shaderProgram.destroy();
  }
  const drawCommandPick = this._drawCommandPick;
  if (defined(drawCommandPick)) {
    drawCommandPick.shaderProgram =
      drawCommandPick.shaderProgram && drawCommandPick.shaderProgram.destroy();
  }

  this._pickId = this._pickId && this._pickId.destroy();
  this._traversal = this._traversal && this._traversal.destroy();
  this._clippingPlanes = this._clippingPlanes && this._clippingPlanes.destroy();

  return destroyObject(this);
};

const corners = new Array(
  new Cartesian4(-1.0, -1.0, -1.0, 1.0),
  new Cartesian4(+1.0, -1.0, -1.0, 1.0),
  new Cartesian4(-1.0, +1.0, -1.0, 1.0),
  new Cartesian4(+1.0, +1.0, -1.0, 1.0),
  new Cartesian4(-1.0, -1.0, +1.0, 1.0),
  new Cartesian4(+1.0, -1.0, +1.0, 1.0),
  new Cartesian4(-1.0, +1.0, +1.0, 1.0),
  new Cartesian4(+1.0, +1.0, +1.0, 1.0)
);
const vertexNeighborIndices = new Array(
  1,
  2,
  4,
  0,
  3,
  5,
  0,
  3,
  6,
  1,
  2,
  7,
  0,
  5,
  6,
  1,
  4,
  7,
  2,
  4,
  7,
  3,
  5,
  6
);

const scratchCornersClipSpace = new Array(
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4()
);

/**
 * Projects all 8 corners of the oriented bounding box to NDC space and finds the
 * resulting NDC axis aligned bounding box. To avoid projecting a vertex that is
 * behind the near plane, it uses the intersection point of each of the vertex's
 * edges against the near plane as part of the AABB calculation. This is done in
 * clip space prior to perspective division.
 *
 * @function
 *
 * @param {OrientedBoundingBox} orientedBoundingBox
 * @param {Matrix4} worldToProjection
 * @param {Cartesian4} result
 * @returns {Cartesian4}
 *
 * @private
 */
function orientedBoundingBoxToNdcAabb(
  orientedBoundingBox,
  worldToProjection,
  result
) {
  const transformPositionLocalToWorld = Matrix4.fromRotationTranslation(
    orientedBoundingBox.halfAxes,
    orientedBoundingBox.center,
    scratchTransformPositionLocalToWorld
  );
  const transformPositionLocalToProjection = Matrix4.multiply(
    worldToProjection,
    transformPositionLocalToWorld,
    scratchTransformPositionLocalToProjection
  );

  let ndcMinX = +Number.MAX_VALUE;
  let ndcMaxX = -Number.MAX_VALUE;
  let ndcMinY = +Number.MAX_VALUE;
  let ndcMaxY = -Number.MAX_VALUE;
  let cornerIndex;

  // Convert all points to clip space
  const cornersClipSpace = scratchCornersClipSpace;
  const cornersLength = corners.length;
  for (cornerIndex = 0; cornerIndex < cornersLength; cornerIndex++) {
    Matrix4.multiplyByVector(
      transformPositionLocalToProjection,
      corners[cornerIndex],
      cornersClipSpace[cornerIndex]
    );
  }

  for (cornerIndex = 0; cornerIndex < cornersLength; cornerIndex++) {
    const position = cornersClipSpace[cornerIndex];
    if (position.z >= -position.w) {
      // Position is past near plane, so there's no need to clip.
      const ndcX = position.x / position.w;
      const ndcY = position.y / position.w;
      ndcMinX = Math.min(ndcMinX, ndcX);
      ndcMaxX = Math.max(ndcMaxX, ndcX);
      ndcMinY = Math.min(ndcMinY, ndcY);
      ndcMaxY = Math.max(ndcMaxY, ndcY);
    } else {
      for (let neighborIndex = 0; neighborIndex < 3; neighborIndex++) {
        const neighborVertexIndex =
          vertexNeighborIndices[cornerIndex * 3 + neighborIndex];
        const neighborPosition = cornersClipSpace[neighborVertexIndex];
        if (neighborPosition.z >= -neighborPosition.w) {
          // Position is behind the near plane and neighbor is after, so get intersection point on the near plane.
          const distanceToPlaneFromPosition = position.z + position.w;
          const distanceToPlaneFromNeighbor =
            neighborPosition.z + neighborPosition.w;
          const t =
            distanceToPlaneFromPosition /
            (distanceToPlaneFromPosition - distanceToPlaneFromNeighbor);

          const intersect = Cartesian4.lerp(
            position,
            neighborPosition,
            t,
            scratchIntersect
          );
          const intersectNdcX = intersect.x / intersect.w;
          const intersectNdcY = intersect.y / intersect.w;
          ndcMinX = Math.min(ndcMinX, intersectNdcX);
          ndcMaxX = Math.max(ndcMaxX, intersectNdcX);
          ndcMinY = Math.min(ndcMinY, intersectNdcY);
          ndcMaxY = Math.max(ndcMaxY, intersectNdcY);
        }
      }
    }
  }

  // Clamp the NDC values to -1 to +1 range even if they extend much further.
  ndcMinX = CesiumMath.clamp(ndcMinX, -1.0, +1.0);
  ndcMinY = CesiumMath.clamp(ndcMinY, -1.0, +1.0);
  ndcMaxX = CesiumMath.clamp(ndcMaxX, -1.0, +1.0);
  ndcMaxY = CesiumMath.clamp(ndcMaxY, -1.0, +1.0);
  result = Cartesian4.fromElements(ndcMinX, ndcMinY, ndcMaxX, ndcMaxY, result);

  return result;
}

const colorRed = new Color(1.0, 0.0, 0.0);
const colorGreen = new Color(0.0, 1.0, 0.0);
const colorBlue = new Color(0.0, 0.0, 1.0);

const polylineAxisDistance = 30000000.0;
const polylineXAxis = new Cartesian3(polylineAxisDistance, 0.0, 0.0);
const polylineYAxis = new Cartesian3(0.0, polylineAxisDistance, 0.0);
const polylineZAxis = new Cartesian3(0.0, 0.0, polylineAxisDistance);

/**
 * Draws the tile bounding boxes and axes.
 *
 * @function
 *
 * @param {VoxelPrimitive} that
 * @param {FrameState} frameState
 *
 * @private
 */
function debugDraw(that, frameState) {
  const traversal = that._traversal;
  const polylines = that._debugPolylines;
  polylines.removeAll();

  function makePolylineLineSegment(startPos, endPos, color, thickness) {
    polylines.add({
      positions: [startPos, endPos],
      width: thickness,
      material: Material.fromType("Color", {
        color: color,
      }),
    });
  }

  function makePolylineBox(orientedBoundingBox, color, thickness) {
    // Normally would want to use a scratch variable to store the corners, but
    // polylines don't clone the positions.
    const corners = orientedBoundingBox.computeCorners();
    makePolylineLineSegment(corners[0], corners[1], color, thickness);
    makePolylineLineSegment(corners[2], corners[3], color, thickness);
    makePolylineLineSegment(corners[4], corners[5], color, thickness);
    makePolylineLineSegment(corners[6], corners[7], color, thickness);
    makePolylineLineSegment(corners[0], corners[2], color, thickness);
    makePolylineLineSegment(corners[4], corners[6], color, thickness);
    makePolylineLineSegment(corners[1], corners[3], color, thickness);
    makePolylineLineSegment(corners[5], corners[7], color, thickness);
    makePolylineLineSegment(corners[0], corners[4], color, thickness);
    makePolylineLineSegment(corners[2], corners[6], color, thickness);
    makePolylineLineSegment(corners[1], corners[5], color, thickness);
    makePolylineLineSegment(corners[3], corners[7], color, thickness);
  }

  function drawTile(tile) {
    if (!traversal.isRenderable(tile)) {
      return;
    }

    const level = tile.level;
    const startThickness = 5.0;
    const thickness = Math.max(1.0, startThickness / Math.pow(2.0, level));
    const colors = [colorRed, colorGreen, colorBlue];
    const color = colors[level % 3];

    makePolylineBox(tile.orientedBoundingBox, color, thickness);

    if (defined(tile.children)) {
      for (let i = 0; i < 8; i++) {
        drawTile(tile.children[i]);
      }
    }
  }

  drawTile(traversal.rootNode);

  const axisThickness = 10.0;
  makePolylineLineSegment(
    Cartesian3.ZERO,
    polylineXAxis,
    colorRed,
    axisThickness
  );
  makePolylineLineSegment(
    Cartesian3.ZERO,
    polylineYAxis,
    colorGreen,
    axisThickness
  );
  makePolylineLineSegment(
    Cartesian3.ZERO,
    polylineZAxis,
    colorBlue,
    axisThickness
  );

  polylines.update(frameState);
}

/**
 * The default custom shader used by the primitive.
 *
 * @type {CustomShader}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelPrimitive.DefaultCustomShader = new CustomShader({
  fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
{
    material.diffuse = vec3(1.0);
    material.alpha = 1.0;
}`,
});

function DefaultVoxelProvider() {
  this.ready = true;
  this.readyPromise = Promise.resolve(this);
  this.shape = VoxelShapeType.BOX;
  this.dimensions = new Cartesian3(1, 1, 1);
  this.names = ["data"];
  this.types = [MetadataType.SCALAR];
  this.componentTypes = [MetadataComponentType.FLOAT32];
  this.maximumTileCount = 1;
}

DefaultVoxelProvider.prototype.requestData = function (options) {
  const tileLevel = defined(options) ? defaultValue(options.tileLevel, 0) : 0;
  if (tileLevel >= 1) {
    return undefined;
  }

  return Promise.resolve([new Float32Array(1)]);
};

VoxelPrimitive.DefaultProvider = new DefaultVoxelProvider();

export default VoxelPrimitive;
