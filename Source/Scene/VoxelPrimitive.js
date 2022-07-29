import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import BlendingState from "./BlendingState.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import CullFace from "./CullFace.js";
import getClippingFunction from "./getClippingFunction.js";
import Material from "./Material.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";
import PolylineCollection from "./PolylineCollection.js";
import VoxelShapeType from "./VoxelShapeType.js";
import VoxelTraversal from "./VoxelTraversal.js";
import CustomShader from "./ModelExperimental/CustomShader.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderBuilder from "../Renderer/ShaderBuilder.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import VoxelFS from "../Shaders/VoxelFS.js";
import VoxelVS from "../Shaders/VoxelVS.js";
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
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  compoundModelMatrix: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "compoundModelMatrix must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

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
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  minBounds: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "minBounds must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._minBounds;
    },
    set: function (minBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("minBounds", minBounds);
      if (!this._ready) {
        throw new DeveloperError(
          "minBounds must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      this._minBounds = Cartesian3.clone(minBounds, this._minBounds);
    },
  },

  /**
   * Gets or sets the maximum bounds. TODO: fill in the rest later.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  maxBounds: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "maxBounds must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._maxBounds;
    },
    set: function (maxBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("maxBounds", maxBounds);
      if (!this._ready) {
        throw new DeveloperError(
          "maxBounds must not be called before the primitive is ready."
        );
      }
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
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  minClippingBounds: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "minClippingBounds must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._minClippingBounds;
    },
    set: function (minClippingBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("minClippingBounds", minClippingBounds);
      if (!this._ready) {
        throw new DeveloperError(
          "minClippingBounds must not be called before the primitive is ready."
        );
      }
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
   *
   * @exception {DeveloperError} If the primitive is not ready.
   */
  maxClippingBounds: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "maxClippingBounds must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._maxClippingBounds;
    },
    set: function (maxClippingBounds) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("maxClippingBounds", maxClippingBounds);
      if (!this._ready) {
        throw new DeveloperError(
          "maxClippingBounds must not be called before the primitive is ready."
        );
      }
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

const scratchTotalDimensions = new Cartesian3();
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
 *
 * @param {FrameState} frameState
 */
VoxelPrimitive.prototype.update = function (frameState) {
  const context = frameState.context;
  const provider = this._provider;
  const uniforms = this._uniforms;
  const customShader = this._customShader;

  // Update the provider, if applicable.
  if (defined(provider.update)) {
    provider.update(frameState);
  }

  // Update the custom shader in case it has texture uniforms.
  customShader.update(frameState);

  // Exit early if it's not ready yet.
  if (!this._ready && !provider.ready) {
    return;
  }

  // Initialize from the ready provider. This only happens once.
  if (!this._ready) {
    // Don't make the primitive ready until after its first update because
    // external code may want to change some of its properties before it's rendered.
    const primitive = this;
    frameState.afterRender.push(function () {
      primitive._ready = true;
      primitive._readyPromise.resolve(primitive);
    });

    // Create pickId here instead of the constructor because it needs the context object.
    this._pickId = context.createPickId({
      primitive: this,
    });
    uniforms.pickColor = Color.clone(this._pickId.color, uniforms.pickColor);

    const dimensions = provider.dimensions;
    const shapeType = provider.shape;

    // Set the bounds
    const defaultMinBounds = VoxelShapeType.getMinBounds(shapeType);
    const defaultMaxBounds = VoxelShapeType.getMaxBounds(shapeType);
    const minBounds = defaultValue(provider.minBounds, defaultMinBounds);
    const maxBounds = defaultValue(provider.maxBounds, defaultMaxBounds);
    this._minBounds = Cartesian3.clone(minBounds, this._minBounds);
    this._maxBounds = Cartesian3.clone(maxBounds, this._maxBounds);
    this._minBoundsOld = Cartesian3.clone(this._minBounds, this._minBoundsOld);
    this._maxBoundsOld = Cartesian3.clone(this._maxBounds, this._maxBoundsOld);
    this._minClippingBounds = Cartesian3.clone(
      defaultMinBounds,
      this._minClippingBounds
    );
    this._maxClippingBounds = Cartesian3.clone(
      defaultMaxBounds,
      this._maxClippingBounds
    );
    this._minClippingBoundsOld = Cartesian3.clone(
      this._minClippingBounds,
      this._minClippingBoundsOld
    );
    this._maxClippingBoundsOld = Cartesian3.clone(
      this._maxClippingBounds,
      this._maxClippingBoundsOld
    );

    // Create the shape object
    const ShapeConstructor = VoxelShapeType.getShapeConstructor(shapeType);
    this._shape = new ShapeConstructor();

    const shape = this._shape;
    const shapeDefines = shape.shaderDefines;
    this._shapeDefinesOld = clone(shapeDefines, true);

    // Add shape uniforms to the uniform map
    const shapeUniforms = shape.shaderUniforms;
    const uniformMap = this._uniformMap;
    for (const key in shapeUniforms) {
      if (shapeUniforms.hasOwnProperty(key)) {
        const name = `u_${key}`;

        //>>includeStart('debug', pragmas.debug);
        if (defined(uniformMap[name])) {
          throw new DeveloperError(`Uniform name "${name}" is already defined`);
        }
        //>>includeEnd('debug');

        uniformMap[name] = function () {
          return shapeUniforms[key];
        };
      }
    }

    this._paddingBefore = Cartesian3.clone(
      defaultValue(provider.paddingBefore, Cartesian3.ZERO),
      this._paddingBefore
    );
    this._paddingAfter = Cartesian3.clone(
      defaultValue(provider.paddingAfter, Cartesian3.ZERO),
      this._paddingBefore
    );

    // Set uniforms that come from the provider.
    // Note that minBounds and maxBounds can be set dynamically, so their uniforms aren't set here.
    uniforms.dimensions = Cartesian3.clone(dimensions, uniforms.dimensions);
    uniforms.paddingBefore = Cartesian3.clone(
      this._paddingBefore,
      uniforms.paddingBefore
    );
    uniforms.paddingAfter = Cartesian3.clone(
      this._paddingAfter,
      uniforms.paddingAfter
    );
  }

  // Check if the shape is dirty before updating it. This needs to happen every
  // frame because the member variables can be modified externally via the
  // getters.
  const primitiveTransform = this._modelMatrix;
  const providerTransform = defaultValue(
    provider.modelMatrix,
    Matrix4.IDENTITY
  );
  const compoundTransform = Matrix4.multiplyTransformation(
    providerTransform,
    primitiveTransform,
    this._compoundModelMatrix
  );
  const compoundTransformOld = this._compoundModelMatrixOld;
  const compoundTransformDirty = !Matrix4.equals(
    compoundTransform,
    compoundTransformOld
  );

  const shape = this._shape;
  const minBounds = this._minBounds;
  const maxBounds = this._maxBounds;
  const minBoundsOld = this._minBoundsOld;
  const maxBoundsOld = this._maxBoundsOld;
  const minBoundsDirty = !Cartesian3.equals(minBounds, minBoundsOld);
  const maxBoundsDirty = !Cartesian3.equals(maxBounds, maxBoundsOld);
  const clipMinBounds = this._minClippingBounds;
  const clipMaxBounds = this._maxClippingBounds;
  const clipMinBoundsOld = this._minClippingBoundsOld;
  const clipMaxBoundsOld = this._maxClippingBoundsOld;
  const clipMinBoundsDirty = !Cartesian3.equals(
    clipMinBounds,
    clipMinBoundsOld
  );
  const clipMaxBoundsDirty = !Cartesian3.equals(
    clipMaxBounds,
    clipMaxBoundsOld
  );

  const shapeDirty =
    compoundTransformDirty ||
    minBoundsDirty ||
    maxBoundsDirty ||
    clipMinBoundsDirty ||
    clipMaxBoundsDirty;

  if (shapeDirty) {
    if (compoundTransformDirty) {
      this._compoundModelMatrixOld = Matrix4.clone(
        compoundTransform,
        this._compoundModelMatrixOld
      );
    }
    if (minBoundsDirty) {
      this._minBoundsOld = Cartesian3.clone(minBounds, this._minBoundsOld);
    }
    if (maxBoundsDirty) {
      this._maxBoundsOld = Cartesian3.clone(maxBounds, this._maxBoundsOld);
    }
    if (clipMinBoundsDirty) {
      this._minClippingBoundsOld = Cartesian3.clone(
        clipMinBounds,
        this._minClippingBoundsOld
      );
    }
    if (clipMaxBoundsDirty) {
      this._maxClippingBoundsOld = Cartesian3.clone(
        clipMaxBounds,
        this._maxClippingBoundsOld
      );
    }
  }

  // Update the shape on the first frame or if it's dirty.
  // If the shape is visible it will need to do some extra work.
  if (
    (!this._ready || shapeDirty) &&
    (this._shapeVisible = shape.update(
      compoundTransform,
      minBounds,
      maxBounds,
      clipMinBounds,
      clipMaxBounds
    ))
  ) {
    // Rebuild the shader if any of the shape defines changed.
    const shapeDefines = shape.shaderDefines;
    const shapeDefinesOld = this._shapeDefinesOld;
    let shapeDefinesChanged = false;
    for (const property in shapeDefines) {
      if (shapeDefines.hasOwnProperty(property)) {
        const value = shapeDefines[property];
        const valueOld = shapeDefinesOld[property];
        if (value !== valueOld) {
          shapeDefinesChanged = true;
          break;
        }
      }
    }
    if (shapeDefinesChanged) {
      this._shaderDirty = true;
      this._shapeDefinesOld = clone(shapeDefines, true);
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
    this._stepSizeUv = shape.computeApproximateStepSize(dimensions);
    //  TODO: check which of the `multiply` can be `multiplyTransformation`
    this._transformPositionWorldToUv = Matrix4.multiply(
      transformPositionLocalToUv,
      transformPositionWorldToLocal,
      this._transformPositionWorldToUv
    );
    this._transformPositionUvToWorld = Matrix4.multiply(
      transformPositionLocalToWorld,
      transformPositionUvToLocal,
      this._transformPositionUvToWorld
    );
    this._transformDirectionWorldToLocal = Matrix4.getMatrix3(
      transformPositionWorldToLocal,
      this._transformDirectionWorldToLocal
    );
    this._transformNormalLocalToWorld = Matrix3.inverseTranspose(
      rotationAndLocalScale,
      this._transformNormalLocalToWorld
    );
  }

  // Initialize from the ready shape. This only happens once.
  if (!this._ready) {
    const dimensions = provider.dimensions;
    const paddingBefore = this._paddingBefore;
    const paddingAfter = this._paddingAfter;
    const totalDimensions = Cartesian3.clone(
      dimensions,
      scratchTotalDimensions
    );
    Cartesian3.add(totalDimensions, paddingBefore, totalDimensions);
    Cartesian3.add(totalDimensions, paddingAfter, totalDimensions);

    const types = provider.types;
    const componentTypes = provider.componentTypes;

    // Traversal setup
    // It's ok for memory byte length to be undefined.
    // The system will choose a default memory size.
    const maximumTileCount = provider.maximumTileCount;
    const maximumTextureMemoryByteLength = defined(maximumTileCount)
      ? VoxelTraversal.getApproximateTextureMemoryByteLength(
          maximumTileCount,
          totalDimensions,
          types,
          componentTypes
        )
      : undefined;

    const keyframeCount = defaultValue(provider.keyframeCount, 1);

    this._traversal = new VoxelTraversal(
      this,
      context,
      totalDimensions,
      types,
      componentTypes,
      keyframeCount,
      maximumTextureMemoryByteLength
    );

    // Set uniforms that come from the traversal.
    // TODO: should this be done in VoxelTraversal?
    const traversal = this._traversal;

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

  // Update the traversal and prepare for rendering.
  // This doesn't happen on the first update frame. It needs to wait until the
  // primitive is made ready after the end of the first update frame.
  if (this._ready && this._shapeVisible) {
    const traversal = this._traversal;
    const clock = this._clock;
    const timeIntervalCollection = provider.timeIntervalCollection;

    // Find the keyframe location to render at. Doesn't need to be a whole number.
    let keyframeLocation = 0.0;
    if (defined(timeIntervalCollection) && defined(clock)) {
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
      keyframeLocation = timeIntervalIndex + t;
    }

    const sampleCountOld = traversal._sampleCount;

    // Update the voxel traversal
    traversal.update(
      frameState,
      keyframeLocation,
      shapeDirty, // recomputeBoundingVolumes
      this._disableUpdate // pauseUpdate
    );

    if (sampleCountOld !== traversal._sampleCount) {
      this._shaderDirty = true;
    }

    const hasLoadedData = traversal.isRenderable(traversal.rootNode);

    if (hasLoadedData && this._debugDraw) {
      // Debug draw bounding boxes and other things. Must go after traversal update
      // because that's what updates the tile bounding boxes.
      debugDraw(this, frameState);
    }

    if (hasLoadedData && !this._disableRender) {
      // Check if log depth changed
      if (this._useLogDepth !== frameState.useLogDepth) {
        this._useLogDepth = frameState.useLogDepth;
        this._shaderDirty = true;
      }

      // Check if clipping planes changed
      const clippingPlanes = this._clippingPlanes;
      if (defined(clippingPlanes)) {
        clippingPlanes.update(frameState);
        const clippingPlanesState = clippingPlanes.clippingPlanesState;
        const clippingPlanesEnabled = clippingPlanes.enabled;
        if (
          this._clippingPlanesState !== clippingPlanesState ||
          this._clippingPlanesEnabled !== clippingPlanesEnabled
        ) {
          this._clippingPlanesState = clippingPlanesState;
          this._clippingPlanesEnabled = clippingPlanesEnabled;
          if (clippingPlanesEnabled) {
            uniforms.clippingPlanesTexture = clippingPlanes.texture;

            // Compute the clipping plane's transformation to uv space and then take the inverse
            // transpose to properly transform the hessian normal form of the plane.

            // transpose(inverse(worldToUv * clippingPlaneLocalToWorld))
            // transpose(inverse(clippingPlaneLocalToWorld) * inverse(worldToUv))
            // transpose(inverse(clippingPlaneLocalToWorld) * uvToWorld)

            const transformPositionUvToWorld = this._transformPositionUvToWorld;
            uniforms.clippingPlanesMatrix = Matrix4.transpose(
              Matrix4.multiplyTransformation(
                Matrix4.inverse(
                  clippingPlanes.modelMatrix,
                  uniforms.clippingPlanesMatrix
                ),
                transformPositionUvToWorld,
                uniforms.clippingPlanesMatrix
              ),
              uniforms.clippingPlanesMatrix
            );
          }
          this._shaderDirty = true;
        }
      }

      const leafNodeTexture = traversal.leafNodeTexture;
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
        buildDrawCommands(this, context);
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

      if (!offscreen) {
        const transformPositionWorldToView = context.uniformState.view;
        const transformPositionViewToWorld = context.uniformState.inverseView;
        const transformDirectionViewToWorld =
          context.uniformState.inverseViewRotation;
        const transformDirectionWorldToLocal = this
          ._transformDirectionWorldToLocal;
        const transformPositionUvToWorld = this._transformPositionUvToWorld;
        const transformPositionWorldToUv = this._transformPositionWorldToUv;
        const transformNormalLocalToWorld = this._transformNormalLocalToWorld;
        const cameraPositionWorld = frameState.camera.positionWC;

        // Update uniforms that can change every frame
        uniforms.transformPositionViewToUv = Matrix4.multiply(
          transformPositionWorldToUv,
          transformPositionViewToWorld,
          uniforms.transformPositionViewToUv
        );
        uniforms.transformPositionUvToView = Matrix4.multiply(
          transformPositionWorldToView,
          transformPositionUvToWorld,
          uniforms.transformPositionUvToView
        );
        uniforms.transformDirectionViewToLocal = Matrix3.multiply(
          transformDirectionWorldToLocal,
          transformDirectionViewToWorld,
          uniforms.transformDirectionViewToLocal
        );
        uniforms.transformNormalLocalToWorld = Matrix3.clone(
          transformNormalLocalToWorld,
          uniforms.transformNormalLocalToWorld
        );
        uniforms.cameraPositionUv = Matrix4.multiplyByPoint(
          transformPositionWorldToUv,
          cameraPositionWorld,
          uniforms.cameraPositionUv
        );
        uniforms.stepSize = this._stepSizeUv * this._stepSizeMultiplier;

        // Using a uniform instead of going through RenderState's scissor because the viewport is not accessible here, and the scissor command needs pixel coordinates.
        uniforms.ndcSpaceAxisAlignedBoundingBox = Cartesian4.clone(
          ndcAabb,
          uniforms.ndcSpaceAxisAlignedBoundingBox
        );

        // Render the primitive
        const command = frameState.passes.pick
          ? this._drawCommandPick
          : this._drawCommand;
        command.boundingVolume = shape.boundingSphere;
        frameState.commandList.push(command);
      }
    }
  }
};

// Shader builder helpers

/**
 * Converts a {@link MetadataType} to a GLSL type.
 *
 * @function
 *
 * @param {MetadataType} type The {@link MetadataType}.
 * @returns {String} The GLSL type.
 *
 * @private
 */
function getGlslType(type) {
  if (type === MetadataType.SCALAR) {
    return "float";
  } else if (type === MetadataType.VEC2) {
    return "vec2";
  } else if (type === MetadataType.VEC3) {
    return "vec3";
  } else if (type === MetadataType.VEC4) {
    return "vec4";
  }
}

/**
 * Gets the GLSL swizzle when reading data from a texture.
 *
 * @function
 *
 * @param {MetadataType} type The {@link MetadataType}.
 * @returns {String} The GLSL swizzle.
 *
 * @private
 */
function getGlslTextureSwizzle(type) {
  if (type === MetadataType.SCALAR) {
    return ".r";
  } else if (type === MetadataType.VEC2) {
    return ".ra";
  } else if (type === MetadataType.VEC3) {
    return ".rgb";
  } else if (type === MetadataType.VEC4) {
    return "";
  }
}

/**
 * Gets the GLSL type of the partial derivative of {@link MetadataType}.
 *
 * @function
 *
 * @param {MetadataType} type The {@link MetadataType}.
 * @returns {String} The GLSL type.
 *
 * @private
 */
function getGlslPartialDerivativeType(type) {
  if (type === MetadataType.SCALAR) {
    return "vec3";
  } else if (type === MetadataType.VEC2) {
    return "mat2";
  } else if (type === MetadataType.VEC3) {
    return "mat3";
  } else if (type === MetadataType.VEC4) {
    return "mat4";
  }
}

/**
 * GLSL needs to have `.0` at the end of whole number floats or else it's
 * treated like an integer.
 *
 * @function
 *
 * @param {Number} number The number to convert.
 * @returns {String} The number as floating point in GLSL.
 *
 * @private
 */
function getGlslNumberAsFloat(number) {
  let numberString = number.toString();
  if (numberString.indexOf(".") === -1) {
    numberString = `${number}.0`;
  }
  return numberString;
}

/**
 * Gets the GLSL field
 *
 * @function
 *
 * @param {MetadataType} type
 * @param {Number} index
 * @returns {String}
 *
 * @private
 */
function getGlslField(type, index) {
  if (type === MetadataType.SCALAR) {
    return "";
  }
  return `[${index}]`;
}

/**
 * @function
 *
 * @param {VoxelPrimitive} that
 * @param {Context} context
 *
 * @private
 */
function buildDrawCommands(that, context) {
  const provider = that._provider;
  const traversal = that._traversal;
  const shapeType = provider.shape;
  const names = provider.names;
  const types = provider.types;
  const componentTypes = provider.componentTypes;
  const depthTest = that._depthTest;
  const useLogDepth = that._useLogDepth;
  const paddingBefore = that.paddingBefore;
  const paddingAfter = that.paddingAfter;
  const shape = that._shape;
  const shapeDefines = shape.shaderDefines;
  const minimumValues = provider.minimumValues;
  const maximumValues = provider.maximumValues;
  const jitter = that._jitter;
  const nearestSampling = that._nearestSampling;
  const sampleCount = traversal._sampleCount;
  const customShader = that._customShader;
  const attributeLength = types.length;
  const hasStatistics = defined(minimumValues) && defined(maximumValues);
  const clippingPlanes = that._clippingPlanes;
  const clippingPlanesLength =
    defined(clippingPlanes) && clippingPlanes.enabled
      ? clippingPlanes.length
      : 0;
  const clippingPlanesUnion = defined(clippingPlanes)
    ? clippingPlanes.unionClippingRegions
    : false;

  let uniformMap = that._uniformMap;

  // Build shader

  const shaderBuilder = new ShaderBuilder();

  // Vertex shader

  shaderBuilder.addVertexLines([VoxelVS]);

  // Fragment shader

  shaderBuilder.addFragmentLines([
    customShader.fragmentShaderText,
    "#line 0",
    VoxelFS,
  ]);

  // Fragment shader defines

  shaderBuilder.addDefine(
    "METADATA_COUNT",
    attributeLength,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addDefine(
    "MEGATEXTURE_2D",
    undefined,
    ShaderDestination.FRAGMENT
  );

  if (
    !Cartesian3.equals(paddingBefore, Cartesian3.ZERO) ||
    !Cartesian3.equals(paddingAfter, Cartesian3.ZERO)
  ) {
    shaderBuilder.addDefine("PADDING", undefined, ShaderDestination.FRAGMENT);
  }
  if (depthTest) {
    shaderBuilder.addDefine(
      "DEPTH_TEST",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  // Allow reading from log depth texture, but don't write log depth anywhere.
  // Note: This needs to be set even if depthTest is off because it affects the
  // derived command system.
  if (useLogDepth) {
    shaderBuilder.addDefine(
      "LOG_DEPTH_READ_ONLY",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (jitter) {
    shaderBuilder.addDefine("JITTER", undefined, ShaderDestination.FRAGMENT);
  }

  if (nearestSampling) {
    shaderBuilder.addDefine(
      "NEAREST_SAMPLING",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  if (hasStatistics) {
    shaderBuilder.addDefine(
      "STATISTICS",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  if (clippingPlanesLength > 0) {
    shaderBuilder.addDefine(
      "CLIPPING_PLANES",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "CLIPPING_PLANES_COUNT",
      clippingPlanesLength,
      ShaderDestination.FRAGMENT
    );
    if (clippingPlanesUnion) {
      shaderBuilder.addDefine(
        "CLIPPING_PLANES_UNION",
        undefined,
        ShaderDestination.FRAGMENT
      );
    }
  }

  // Count how many intersections the shader will do.
  let intersectionCount = shape.shaderMaximumIntersectionsLength;

  if (clippingPlanesLength > 0) {
    shaderBuilder.addDefine(
      "CLIPPING_PLANES_INTERSECTION_INDEX",
      intersectionCount,
      ShaderDestination.FRAGMENT
    );
    if (clippingPlanesLength === 1) {
      intersectionCount += 1;
    } else if (clippingPlanesUnion) {
      intersectionCount += 2;
    } else {
      intersectionCount += 1;
    }
  }

  if (depthTest) {
    shaderBuilder.addDefine(
      "DEPTH_INTERSECTION_INDEX",
      intersectionCount,
      ShaderDestination.FRAGMENT
    );
    intersectionCount += 1;
  }

  shaderBuilder.addDefine(
    "INTERSECTION_COUNT",
    intersectionCount,
    ShaderDestination.FRAGMENT
  );

  shaderBuilder.addDefine(
    "SAMPLE_COUNT",
    `${sampleCount}`,
    ShaderDestination.FRAGMENT
  );

  // Shape specific defines
  shaderBuilder.addDefine(
    `SHAPE_${shapeType}`,
    undefined,
    ShaderDestination.FRAGMENT
  );

  for (const key in shapeDefines) {
    if (shapeDefines.hasOwnProperty(key)) {
      let value = shapeDefines[key];
      // if value is undefined, don't define it
      // if value is true, define it to nothing
      if (defined(value)) {
        value = value === true ? undefined : value;
        shaderBuilder.addDefine(key, value, ShaderDestination.FRAGMENT);
      }
    }
  }

  // Fragment shader uniforms

  // Custom shader uniforms
  const customShaderUniforms = customShader.uniforms;
  uniformMap = that._uniformMap = combine(uniformMap, customShader.uniformMap);
  for (const uniformName in customShaderUniforms) {
    if (customShaderUniforms.hasOwnProperty(uniformName)) {
      const uniform = customShaderUniforms[uniformName];
      shaderBuilder.addUniform(
        uniform.type,
        uniformName,
        ShaderDestination.FRAGMENT
      );
    }
  }

  // The reason this uniform is added by shader builder is because some of the
  // dynamically generated shader code reads from it.
  shaderBuilder.addUniform(
    "sampler2D",
    "u_megatextureTextures[METADATA_COUNT]",
    ShaderDestination.FRAGMENT
  );

  // Fragment shader structs

  // PropertyStatistics structs
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const propertyStatisticsStructId = `PropertyStatistics_${name}`;
    const propertyStatisticsStructName = `PropertyStatistics_${name}`;
    shaderBuilder.addStruct(
      propertyStatisticsStructId,
      propertyStatisticsStructName,
      ShaderDestination.FRAGMENT
    );
    const glslType = getGlslType(type);
    shaderBuilder.addStructField(propertyStatisticsStructId, glslType, "min");
    shaderBuilder.addStructField(propertyStatisticsStructId, glslType, "max");
  }

  // Statistics struct
  const statisticsStructId = "Statistics";
  const statisticsStructName = "Statistics";
  const statisticsFieldName = "statistics";
  shaderBuilder.addStruct(
    statisticsStructId,
    statisticsStructName,
    ShaderDestination.FRAGMENT
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const propertyStructName = `PropertyStatistics_${name}`;
    const propertyFieldName = name;
    shaderBuilder.addStructField(
      statisticsStructId,
      propertyStructName,
      propertyFieldName
    );
  }

  // Metadata struct
  const metadataStructId = "Metadata";
  const metadataStructName = "Metadata";
  const metadataFieldName = "metadata";
  shaderBuilder.addStruct(
    metadataStructId,
    metadataStructName,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addStructField(
    metadataStructId,
    statisticsStructName,
    statisticsFieldName
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const glslType = getGlslType(type);
    shaderBuilder.addStructField(metadataStructId, glslType, name);
  }

  // VoxelProperty structs
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const glslType = getGlslPartialDerivativeType(type);
    const voxelPropertyStructId = `VoxelProperty_${name}`;
    const voxelPropertyStructName = `VoxelProperty_${name}`;
    shaderBuilder.addStruct(
      voxelPropertyStructId,
      voxelPropertyStructName,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeLocal"
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeWorld"
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeView"
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeValid"
    );
  }

  // Voxel struct
  const voxelStructId = "Voxel";
  const voxelStructName = "Voxel";
  const voxelFieldName = "voxel";
  shaderBuilder.addStruct(
    voxelStructId,
    voxelStructName,
    ShaderDestination.FRAGMENT
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const voxelPropertyStructName = `VoxelProperty_${name}`;
    shaderBuilder.addStructField(voxelStructId, voxelPropertyStructName, name);
  }
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionEC");
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionUv");
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionShapeUv");
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionUvLocal");
  shaderBuilder.addStructField(voxelStructId, "vec3", "viewDirUv");
  shaderBuilder.addStructField(voxelStructId, "vec3", "viewDirWorld");
  shaderBuilder.addStructField(voxelStructId, "float", "travelDistance");

  // FragmentInput struct
  const fragmentInputStructId = "FragmentInput";
  const fragmentInputStructName = "FragmentInput";
  shaderBuilder.addStruct(
    fragmentInputStructId,
    fragmentInputStructName,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    metadataStructName,
    metadataFieldName
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    voxelStructName,
    voxelFieldName
  );

  // Properties struct
  const propertiesStructId = "Properties";
  const propertiesStructName = "Properties";
  const propertiesFieldName = "properties";
  shaderBuilder.addStruct(
    propertiesStructId,
    propertiesStructName,
    ShaderDestination.FRAGMENT
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const glslType = getGlslType(type);
    shaderBuilder.addStructField(propertiesStructId, glslType, name);
  }

  // Fragment shader functions

  // clearProperties function
  {
    const functionId = "clearProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} clearProperties()`,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      const type = types[i];
      const componentType = componentTypes[i];
      const glslType = getGlslType(type, componentType);
      shaderBuilder.addFunctionLines(functionId, [
        `${propertiesFieldName}.${name} = ${glslType}(0.0);`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  // sumProperties function
  {
    const functionId = "sumProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} sumProperties(${propertiesStructName} propertiesA, ${propertiesStructName} propertiesB)`,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `${propertiesFieldName}.${name} = propertiesA.${name} + propertiesB.${name};`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  // scaleProperties function
  {
    const functionId = "scaleProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} scaleProperties(${propertiesStructName} ${propertiesFieldName}, float scale)`,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} scaledProperties = ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `scaledProperties.${name} *= scale;`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [`return scaledProperties;`]);
  }

  // mixProperties
  {
    const functionId = "mixProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} mixProperties(${propertiesStructName} propertiesA, ${propertiesStructName} propertiesB, float mixFactor)`,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `${propertiesFieldName}.${name} = mix(propertiesA.${name}, propertiesB.${name}, mixFactor);`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  // copyPropertiesToMetadata
  {
    const functionId = "copyPropertiesToMetadata";
    shaderBuilder.addFunction(
      functionId,
      `void copyPropertiesToMetadata(in ${propertiesStructName} ${propertiesFieldName}, inout ${metadataStructName} ${metadataFieldName})`,
      ShaderDestination.FRAGMENT
    );
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `${metadataFieldName}.${name} = ${propertiesFieldName}.${name};`,
      ]);
    }
  }

  // setStatistics function
  if (hasStatistics) {
    const functionId = "setStatistics";
    shaderBuilder.addFunction(
      functionId,
      `void setStatistics(inout ${statisticsStructName} ${statisticsFieldName})`,
      ShaderDestination.FRAGMENT
    );
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      const type = types[i];
      const componentCount = MetadataType.getComponentCount(type);
      for (let j = 0; j < componentCount; j++) {
        const glslField = getGlslField(type, j);
        const minimumValue = minimumValues[i][j];
        const maximumValue = maximumValues[i][j];
        shaderBuilder.addFunctionLines(functionId, [
          `${statisticsFieldName}.${name}.min${glslField} = ${getGlslNumberAsFloat(
            minimumValue
          )};`,
          `${statisticsFieldName}.${name}.max${glslField} = ${getGlslNumberAsFloat(
            maximumValue
          )};`,
        ]);
      }
    }
  }

  // getPropertiesFromMegatextureAtUv
  {
    const functionId = "getPropertiesFromMegatextureAtUv";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} getPropertiesFromMegatextureAtUv(vec2 texcoord)`,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      const type = types[i];
      const componentType = componentTypes[i];
      const glslTextureSwizzle = getGlslTextureSwizzle(type, componentType);
      shaderBuilder.addFunctionLines(functionId, [
        `properties.${name} = texture2D(u_megatextureTextures[${i}], texcoord)${glslTextureSwizzle};`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  if (clippingPlanesLength > 0) {
    // Extract the getClippingPlane function from the getClippingFunction string.
    // This is a bit of a hack.
    const functionId = "getClippingPlane";
    const entireFunction = getClippingFunction(clippingPlanes, context);
    const functionSignatureBegin = 0;
    const functionSignatureEnd = entireFunction.indexOf(")") + 1;
    const functionBodyBegin =
      entireFunction.indexOf("{", functionSignatureEnd) + 1;
    const functionBodyEnd = entireFunction.indexOf("}", functionBodyBegin);
    const functionSignature = entireFunction.slice(
      functionSignatureBegin,
      functionSignatureEnd
    );
    const functionBody = entireFunction.slice(
      functionBodyBegin,
      functionBodyEnd
    );
    shaderBuilder.addFunction(
      functionId,
      functionSignature,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [functionBody]);
  }

  // Compile shaders
  const shaderBuilderPick = shaderBuilder.clone();
  shaderBuilderPick.addDefine("PICKING", undefined, ShaderDestination.FRAGMENT);
  const shaderProgram = shaderBuilder.buildShaderProgram(context);
  const shaderProgramPick = shaderBuilderPick.buildShaderProgram(context);
  const renderState = RenderState.fromCache({
    cull: {
      enabled: true,
      face: CullFace.BACK,
    },
    depthTest: {
      enabled: false,
    },
    depthMask: false,
    // internally the shader does premultiplied alpha, so it makes sense to blend that way too
    blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
  });

  // Create the draw commands
  const viewportQuadVertexArray = context.getViewportQuadVertexArray();
  const drawCommand = new DrawCommand({
    vertexArray: viewportQuadVertexArray,
    primitiveType: PrimitiveType.TRIANGLES,
    renderState: renderState,
    shaderProgram: shaderProgram,
    uniformMap: uniformMap,
    pass: Pass.VOXELS,
    executeInClosestFrustum: true,
    owner: this,
    cull: depthTest, // don't cull or occlude if depth testing is off
    occlude: depthTest, // don't cull or occlude if depth testing is off
  });

  // Create the pick draw command
  const drawCommandPick = DrawCommand.shallowClone(
    drawCommand,
    new DrawCommand()
  );
  drawCommandPick.shaderProgram = shaderProgramPick;
  drawCommandPick.pickOnly = true;

  // Delete the old shader programs
  if (defined(that._drawCommand)) {
    const command = that._drawCommand;
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }
  if (defined(that._drawCommandPick)) {
    const command = that._drawCommandPick;
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }

  that._drawCommand = drawCommand;
  that._drawCommandPick = drawCommandPick;
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
