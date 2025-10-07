import buildVoxelDrawCommands from "./buildVoxelDrawCommands.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import Cesium3DTilesetStatistics from "./Cesium3DTilesetStatistics.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import clone from "../Core/clone.js";
import CustomShader from "./Model/CustomShader.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import Material from "./Material.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import PolylineCollection from "./PolylineCollection.js";
import VerticalExaggeration from "../Core/VerticalExaggeration.js";
import VoxelContent from "./VoxelContent.js";
import VoxelShapeType from "./VoxelShapeType.js";
import VoxelTraversal from "./VoxelTraversal.js";
import VoxelMetadataOrder from "./VoxelMetadataOrder.js";

/**
 * A primitive that renders voxel data from a {@link VoxelProvider}.
 *
 * @alias VoxelPrimitive
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {VoxelProvider} [options.provider] The voxel provider that supplies the primitive with tile data.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The model matrix used to transform the primitive.
 * @param {CustomShader} [options.customShader] The custom shader used to style the primitive.
 * @param {Clock} [options.clock] The clock used to control time dynamic behavior.
 * @param {Boolean} [options.calculateStatistics] Generate statistics for performance profile.
 *
 * @see VoxelProvider
 * @see Cesium3DTilesVoxelProvider
 * @see VoxelShapeType
 * @see {@link https://github.com/CesiumGS/cesium/tree/main/Documentation/CustomShaderGuide|Custom Shader Guide}
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function VoxelPrimitive(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  /**
   * @type {boolean}
   * @private
   */
  this._ready = false;

  /**
   * @type {VoxelProvider}
   * @private
   */
  this._provider = options.provider ?? VoxelPrimitive.DefaultProvider;

  /**
   * This member is not created until the provider and shape are ready.
   *
   * @type {VoxelTraversal}
   * @private
   */
  this._traversal = undefined;

  /**
   * @type {Cesium3DTilesetStatistics}
   * @private
   */
  this._statistics = new Cesium3DTilesetStatistics();

  /**
   * @type {boolean}
   * @private
   */
  this._calculateStatistics = options.calculateStatistics ?? false;

  /**
   * This member is not created until the provider is ready.
   *
   * @type {VoxelShape}
   * @private
   */
  this._shape = undefined;

  /**
   * @type {boolean}
   * @private
   */
  this._shapeVisible = false;

  /**
   * This member is not created until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._dimensions = new Cartesian3();

  /**
   * This member is not created until the provider is ready.
   *
   * @type {Cartesian3}
   * @private
   */
  this._inputDimensions = new Cartesian3();

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
   * @type {number}
   * @private
   */
  this._availableLevels = 1;

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
   * Minimum bounds with vertical exaggeration applied
   *
   * @type {Cartesian3}
   * @private
   */
  this._exaggeratedMinBounds = new Cartesian3();

  /**
   * Used to detect if the shape is dirty.
   *
   * @type {Cartesian3}
   * @private
   */
  this._exaggeratedMinBoundsOld = new Cartesian3();

  /**
   * Maximum bounds with vertical exaggeration applied
   *
   * @type {Cartesian3}
   * @private
   */
  this._exaggeratedMaxBounds = new Cartesian3();

  /**
   * Used to detect if the shape is dirty.
   *
   * @type {Cartesian3}
   * @private
   */
  this._exaggeratedMaxBoundsOld = new Cartesian3();

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
   * @type {number}
   * @private
   */
  this._clippingPlanesState = 0;

  /**
   * Keeps track of when the clipping planes are enabled / disabled
   *
   * @type {boolean}
   * @private
   */
  this._clippingPlanesEnabled = false;

  /**
   * The primitive's model matrix.
   *
   * @type {Matrix4}
   * @private
   */
  this._modelMatrix = Matrix4.clone(options.modelMatrix ?? Matrix4.IDENTITY);

  /**
   * Model matrix with vertical exaggeration applied. Only used for BOX shape type.
   *
   * @type {Matrix4}
   * @private
   */
  this._exaggeratedModelMatrix = Matrix4.clone(this._modelMatrix);

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
  this._customShader =
    options.customShader ?? VoxelPrimitive.DefaultCustomShader;

  /**
   * @type {Event}
   * @private
   */
  this._customShaderCompilationEvent = new Event();

  /**
   * @type {boolean}
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
   * @type {object}
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
  this._transformPositionLocalToWorld = new Matrix4();

  /**
   * @type {Matrix4}
   * @private
   */
  this._transformPositionWorldToLocal = new Matrix4();

  /**
   * Transforms a plane in Hessian normal form from local space to view space.
   * @type {Matrix4}
   * @private
   */
  this._transformPlaneLocalToView = new Matrix4();

  /**
   * @type {Matrix3}
   * @private
   */
  this._transformDirectionWorldToLocal = new Matrix3();

  // Rendering
  /**
   * @type {boolean}
   * @private
   */
  this._nearestSampling = false;

  /**
   * @type {number}
   * @private
   */
  this._levelBlendFactor = 0.0;

  /**
   * @type {number}
   * @private
   */
  this._stepSizeMultiplier = 1.0;

  /**
   * @type {boolean}
   * @private
   */
  this._depthTest = true;

  /**
   * @type {boolean}
   * @private
   */
  this._useLogDepth = undefined;

  /**
   * @type {number}
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
   * @type {boolean}
   * @private
   */
  this._debugDraw = false;

  /**
   * @type {boolean}
   * @private
   */
  this._disableRender = false;

  /**
   * @type {boolean}
   * @private
   */
  this._disableUpdate = false;

  /**
   * @type {Object<string, any>}
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
    inputDimensions: new Cartesian3(),
    paddingBefore: new Cartesian3(),
    paddingAfter: new Cartesian3(),
    transformPositionViewToLocal: new Matrix4(),
    transformDirectionViewToLocal: new Matrix3(),
    cameraPositionLocal: new Cartesian3(),
    cameraDirectionLocal: new Cartesian3(),
    cameraTileCoordinates: new Cartesian4(),
    cameraTileUv: new Cartesian3(),
    ndcSpaceAxisAlignedBoundingBox: new Cartesian4(),
    clippingPlanesTexture: undefined,
    clippingPlanesMatrix: new Matrix4(),
    renderBoundPlanesTexture: undefined,
    stepSize: 0,
    pickColor: new Color(),
  };

  /**
   * Shape specific shader defines from the previous shape update. Used to detect if the shader needs to be rebuilt.
   * @type {Object<string, any>}
   * @private
   */
  this._shapeDefinesOld = {};

  /**
   * Map uniform names to functions that return the uniform values.
   * @type {Object<string, function():any>}
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

  /**
   * The event fired to indicate that a tile's content was loaded.
   * <p>
   * This event is fired during the tileset traversal while the frame is being rendered
   * so that updates to the tile take effect in the same frame.  Do not create or modify
   * Cesium entities or primitives during the event listener.
   * </p>
   *
   * @type {Event}
   *
   * @example
   * voxelPrimitive.tileLoad.addEventListener(function() {
   *     console.log('A tile was loaded.');
   * });
   */
  this.tileLoad = new Event();

  /**
   * This event fires once for each visible tile in a frame.
   * <p>
   * This event is fired during the traversal while the frame is being rendered.
   *
   * @type {Event}
   *
   * @example
   * voxelPrimitive.tileVisible.addEventListener(function() {
   *     console.log('A tile is visible.');
   * });
   *
   */
  this.tileVisible = new Event();

  /**
   * The event fired to indicate that a tile's content failed to load.
   *
   * @type {Event}
   *
   * @example
   * voxelPrimitive.tileFailed.addEventListener(function() {
   *     console.log('An error occurred loading tile.');
   * });
   */
  this.tileFailed = new Event();

  /**
   * The event fired to indicate that a tile's content was unloaded.
   *
   * @type {Event}
   *
   * @example
   * voxelPrimitive.tileUnload.addEventListener(function() {
   *     console.log('A tile was unloaded from the cache.');
   * });
   *
   */
  this.tileUnload = new Event();

  /**
   * The event fired to indicate progress of loading new tiles. This event is fired when a new tile
   * is requested, when a requested tile is finished downloading, and when a downloaded tile has been
   * processed and is ready to render.
   * <p>
   * The number of pending tile requests, <code>numberOfPendingRequests</code>, and number of tiles
   * processing, <code>numberOfTilesProcessing</code> are passed to the event listener.
   * </p>
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   *
   * @example
   * voxelPrimitive.loadProgress.addEventListener(function(numberOfPendingRequests, numberOfTilesProcessing) {
   *     if ((numberOfPendingRequests === 0) && (numberOfTilesProcessing === 0)) {
   *         console.log('Finished loading');
   *         return;
   *     }
   *
   *     console.log(`Loading: requests: ${numberOfPendingRequests}, processing: ${numberOfTilesProcessing}`);
   * });
   */
  this.loadProgress = new Event();

  /**
   * The event fired to indicate that all tiles that meet the screen space error this frame are loaded. The voxel
   * primitive is completely loaded for this view.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   *
   * @example
   * voxelPrimitive.allTilesLoaded.addEventListener(function() {
   *     console.log('All tiles are loaded');
   * });
   */
  this.allTilesLoaded = new Event();

  /**
   * The event fired to indicate that all tiles that meet the screen space error this frame are loaded. This event
   * is fired once when all tiles in the initial view are loaded.
   * <p>
   * This event is fired at the end of the frame after the scene is rendered.
   * </p>
   *
   * @type {Event}
   *
   * @example
   * voxelPrimitive.initialTilesLoaded.addEventListener(function() {
   *     console.log('Initial tiles are loaded');
   * });
   *
   * @see Cesium3DTileset#allTilesLoaded
   */
  this.initialTilesLoaded = new Event();

  // If the provider fails to initialize the primitive will fail too.
  const provider = this._provider;
  initialize(this, provider);
}

function initialize(primitive, provider) {
  // Set the bounds
  const {
    shape: shapeType,
    minBounds = VoxelShapeType.getMinBounds(shapeType),
    maxBounds = VoxelShapeType.getMaxBounds(shapeType),
  } = provider;

  primitive.minBounds = minBounds;
  primitive.maxBounds = maxBounds;
  primitive.minClippingBounds = minBounds.clone();
  primitive.maxClippingBounds = maxBounds.clone();

  // Initialize the exaggerated versions of bounds and model matrix
  primitive._exaggeratedMinBounds = Cartesian3.clone(
    primitive._minBounds,
    primitive._exaggeratedMinBounds,
  );
  primitive._exaggeratedMaxBounds = Cartesian3.clone(
    primitive._maxBounds,
    primitive._exaggeratedMaxBounds,
  );
  primitive._exaggeratedModelMatrix = Matrix4.clone(
    primitive._modelMatrix,
    primitive._exaggeratedModelMatrix,
  );

  checkTransformAndBounds(primitive, provider);

  // Create the shape object, and update it so it is valid for VoxelTraversal
  const ShapeConstructor = VoxelShapeType.getShapeConstructor(shapeType);
  primitive._shape = new ShapeConstructor();
  primitive._shapeVisible = updateShapeAndTransforms(primitive);
}

Object.defineProperties(VoxelPrimitive.prototype, {
  /**
   * Gets a value indicating whether or not the primitive is ready for use.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
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
   */
  boundingSphere: {
    get: function () {
      return this._shape.boundingSphere;
    },
  },

  /**
   * Gets the oriented bounding box.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {OrientedBoundingBox}
   * @readonly
   */
  orientedBoundingBox: {
    get: function () {
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

      this._modelMatrix = Matrix4.clone(modelMatrix, this._modelMatrix);
    },
  },

  /**
   * Gets the shape type.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {VoxelShapeType}
   * @readonly
   */
  shape: {
    get: function () {
      return this._provider.shape;
    },
  },

  /**
   * Gets the dimensions of each voxel tile, in z-up orientation.
   * Does not include padding.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   * @readonly
   */
  dimensions: {
    get: function () {
      return this._dimensions;
    },
  },

  /**
   * Gets the dimensions of one tile of the input voxel data, in the input orientation.
   * Includes padding.
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   * @readonly
   */
  inputDimensions: {
    get: function () {
      return this._inputDimensions;
    },
  },

  /**
   * Gets the padding before the voxel data.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   * @readonly
   */
  paddingBefore: {
    get: function () {
      return this._paddingBefore;
    },
  },

  /**
   * Gets the padding after the voxel data.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Cartesian3}
   * @readonly
   */
  paddingAfter: {
    get: function () {
      return this._paddingAfter;
    },
  },

  /**
   * Gets the minimum value per channel of the voxel data.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {number[][]}
   * @readonly
   */
  minimumValues: {
    get: function () {
      return this._provider.minimumValues;
    },
  },

  /**
   * Gets the maximum value per channel of the voxel data.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {number[][]}
   * @readonly
   */
  maximumValues: {
    get: function () {
      return this._provider.maximumValues;
    },
  },

  /**
   * Gets or sets whether or not this primitive should be displayed.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {boolean}
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
   * @type {boolean}
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
   * @type {boolean}
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
   * @type {boolean}
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
   * Gets or sets the nearest sampling.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {boolean}
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
   * @type {number}
   * @private
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
   * @type {number}
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
   * @type {number}
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
   * Gets or sets the minimum bounds in the shape's local coordinate system.
   * Voxel data is stretched or squashed to fit the bounds.
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
   * Gets or sets the maximum bounds in the shape's local coordinate system.
   * Voxel data is stretched or squashed to fit the bounds.
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
        this._minClippingBounds,
      );
    },
  },

  /**
   * Gets or sets the maximum clipping location in the shape's local coordinate system.
   * Any voxel content outside the range is clipped.
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
        this._maxClippingBounds,
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
   * @see {@link https://github.com/CesiumGS/cesium/tree/main/Documentation/CustomShaderGuide|Custom Shader Guide}
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

  /**
   *  Loading and rendering information for requested content
   * To use `visited` and `numberOfTilesWithContentReady` statistics, set options._calculateStatistics` to `true` in the constructor.
   * @type {Cesium3DTilesetStatistics}
   * @readonly
   * @private
   */
  statistics: {
    get: function () {
      return this._statistics;
    },
  },
});

const scratchIntersect = new Cartesian4();
const scratchNdcAabb = new Cartesian4();
const scratchTransformPositionLocalToWorld = new Matrix4();
const scratchTransformPositionLocalToProjection = new Matrix4();
const scratchCameraPositionShapeUv = new Cartesian3();
const scratchCameraTileCoordinates = new Cartesian4();

/**
 * Updates the voxel primitive.
 *
 * @param {FrameState} frameState
 * @private
 */
VoxelPrimitive.prototype.update = function (frameState) {
  const provider = this._provider;
  const uniforms = this._uniforms;

  // Update the custom shader in case it has texture uniforms.
  this._customShader.update(frameState);

  // Initialize from the ready provider. This only happens once.
  const context = frameState.context;
  if (!this._ready) {
    initFromProvider(this, provider, context);
    // Set the primitive as ready after the first frame render since the user might set up events subscribed to
    // the post render event, and the primitive may not be ready for those past the first frame.
    frameState.afterRender.push(() => {
      this._ready = true;
      return true;
    });

    // Don't render until the next frame after ready is set to true
    return;
  }

  updateVerticalExaggeration(this, frameState);

  // Check if the shape is dirty before updating it. This needs to happen every
  // frame because the member variables can be modified externally via the
  // getters.
  const shapeDirty = checkTransformAndBounds(this, provider);
  if (shapeDirty) {
    this._shapeVisible = updateShapeAndTransforms(this);
    if (checkShapeDefines(this)) {
      this._shaderDirty = true;
    }
  }
  if (!this._shapeVisible) {
    return;
  }

  this._shape.updateViewTransforms(frameState);

  // Update the traversal and prepare for rendering.
  const keyframeLocation = getKeyframeLocation(
    provider.timeIntervalCollection,
    this._clock,
  );

  const traversal = this._traversal;
  const sampleCountOld = traversal._sampleCount;

  traversal.update(
    frameState,
    keyframeLocation,
    shapeDirty, // recomputeBoundingVolumes
    this._disableUpdate, // pauseUpdate
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
  if (defined(leafNodeTexture)) {
    uniforms.octreeLeafNodeTexture = traversal.leafNodeTexture;
    uniforms.octreeLeafNodeTexelSizeUv = Cartesian2.clone(
      traversal.leafNodeTexelSizeUv,
      uniforms.octreeLeafNodeTexelSizeUv,
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
  const { orientedBoundingBox } = this._shape;
  const ndcAabb = orientedBoundingBoxToNdcAabb(
    orientedBoundingBox,
    transformPositionWorldToProjection,
    scratchNdcAabb,
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
    uniforms.ndcSpaceAxisAlignedBoundingBox,
  );
  const transformPositionViewToWorld = context.uniformState.inverseView;
  const transformPositionViewToLocal = Matrix4.multiplyTransformation(
    this._transformPositionWorldToLocal,
    transformPositionViewToWorld,
    uniforms.transformPositionViewToLocal,
  );

  this._transformPlaneLocalToView = Matrix4.transpose(
    transformPositionViewToLocal,
    this._transformPlaneLocalToView,
  );

  const transformDirectionViewToWorld =
    context.uniformState.inverseViewRotation;
  uniforms.transformDirectionViewToLocal = Matrix3.multiply(
    this._transformDirectionWorldToLocal,
    transformDirectionViewToWorld,
    uniforms.transformDirectionViewToLocal,
  );
  uniforms.cameraPositionLocal = Matrix4.multiplyByPoint(
    this._transformPositionWorldToLocal,
    frameState.camera.positionWC,
    uniforms.cameraPositionLocal,
  );
  uniforms.cameraDirectionLocal = Matrix3.multiplyByVector(
    this._transformDirectionWorldToLocal,
    frameState.camera.directionWC,
    uniforms.cameraDirectionLocal,
  );
  const cameraTileCoordinates = getTileCoordinates(
    this,
    uniforms.cameraPositionLocal,
    scratchCameraTileCoordinates,
  );
  uniforms.cameraTileCoordinates = Cartesian4.fromElements(
    Math.floor(cameraTileCoordinates.x),
    Math.floor(cameraTileCoordinates.y),
    Math.floor(cameraTileCoordinates.z),
    cameraTileCoordinates.w,
    uniforms.cameraTileCoordinates,
  );
  uniforms.cameraTileUv = Cartesian3.fromElements(
    cameraTileCoordinates.x - Math.floor(cameraTileCoordinates.x),
    cameraTileCoordinates.y - Math.floor(cameraTileCoordinates.y),
    cameraTileCoordinates.z - Math.floor(cameraTileCoordinates.z),
    uniforms.cameraTileUv,
  );
  uniforms.stepSize = this._stepSizeMultiplier;

  updateRenderBoundPlanes(this, frameState);

  // Render the primitive
  const command = frameState.passes.pick
    ? this._drawCommandPick
    : frameState.passes.pickVoxel
      ? this._drawCommandPickVoxel
      : this._drawCommand;
  command.boundingVolume = this._shape.boundingSphere;
  frameState.commandList.push(command);
};

function updateRenderBoundPlanes(primitive, frameState) {
  const uniforms = primitive._uniforms;
  const { renderBoundPlanes } = primitive._shape;
  if (!defined(renderBoundPlanes)) {
    return;
  }
  renderBoundPlanes.update(frameState, primitive._transformPlaneLocalToView);
  uniforms.renderBoundPlanesTexture = renderBoundPlanes.texture;
}

/**
 * Converts a position in local space to tile coordinates.
 *
 * @param {VoxelPrimitive} primitive The primitive to get the tile coordinates for.
 * @param {Cartesian3} positionLocal The position in local space to convert to tile coordinates.
 * @param {Cartesian4} result The result object to store the tile coordinates.
 * @returns {Cartesian4} The tile coordinates of the supplied position.
 * @private
 */
function getTileCoordinates(primitive, positionLocal, result) {
  const shapeUv = primitive._shape.convertLocalToShapeUvSpace(
    positionLocal,
    scratchCameraPositionShapeUv,
  );

  const availableLevels = primitive._availableLevels;
  const numTiles = 2 ** (availableLevels - 1);

  return Cartesian4.fromElements(
    shapeUv.x * numTiles,
    shapeUv.y * numTiles,
    shapeUv.z * numTiles,
    availableLevels - 1,
    result,
  );
}

const scratchExaggerationScale = new Cartesian3();
const scratchExaggerationCenter = new Cartesian3();
const scratchCartographicCenter = new Cartographic();
const scratchExaggerationTranslation = new Cartesian3();

/**
 * Update the exaggerated bounds of a primitive to account for vertical exaggeration
 * @param {VoxelPrimitive} primitive
 * @param {FrameState} frameState
 * @private
 */
function updateVerticalExaggeration(primitive, frameState) {
  primitive._exaggeratedMinBounds = Cartesian3.clone(
    primitive._minBounds,
    primitive._exaggeratedMinBounds,
  );
  primitive._exaggeratedMaxBounds = Cartesian3.clone(
    primitive._maxBounds,
    primitive._exaggeratedMaxBounds,
  );

  if (primitive.shape === VoxelShapeType.ELLIPSOID) {
    // Apply the exaggeration by stretching the height bounds
    const relativeHeight = frameState.verticalExaggerationRelativeHeight;
    const exaggeration = frameState.verticalExaggeration;
    primitive._exaggeratedMinBounds.z =
      (primitive._minBounds.z - relativeHeight) * exaggeration + relativeHeight;
    primitive._exaggeratedMaxBounds.z =
      (primitive._maxBounds.z - relativeHeight) * exaggeration + relativeHeight;
  } else {
    // Apply the exaggeration via the model matrix
    const exaggerationScale = Cartesian3.fromElements(
      1.0,
      1.0,
      frameState.verticalExaggeration,
      scratchExaggerationScale,
    );
    primitive._exaggeratedModelMatrix = Matrix4.multiplyByScale(
      primitive._modelMatrix,
      exaggerationScale,
      primitive._exaggeratedModelMatrix,
    );
    primitive._exaggeratedModelMatrix = Matrix4.multiplyByTranslation(
      primitive._exaggeratedModelMatrix,
      computeBoxExaggerationTranslation(primitive, frameState),
      primitive._exaggeratedModelMatrix,
    );
  }
}

function computeBoxExaggerationTranslation(primitive, frameState) {
  // Compute translation based on box center, relative height, and exaggeration
  const {
    shapeTransform = Matrix4.IDENTITY,
    globalTransform = Matrix4.IDENTITY,
  } = primitive._provider;

  // Find the Cartesian position of the center of the OBB
  const initialCenter = Matrix4.getTranslation(
    shapeTransform,
    scratchExaggerationCenter,
  );
  const intermediateCenter = Matrix4.multiplyByPoint(
    primitive._modelMatrix,
    initialCenter,
    scratchExaggerationCenter,
  );
  const transformedCenter = Matrix4.multiplyByPoint(
    globalTransform,
    intermediateCenter,
    scratchExaggerationCenter,
  );

  // Find the cartographic height
  const ellipsoid = Ellipsoid.WGS84;
  const centerCartographic = ellipsoid.cartesianToCartographic(
    transformedCenter,
    scratchCartographicCenter,
  );

  let centerHeight = 0.0;
  if (defined(centerCartographic)) {
    centerHeight = centerCartographic.height;
  }

  // Find the shift that will put the center in the right position relative
  // to relativeHeight, after it is scaled by verticalExaggeration
  const exaggeratedHeight = VerticalExaggeration.getHeight(
    centerHeight,
    frameState.verticalExaggeration,
    frameState.verticalExaggerationRelativeHeight,
  );

  return Cartesian3.fromElements(
    0.0,
    0.0,
    (exaggeratedHeight - centerHeight) / frameState.verticalExaggeration,
    scratchExaggerationTranslation,
  );
}

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
          `VoxelPrimitive: Uniform name "${name}" is already defined`,
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
  primitive._dimensions = Cartesian3.clone(
    provider.dimensions,
    primitive._dimensions,
  );
  uniforms.dimensions = Cartesian3.clone(
    primitive._dimensions,
    uniforms.dimensions,
  );
  primitive._paddingBefore = Cartesian3.clone(
    provider.paddingBefore ?? Cartesian3.ZERO,
    primitive._paddingBefore,
  );
  uniforms.paddingBefore = Cartesian3.clone(
    primitive._paddingBefore,
    uniforms.paddingBefore,
  );
  primitive._paddingAfter = Cartesian3.clone(
    provider.paddingAfter ?? Cartesian3.ZERO,
    primitive._paddingAfter,
  );
  uniforms.paddingAfter = Cartesian3.clone(
    primitive._paddingAfter,
    uniforms.paddingAfter,
  );
  primitive._inputDimensions = Cartesian3.add(
    primitive._dimensions,
    primitive._paddingBefore,
    primitive._inputDimensions,
  );
  primitive._inputDimensions = Cartesian3.add(
    primitive._inputDimensions,
    primitive._paddingAfter,
    primitive._inputDimensions,
  );
  if (provider.metadataOrder === VoxelMetadataOrder.Y_UP) {
    const inputDimensionsY = primitive._inputDimensions.y;
    primitive._inputDimensions.y = primitive._inputDimensions.z;
    primitive._inputDimensions.z = inputDimensionsY;
  }
  uniforms.inputDimensions = Cartesian3.clone(
    primitive._inputDimensions,
    uniforms.inputDimensions,
  );
  primitive._availableLevels = provider.availableLevels ?? 1;

  // Create the VoxelTraversal, and set related uniforms
  const keyframeCount = provider.keyframeCount ?? 1;
  primitive._traversal = new VoxelTraversal(primitive, context, keyframeCount);
  primitive.statistics.texturesByteLength =
    primitive._traversal.textureMemoryByteLength;
  setTraversalUniforms(primitive._traversal, uniforms);
}

/**
 * Track changes in provider transform and primitive bounds
 * @param {VoxelPrimitive} primitive
 * @param {VoxelProvider} provider
 * @returns {boolean} Whether any of the transform or bounds changed
 * @private
 */
function checkTransformAndBounds(primitive, provider) {
  const shapeTransform = provider.shapeTransform ?? Matrix4.IDENTITY;
  const globalTransform = provider.globalTransform ?? Matrix4.IDENTITY;

  // Compound model matrix = global transform * model matrix * shape transform
  Matrix4.multiplyTransformation(
    globalTransform,
    primitive._exaggeratedModelMatrix,
    primitive._compoundModelMatrix,
  );
  Matrix4.multiplyTransformation(
    primitive._compoundModelMatrix,
    shapeTransform,
    primitive._compoundModelMatrix,
  );
  const numChanges =
    updateBound(primitive, "_compoundModelMatrix", "_compoundModelMatrixOld") +
    updateBound(primitive, "_minBounds", "_minBoundsOld") +
    updateBound(primitive, "_maxBounds", "_maxBoundsOld") +
    updateBound(
      primitive,
      "_exaggeratedMinBounds",
      "_exaggeratedMinBoundsOld",
    ) +
    updateBound(
      primitive,
      "_exaggeratedMaxBounds",
      "_exaggeratedMaxBoundsOld",
    ) +
    updateBound(primitive, "_minClippingBounds", "_minClippingBoundsOld") +
    updateBound(primitive, "_maxClippingBounds", "_maxClippingBoundsOld");
  return numChanges > 0;
}

/**
 * Compare old and new values of a bound and update the old if it is different.
 * @param {VoxelPrimitive} primitive The primitive with bounds properties
 * @param {string} newBoundKey A key pointing to a bounds property of type Cartesian3 or Matrix4
 * @param {string} oldBoundKey A key pointing to a bounds property of the same type as the property at newBoundKey
 * @returns {number} 1 if the bound value changed, 0 otherwise
 *
 * @private
 */
function updateBound(primitive, newBoundKey, oldBoundKey) {
  const newBound = primitive[newBoundKey];
  const oldBound = primitive[oldBoundKey];

  const changed = !newBound.equals(oldBound);
  if (changed) {
    newBound.clone(oldBound);
  }
  return changed ? 1 : 0;
}

/**
 * Update the shape and related transforms
 * @param {VoxelPrimitive} primitive
 * @returns {boolean} True if the shape is visible
 * @private
 */
function updateShapeAndTransforms(primitive) {
  const shape = primitive._shape;
  const visible = shape.update(
    primitive._compoundModelMatrix,
    primitive._exaggeratedMinBounds,
    primitive._exaggeratedMaxBounds,
    primitive.minClippingBounds,
    primitive.maxClippingBounds,
  );
  if (!visible) {
    return false;
  }

  primitive._transformPositionLocalToWorld = Matrix4.clone(
    shape.shapeTransform,
    primitive._transformPositionLocalToWorld,
  );
  primitive._transformPositionWorldToLocal = Matrix4.inverse(
    primitive._transformPositionLocalToWorld,
    primitive._transformPositionWorldToLocal,
  );
  primitive._transformDirectionWorldToLocal = Matrix4.getMatrix3(
    primitive._transformPositionWorldToLocal,
    primitive._transformDirectionWorldToLocal,
  );

  return true;
}

/**
 * Set uniforms that come from the traversal.
 * @param {VoxelTraversal} traversal
 * @param {object} uniforms
 * @private
 */
function setTraversalUniforms(traversal, uniforms) {
  uniforms.octreeInternalNodeTexture = traversal.internalNodeTexture;
  uniforms.octreeInternalNodeTexelSizeUv = Cartesian2.clone(
    traversal.internalNodeTexelSizeUv,
    uniforms.octreeInternalNodeTexelSizeUv,
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
    uniforms.megatextureSliceDimensions,
  );
  uniforms.megatextureTileDimensions = Cartesian2.clone(
    megatexture.regionCountPerMegatexture,
    uniforms.megatextureTileDimensions,
  );
  uniforms.megatextureVoxelSizeUv = Cartesian2.clone(
    megatexture.voxelSizeUv,
    uniforms.megatextureVoxelSizeUv,
  );
  uniforms.megatextureSliceSizeUv = Cartesian2.clone(
    megatexture.sliceSizeUv,
    uniforms.megatextureSliceSizeUv,
  );
  uniforms.megatextureTileSizeUv = Cartesian2.clone(
    megatexture.regionSizeUv,
    uniforms.megatextureTileSizeUv,
  );
}

/**
 * Track changes in shape-related shader defines
 * @param {VoxelPrimitive} primitive
 * @returns {boolean} True if any of the shape defines changed, requiring a shader rebuild
 * @private
 */
function checkShapeDefines(primitive) {
  const { shaderDefines } = primitive._shape;
  const shapeDefinesChanged = Object.keys(shaderDefines).some(
    (key) => shaderDefines[key] !== primitive._shapeDefinesOld[key],
  );
  if (shapeDefinesChanged) {
    primitive._shapeDefinesOld = clone(shaderDefines, true);
  }
  return shapeDefinesChanged;
}

/**
 * Find the keyframe location to render at. Doesn't need to be a whole number.
 * @param {TimeIntervalCollection} timeIntervalCollection
 * @param {Clock} clock
 * @returns {number}
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
    timeInterval.start,
  );
  const secondsDifferenceStart = JulianDate.secondsDifference(
    date,
    timeInterval.start,
  );
  const t = secondsDifferenceStart / totalSeconds;

  return timeIntervalIndex + t;
}

/**
 * Update the clipping planes state and associated uniforms
 *
 * @param {VoxelPrimitive} primitive
 * @param {FrameState} frameState
 * @returns {boolean} Whether the clipping planes changed, requiring a shader rebuild
 * @private
 */
function updateClippingPlanes(primitive, frameState) {
  const clippingPlanes = primitive.clippingPlanes;
  if (!defined(clippingPlanes)) {
    return false;
  }

  clippingPlanes.update(frameState);

  const { clippingPlanesState, enabled } = clippingPlanes;

  if (enabled) {
    const uniforms = primitive._uniforms;
    uniforms.clippingPlanesTexture = clippingPlanes.texture;

    // Compute the clipping plane's transformation to local space and then take the inverse
    // transpose to properly transform the hessian normal form of the plane.

    // transpose(inverse(worldToLocal * clippingPlaneLocalToWorld))
    // transpose(inverse(clippingPlaneLocalToWorld) * inverse(worldToLocal))
    // transpose(inverse(clippingPlaneLocalToWorld) * localToWorld)

    uniforms.clippingPlanesMatrix = Matrix4.transpose(
      Matrix4.multiplyTransformation(
        Matrix4.inverse(
          clippingPlanes.modelMatrix,
          uniforms.clippingPlanesMatrix,
        ),
        primitive._transformPositionLocalToWorld,
        uniforms.clippingPlanesMatrix,
      ),
      uniforms.clippingPlanesMatrix,
    );
  }

  if (
    primitive._clippingPlanesState === clippingPlanesState &&
    primitive._clippingPlanesEnabled === enabled
  ) {
    return false;
  }
  primitive._clippingPlanesState = clippingPlanesState;
  primitive._clippingPlanesEnabled = enabled;

  return true;
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
  this.statistics.texturesByteLength = 0;
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
  new Cartesian4(+1.0, +1.0, +1.0, 1.0),
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
  6,
);

const scratchCornersClipSpace = new Array(
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
  new Cartesian4(),
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
  result,
) {
  const transformPositionLocalToWorld = Matrix4.fromRotationTranslation(
    orientedBoundingBox.halfAxes,
    orientedBoundingBox.center,
    scratchTransformPositionLocalToWorld,
  );
  const transformPositionLocalToProjection = Matrix4.multiply(
    worldToProjection,
    transformPositionLocalToWorld,
    scratchTransformPositionLocalToProjection,
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
      cornersClipSpace[cornerIndex],
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
            scratchIntersect,
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
    const colors = [Color.RED, Color.LIME, Color.BLUE];
    const color = colors[level % 3];

    makePolylineBox(tile.orientedBoundingBox, color, thickness);

    if (defined(tile.children)) {
      for (let i = 0; i < 8; i++) {
        drawTile(tile.children[i]);
      }
    }
  }

  makePolylineBox(that._shape.orientedBoundingBox, Color.WHITE, 5.0);

  drawTile(traversal.rootNode);

  const axisThickness = 10.0;
  makePolylineLineSegment(
    Cartesian3.ZERO,
    polylineXAxis,
    Color.RED,
    axisThickness,
  );
  makePolylineLineSegment(
    Cartesian3.ZERO,
    polylineYAxis,
    Color.LIME,
    axisThickness,
  );
  makePolylineLineSegment(
    Cartesian3.ZERO,
    polylineZAxis,
    Color.BLUE,
    axisThickness,
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
  this.shape = VoxelShapeType.BOX;
  this.dimensions = new Cartesian3(1, 1, 1);
  this.names = ["data"];
  this.types = [MetadataType.SCALAR];
  this.componentTypes = [MetadataComponentType.FLOAT32];
  this.maximumTileCount = 1;
}

DefaultVoxelProvider.prototype.requestData = function (options) {
  const tileLevel = defined(options) ? (options.tileLevel ?? 0) : 0;
  if (tileLevel >= 1) {
    return undefined;
  }

  const content = new VoxelContent({ metadata: [new Float32Array(1)] });
  return Promise.resolve(content);
};

VoxelPrimitive.DefaultProvider = new DefaultVoxelProvider();

export default VoxelPrimitive;
