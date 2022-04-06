import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
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
import PrimitiveType from "../Core/PrimitiveType.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import BlendingState from "./BlendingState.js";
import CullFace from "./CullFace.js";
import CustomShader from "./ModelExperimental/CustomShader.js";
import Material from "./Material.js";
import PolylineCollection from "./PolylineCollection.js";
import VoxelShapeType from "./VoxelShapeType.js";
import VoxelTraversal from "./VoxelTraversal.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import ShaderBuilder from "../Renderer/ShaderBuilder.js";
import VoxelFS from "../Shaders/VoxelFS.js";
import VoxelVS from "../Shaders/VoxelVS.js";
import MetadataType from "./MetadataType.js";
/**
 * A primitive that renders voxel data from a {@link VoxelProvider}.
 *
 * TODO: make sure the following terms/definitions are consistent across all files
 * world space: Cartesian WGS84
 * local space: Cartesian [-0.5, 0.5] aligned with shape.
 *      For box, the origin is the center of the box, and the six sides sit on the planes x = -0.5, x = 0.5 etc.
 *      For cylinder, the origin is the center of the cylinder with the cylinder enclosed by the [-0.5, 0.5] box on xy-plane. Positive x-axis points to theta = 0. The top and bottom caps sit at planes z = -0.5, z = 0.5. Positive y points to theta = pi/2
 *      For ellipsoid, the origin is the center of the ellipsoid. The maximum height of the ellipsoid touches -0.5, 0.5 in xyz directions.
 * intersection space: local space times 2 to be [-1, 1]. Used for ray intersection calculation
 * UV space: local space plus 0.5 to be [0, 1].
 * shape space: In the coordinate system of the shape [0, 1]
 *      For box, this is the same as UV space
 *      For cylinder, the coordinate system is (radius, theta, z). theta = 0 is aligned with x axis
 *      For ellipsoid, the coordinate system is (longitude, latitude, height). where 0 is the minimum value in each dimension, and 1 is the max.
 *
 * @alias VoxelPrimitive
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {VoxelProvider} options.provider The voxel provider that supplies the primitive with tile data.
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

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.provider", options.provider);
  //>>includeEnd('debug');

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
  this._provider = options.provider;

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

  // /**
  //  * @type {TimeIntervalCollection}
  //  * @private
  //  */
  // this._timeIntervalCollection = undefined;

  // /**
  //  * @type {Clock}
  //  * @private
  //  */
  // this._clock = options.clock;

  // /**
  //  * @type {Number}
  //  * @private
  //  */
  // this._keyframeCount = 1;

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
  this._stepSizeMultiplier = 1.0;

  /**
   * @type {Boolean}
   * @private
   */
  this._despeckle = false;

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

  // Uniforms
  /**
   * @type {Object.<string, any>}
   * @private
   */
  this._uniformMapValues = {
    /**
     * @ignore
     * @type {Texture}
     */
    octreeInternalNodeTexture: undefined,
    octreeInternalNodeTilesPerRow: 0,
    octreeInternalNodeTexelSizeUv: new Cartesian2(),
    /**
     * @ignore
     * @type {Texture}
     */
    octreeLeafNodeTexture: undefined,
    octreeLeafNodeTilesPerRow: 0,
    octreeLeafNodeTexelSizeUv: new Cartesian2(),
    /**
     * @ignore
     * @type {Texture[]}
     */
    megatextureTextures: [],
    megatextureSliceDimensions: new Cartesian2(),
    megatextureTileDimensions: new Cartesian2(),
    megatextureVoxelSizeUv: new Cartesian2(),
    megatextureSliceSizeUv: new Cartesian2(),
    megatextureTileSizeUv: new Cartesian2(),
    dimensions: new Cartesian3(),
    paddingBefore: new Cartesian3(),
    paddingAfter: new Cartesian3(),
    minimumValues: [],
    maximumValues: [],
    transformPositionViewToUv: new Matrix4(),
    transformPositionUvToView: new Matrix4(),
    transformDirectionViewToLocal: new Matrix3(),
    transformNormalLocalToWorld: new Matrix3(),
    cameraPositionUv: new Cartesian3(),
    ndcSpaceAxisAlignedBoundingBox: new Cartesian4(),
    stepSize: 1.0,
    ellipsoidInverseHeightDifferenceUv: 1.0,
    ellipsoidInverseInnerScaleUv: 1.0,
    ellipsoidRadiiUv: new Cartesian3(),
    ellipsoidInnerRadiiUv: new Cartesian3(),
    ellipsoidInverseRadiiSquaredUv: new Cartesian3(),
    minBounds: new Cartesian3(),
    maxBounds: new Cartesian3(),
    minBoundsUv: new Cartesian3(),
    maxBoundsUv: new Cartesian3(),
    inverseBounds: new Cartesian3(),
    inverseBoundsUv: new Cartesian3(),
    minClippingBounds: new Cartesian3(),
    maxClippingBounds: new Cartesian3(),
    pickColor: new Color(),
  };

  // Automatically generate uniform map from the uniform values
  /**
   * @type {Object.<string, function():any>}
   * @private
   */
  this._uniformMap = {};
  const uniformMapValues = this._uniformMapValues;
  function getUniformFunction(key) {
    return function () {
      return uniformMapValues[key];
    };
  }
  for (const key in uniformMapValues) {
    if (uniformMapValues.hasOwnProperty(key)) {
      this._uniformMap[`u_${key}`] = getUniformFunction(key);
    }
  }

  // If the provider fails to initialize the primitive will fail too.
  const provider = this._provider;
  const primitive = this;
  provider.readyPromise.catch(function (error) {
    primitive._readyPromise.reject(`provider failed with error:\n${error}`);
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
          "orientedBoudingBox must not be called before the primitive is ready."
        );
      }
      //>>includeEnd('debug');

      return this._shape.orientedBoudingBox;
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
   * Gets or sets whether to reduce thin and noisy details.
   *
   * @memberof VoxelPrimitive.prototype
   * @type {Boolean}
   */
  despeckle: {
    get: function () {
      return this._despeckle;
    },
    set: function (despeckle) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("despeckle", despeckle);
      //>>includeEnd('debug');

      if (this._despeckle !== despeckle) {
        this._despeckle = despeckle;
        this._shaderDirty = true;
      }
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
const scratchEllipsoidRadii = new Cartesian3();
const scratchLocalScale = new Cartesian3();
const scratchInverseLocalScale = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchInverseRotation = new Matrix3();
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
  const uniforms = this._uniformMapValues;

  // Update the provider, if applicable.
  if (defined(provider.update)) {
    provider.update(frameState);
  }

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

    // Set uniforms for picking
    uniforms.pickColor = Color.clone(this._pickId.color, uniforms.pickColor);

    // Set member variables that come from the provider.

    // const keyframeCount = defaultValue(provider.keyframeCount, 1);
    // // TODO remove?
    // that._keyframeCount = defaultValue(
    //   provider.keyframeCount,
    //   that._keyframeCount
    // );
    // // TODO remove?
    // that._timeIntervalCollection = defaultValue(
    //   provider.timeIntervalCollection,
    //   that._timeIntervalCollection
    // );

    const dimensions = provider.dimensions;
    const shapeType = provider.shape;
    const defaultMinBounds = VoxelShapeType.getMinBounds(shapeType);
    const defaultMaxBounds = VoxelShapeType.getMaxBounds(shapeType);
    const minBounds = defaultValue(provider.minBounds, defaultMinBounds);
    const maxBounds = defaultValue(provider.maxBounds, defaultMaxBounds);
    const minimumValues = provider.minimumValues;
    const maximumValues = provider.maximumValues;

    const ShapeConstructor = VoxelShapeType.getShapeConstructor(shapeType);
    this._shape = new ShapeConstructor();
    this._minBounds = Cartesian3.clone(minBounds, this._minBounds);
    this._maxBounds = Cartesian3.clone(maxBounds, this._maxBounds);
    this._minClippingBounds = Cartesian3.clone(
      defaultMinBounds,
      this._minClippingBounds
    );
    this._maxClippingBounds = Cartesian3.clone(
      defaultMaxBounds,
      this._maxClippingBounds
    );
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
    if (defined(minimumValues) && defined(maximumValues)) {
      uniforms.minimumValues = minimumValues.slice();
      uniforms.maximumValues = maximumValues.slice();
    }
  }

  // Check if the shape is dirty before updating it. This needs to happen every
  // frame because the member variables can be modified externally via the
  // getters.
  const primitiveModelMatrix = this._modelMatrix;
  const providerModelMatrix = defaultValue(
    provider.modelMatrix,
    Matrix4.IDENTITY
  );
  const compoundModelMatrix = Matrix4.multiplyTransformation(
    providerModelMatrix,
    primitiveModelMatrix,
    this._compoundModelMatrix
  );
  const compoundModelMatrixOld = this._compoundModelMatrixOld;
  const compoundModelMatrixDirty = !Matrix4.equals(
    compoundModelMatrix,
    compoundModelMatrixOld
  );
  const shape = this._shape;
  const shapeType = provider.shape;

  const minBounds = this._minBounds;
  const maxBounds = this._maxBounds;
  const minBoundsOld = this._minBoundsOld;
  const maxBoundsOld = this._maxBoundsOld;
  const minBoundsDirty = !Cartesian3.equals(minBounds, minBoundsOld);
  const maxBoundsDirty = !Cartesian3.equals(maxBounds, maxBoundsOld);
  const shapeIsDirty =
    compoundModelMatrixDirty || minBoundsDirty || maxBoundsDirty;

  // Update the shape if dirty or the first frame.
  if (!this._ready || shapeIsDirty) {
    shape.update(compoundModelMatrix, minBounds, maxBounds);

    if (compoundModelMatrixDirty) {
      this._compoundModelMatrixOld = Matrix4.clone(
        compoundModelMatrix,
        this._compoundModelMatrixOld
      );
    }

    if (minBoundsDirty || maxBoundsDirty) {
      const defaultMinBounds = VoxelShapeType.getMinBounds(shapeType);
      const defaultMaxBounds = VoxelShapeType.getMaxBounds(shapeType);
      const isDefaultBoundsMinX = minBounds.x === defaultMinBounds.x;
      const isDefaultBoundsMinY = minBounds.y === defaultMinBounds.y;
      const isDefaultBoundsMinZ = minBounds.z === defaultMinBounds.z;
      const isDefaultBoundsMaxX = maxBounds.x === defaultMaxBounds.x;
      const isDefaultBoundsMaxY = maxBounds.y === defaultMaxBounds.y;
      const isDefaultBoundsMaxZ = maxBounds.z === defaultMaxBounds.z;

      if (minBoundsDirty) {
        const isDefaultOldBoundsMinX = minBoundsOld.x === defaultMinBounds.x;
        const isDefaultOldBoundsMinY = minBoundsOld.y === defaultMinBounds.y;
        const isDefaultOldBoundsMinZ = minBoundsOld.z === defaultMinBounds.z;
        if (
          isDefaultBoundsMinX !== isDefaultOldBoundsMinX ||
          isDefaultBoundsMinY !== isDefaultOldBoundsMinY ||
          isDefaultBoundsMinZ !== isDefaultOldBoundsMinZ
        ) {
          this._shaderDirty = true;
        }
        this._minBoundsOld = Cartesian3.clone(minBounds, this._minBoundsOld);
      }

      if (maxBoundsDirty) {
        const isDefaultOldBoundsMaxX = maxBoundsOld.x === defaultMaxBounds.x;
        const isDefaultOldBoundsMaxY = maxBoundsOld.y === defaultMaxBounds.y;
        const isDefaultOldBoundsMaxZ = maxBoundsOld.z === defaultMaxBounds.z;
        if (
          isDefaultBoundsMaxX !== isDefaultOldBoundsMaxX ||
          isDefaultBoundsMaxY !== isDefaultOldBoundsMaxY ||
          isDefaultBoundsMaxZ !== isDefaultOldBoundsMaxZ
        ) {
          this._shaderDirty = true;
        }
        this._maxBoundsOld = Cartesian3.clone(maxBounds, this._maxBoundsOld);
      }

      // Set uniforms for bounds.
      if (
        !isDefaultBoundsMinX ||
        !isDefaultBoundsMinY ||
        !isDefaultBoundsMinZ ||
        !isDefaultBoundsMaxX ||
        !isDefaultBoundsMaxY ||
        !isDefaultBoundsMaxZ
      ) {
        uniforms.minBounds = Cartesian3.clone(minBounds, uniforms.minBounds);
        uniforms.maxBounds = Cartesian3.clone(maxBounds, uniforms.maxBounds);
        uniforms.inverseBounds = Cartesian3.divideComponents(
          Cartesian3.ONE,
          Cartesian3.subtract(maxBounds, minBounds, uniforms.inverseBounds),
          uniforms.inverseBounds
        );

        if (shapeType === VoxelShapeType.BOX) {
          const minXUv = minBounds.x * 0.5 + 0.5;
          const maxXUv = maxBounds.x * 0.5 + 0.5;
          const minYUv = minBounds.y * 0.5 + 0.5;
          const maxYUv = maxBounds.y * 0.5 + 0.5;
          const minZUv = minBounds.z * 0.5 + 0.5;
          const maxZUv = maxBounds.z * 0.5 + 0.5;
          uniforms.minBoundsUv = Cartesian3.fromElements(
            minXUv,
            minYUv,
            minZUv,
            uniforms.minBoundsUv
          );
          uniforms.maxBoundsUv = Cartesian3.fromElements(
            maxXUv,
            maxYUv,
            maxZUv,
            uniforms.maxBoundsUv
          );
        } else if (shapeType === VoxelShapeType.ELLIPSOID) {
          const minLongitudeUv =
            (minBounds.x - defaultMinBounds.x) /
            (defaultMaxBounds.x - defaultMinBounds.x);
          const maxLongitudeUv =
            (maxBounds.x - defaultMinBounds.x) /
            (defaultMaxBounds.x - defaultMinBounds.x);
          const minLatitudeUv =
            (minBounds.y - defaultMinBounds.y) /
            (defaultMaxBounds.y - defaultMinBounds.y);
          const maxLatitudeUv =
            (maxBounds.y - defaultMinBounds.y) /
            (defaultMaxBounds.y - defaultMinBounds.y);
          const minHeightUv = 0.0; // don't know what to do with these yet
          const maxHeightUv = 0.0; // don't know what to do with these yet

          uniforms.minBoundsUv = Cartesian3.fromElements(
            minLongitudeUv,
            minLatitudeUv,
            minHeightUv,
            uniforms.minBoundsUv
          );
          uniforms.maxBoundsUv = Cartesian3.fromElements(
            maxLongitudeUv,
            maxLatitudeUv,
            maxHeightUv,
            uniforms.maxBoundsUv
          );
        } else if (shapeType === VoxelShapeType.CYLINDER) {
          const minRadiusUv = minBounds.x;
          const maxRadiusUv = maxBounds.x;
          const minHeightUv = minBounds.y * 0.5 + 0.5;
          const maxHeightUv = maxBounds.y * 0.5 + 0.5;
          const minAngleUv = (minBounds.z + CesiumMath.PI) / CesiumMath.TWO_PI;
          const maxAngleUv = (maxBounds.z + CesiumMath.PI) / CesiumMath.TWO_PI;
          uniforms.minBoundsUv = Cartesian3.fromElements(
            minRadiusUv,
            minHeightUv,
            minAngleUv,
            uniforms.minBoundsUv
          );
          uniforms.maxBoundsUv = Cartesian3.fromElements(
            maxRadiusUv,
            maxHeightUv,
            maxAngleUv,
            uniforms.maxBoundsUv
          );
        }

        uniforms.inverseBoundsUv = Cartesian3.divideComponents(
          Cartesian3.ONE,
          Cartesian3.subtract(
            uniforms.maxBoundsUv,
            uniforms.minBoundsUv,
            uniforms.inverseBoundsUv
          ),
          uniforms.inverseBoundsUv
        );
      }
    }

    // Set other uniforms when the shape is dirty
    if (shapeType === VoxelShapeType.ELLIPSOID) {
      const radii = Matrix4.getScale(
        compoundModelMatrix,
        scratchEllipsoidRadii
      );
      const minHeight = minBounds.z;
      const maxHeight = maxBounds.z;
      // The farthest distance a point can be from the center of the ellipsoid.
      const maxExtent = Cartesian3.maximumComponent(radii) + maxHeight;
      // The percent of space that is between the inner and outer ellipsoid
      const thickness = (maxHeight - minHeight) / maxExtent;
      // The percent of space that is taken up by the inner ellipsoid.
      const innerScale = 1.0 - thickness;

      // The ellipsoid radii scaled to [0,1]. The max ellipsoid radius will be 1.0 and others will be less.
      uniforms.ellipsoidRadiiUv = Cartesian3.fromElements(
        (radii.x + maxHeight) / maxExtent,
        (radii.y + maxHeight) / maxExtent,
        (radii.z + maxHeight) / maxExtent,
        uniforms.ellipsoidRadiiUv
      );

      // The inner ellipsoid radii scaled to [0,innerScale]. The max inner ellipsoid radius will be innerScale and others will be less.
      uniforms.ellipsoidInnerRadiiUv = Cartesian3.multiplyByScalar(
        uniforms.ellipsoidRadiiUv,
        innerScale,
        uniforms.ellipsoidInnerRadiiUv
      );

      // Used to compute geodetic surface normal.
      uniforms.ellipsoidInverseRadiiSquaredUv = Cartesian3.divideComponents(
        Cartesian3.ONE,
        Cartesian3.multiplyComponents(
          uniforms.ellipsoidRadiiUv,
          uniforms.ellipsoidRadiiUv,
          uniforms.ellipsoidInverseRadiiSquaredUv
        ),
        uniforms.ellipsoidInverseRadiiSquaredUv
      );
      uniforms.ellipsoidInverseHeightDifferenceUv = 1.0 / thickness;
      uniforms.ellipsoidInverseInnerScaleUv = 1.0 / innerScale;
    }

    // Math that's only valid if the shape is visible.
    if (shape.isVisible) {
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
      const inverseRotation = Matrix3.transpose(
        rotation,
        scratchInverseRotation
      );
      const scale = Matrix4.getScale(
        transformPositionLocalToWorld,
        scratchScale
      );
      const maximumScaleComponent = Cartesian3.maximumComponent(scale);
      const localScale = Cartesian3.divideByScalar(
        scale,
        maximumScaleComponent,
        scratchLocalScale
      );
      const inverseLocalScale = Cartesian3.divideComponents(
        Cartesian3.ONE,
        localScale,
        scratchInverseLocalScale
      );
      const rotationAndLocalScale = Matrix3.multiplyByScale(
        rotation,
        localScale,
        scratchRotationAndLocalScale
      );

      // Set member variables when the shape is dirty
      const dimensions = provider.dimensions;
      this._stepSizeUv = shape.computeApproximateStepSize(dimensions);
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
      this._transformDirectionWorldToLocal = Matrix3.setScale(
        inverseRotation,
        inverseLocalScale,
        this._transformDirectionWorldToLocal
      );
      this._transformNormalLocalToWorld = Matrix3.inverseTranspose(
        rotationAndLocalScale,
        this._transformNormalLocalToWorld
      );
    }
  }

  // Initialize the voxel traversal now that the shape is ready to use. This only happens once.
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
    const keyframeCount = 1; //this._keyframeCount;

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
    const traversal = this._traversal;
    const useLeafNodeTexture = traversal.useLeafNodeTexture;

    uniforms.octreeInternalNodeTexture = traversal.internalNodeTexture;
    uniforms.octreeInternalNodeTexelSizeUv = Cartesian2.clone(
      traversal.internalNodeTexelSizeUv,
      uniforms.octreeInternalNodeTexelSizeUv
    );
    uniforms.octreeInternalNodeTilesPerRow = traversal.internalNodeTilesPerRow;

    if (useLeafNodeTexture) {
      uniforms.octreeLeafNodeTexture = traversal.leafNodeTexture;
      uniforms.octreeLeafNodeTexelSizeUv = Cartesian2.clone(
        traversal.leafNodeTexelSizeUv,
        uniforms.octreeLeafNodeTexelSizeUv
      );
      uniforms.octreeLeafNodeTilesPerRow = traversal.leafNodeTilesPerRow;
    }

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
  } else if (shape.isVisible) {
    // Find the keyframe location to render at. Doesn't need to be a whole number.
    let keyframeLocation = 0.0;
    const clock = this._clock;
    const timeIntervalCollection = this._timeIntervalCollection;
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

    // Update the voxel traversal
    const traversal = this._traversal;

    const hasLoadedData = traversal.update(
      frameState,
      keyframeLocation,
      shapeIsDirty, // recomputeBoundingVolumes
      this._disableUpdate // pauseUpdate
    );

    if (hasLoadedData && this._debugDraw) {
      // Debug draw bounding boxes and other things. Must go after traversal update
      // because that's what updates the tile bounding boxes.
      debugDraw(this, frameState);
    }

    if (hasLoadedData && !this._disableRender) {
      // Process clipping bounds.
      const minClip = this._minClippingBounds;
      const maxClip = this._maxClippingBounds;
      const minClipOld = this._minClippingBoundsOld;
      const maxClipOld = this._maxClippingBoundsOld;
      const minClipDirty = !Cartesian3.equals(minClip, minClipOld);
      const maxClipDirty = !Cartesian3.equals(maxClip, maxClipOld);
      const clippingBoundsDirty = minClipDirty || maxClipDirty;
      if (clippingBoundsDirty) {
        const defaultMinBounds = VoxelShapeType.getMinBounds(shapeType);
        const defaultMaxBounds = VoxelShapeType.getMaxBounds(shapeType);
        const isDefaultClippingBoundsMinX = minClip.x === defaultMinBounds.x;
        const isDefaultClippingBoundsMinY = minClip.y === defaultMinBounds.y;
        const isDefaultClippingBoundsMinZ = minClip.z === defaultMinBounds.z;
        const isDefaultClippingBoundsMaxX = maxClip.x === defaultMaxBounds.x;
        const isDefaultClippingBoundsMaxY = maxClip.y === defaultMaxBounds.y;
        const isDefaultClippingBoundsMaxZ = maxClip.z === defaultMaxBounds.z;

        if (minClipDirty) {
          const isDefaultOldClipMinX = minClipOld.x === defaultMinBounds.x;
          const isDefaultOldClipMinY = minClipOld.y === defaultMinBounds.y;
          const isDefaultOldClipMinZ = minClipOld.z === defaultMinBounds.z;
          if (
            isDefaultClippingBoundsMinX !== isDefaultOldClipMinX ||
            isDefaultClippingBoundsMinY !== isDefaultOldClipMinY ||
            isDefaultClippingBoundsMinZ !== isDefaultOldClipMinZ
          ) {
            this._shaderDirty = true;
          }
          this._minClippingBoundsOld = Cartesian3.clone(
            minClip,
            this._minClippingBoundsOld
          );
        }
        if (maxClipDirty) {
          const isDefaultOldClipMaxX = maxClipOld.x === defaultMaxBounds.x;
          const isDefaultOldClipMaxY = maxClipOld.y === defaultMaxBounds.y;
          const isDefaultOldClipMaxZ = maxClipOld.z === defaultMaxBounds.z;
          if (
            isDefaultClippingBoundsMaxX !== isDefaultOldClipMaxX ||
            isDefaultClippingBoundsMaxY !== isDefaultOldClipMaxY ||
            isDefaultClippingBoundsMaxZ !== isDefaultOldClipMaxZ
          ) {
            this._shaderDirty = true;
          }
          this._maxClippingBoundsOld = Cartesian3.clone(
            maxClip,
            this._maxClippingBoundsOld
          );
        }
        if (
          !isDefaultClippingBoundsMinX ||
          !isDefaultClippingBoundsMinY ||
          !isDefaultClippingBoundsMinZ ||
          !isDefaultClippingBoundsMaxX ||
          !isDefaultClippingBoundsMaxY ||
          !isDefaultClippingBoundsMaxZ
        ) {
          // Set clipping uniforms
          uniforms.minClippingBounds = Cartesian3.clone(
            minClip,
            uniforms.minClippingBounds
          );
          uniforms.maxClippingBounds = Cartesian3.clone(
            maxClip,
            uniforms.maxClippingBounds
          );
        }
      }

      // Check if log depth changed
      if (this._useLogDepth !== frameState.useLogDepth) {
        this._useLogDepth = frameState.useLogDepth;
        this._shaderDirty = true;
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
        const uniforms = this._uniformMapValues;
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
  const shapeType = provider.shape;
  const names = provider.names;
  const types = provider.types;
  const componentTypes = provider.componentTypes;
  const depthTest = that._depthTest;
  const useLogDepth = that._useLogDepth;
  const paddingBefore = that.paddingBefore;
  const paddingAfter = that.paddingAfter;
  const minBounds = that._minBounds;
  const maxBounds = that._maxBounds;
  const minimumValues = provider.minimumValues;
  const maximumValues = provider.maximumValues;
  const minClippingBounds = that._minClippingBounds;
  const maxClippingBounds = that._maxClippingBounds;
  const keyframeCount = that._keyframeCount;
  const despeckle = that._despeckle;
  const jitter = that._jitter;
  const nearestSampling = that._nearestSampling;
  const customShader = that._customShader;
  const attributeLength = types.length;
  const hasStatistics = defined(minimumValues) && defined(maximumValues);

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
    `SHAPE_${shapeType}`,
    undefined,
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
  if (despeckle) {
    shaderBuilder.addDefine("DESPECKLE", undefined, ShaderDestination.FRAGMENT);
  }
  if (hasStatistics) {
    shaderBuilder.addDefine(
      "STATISTICS",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  const sampleCount = keyframeCount > 1 ? 2 : 1;
  shaderBuilder.addDefine(
    "SAMPLE_COUNT",
    `${sampleCount}`,
    ShaderDestination.FRAGMENT
  );

  const defaultMinBounds = VoxelShapeType.getMinBounds(shapeType);
  const defaultMaxBounds = VoxelShapeType.getMaxBounds(shapeType);
  const isDefaultMinX = minBounds.x === defaultMinBounds.x;
  const isDefaultMinY = minBounds.y === defaultMinBounds.y;
  const isDefaultMinZ = minBounds.z === defaultMinBounds.z;
  const isDefaultMaxX = maxBounds.x === defaultMaxBounds.x;
  const isDefaultMaxY = maxBounds.y === defaultMaxBounds.y;
  const isDefaultMaxZ = maxBounds.z === defaultMaxBounds.z;

  let useBounds = false;
  if (shapeType === VoxelShapeType.BOX) {
    useBounds =
      !isDefaultMinX ||
      !isDefaultMaxX ||
      !isDefaultMinY ||
      !isDefaultMaxY ||
      !isDefaultMinZ ||
      !isDefaultMaxZ;
  } else if (shapeType === VoxelShapeType.CYLINDER) {
    useBounds =
      !isDefaultMinX ||
      !isDefaultMaxX ||
      !isDefaultMinY ||
      !isDefaultMaxY ||
      !isDefaultMinZ ||
      !isDefaultMaxZ;
  } else if (shapeType === VoxelShapeType.ELLIPSOID) {
    const radii = Matrix4.getScale(that._compoundModelMatrix, scratchScale);
    const hasInnerEllipsoid = !(
      radii.x === radii.y &&
      radii.y === radii.z &&
      minBounds.z === -radii.x
    );
    useBounds =
      !isDefaultMinX ||
      !isDefaultMaxX ||
      !isDefaultMinY ||
      !isDefaultMaxY ||
      hasInnerEllipsoid;
  }

  if (useBounds) {
    shaderBuilder.addDefine("BOUNDS", undefined, ShaderDestination.FRAGMENT);
  }
  if (!isDefaultMinX) {
    shaderBuilder.addDefine(
      "BOUNDS_0_MIN",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (!isDefaultMaxX) {
    shaderBuilder.addDefine(
      "BOUNDS_0_MAX",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (!isDefaultMinY) {
    shaderBuilder.addDefine(
      "BOUNDS_1_MIN",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (!isDefaultMaxY) {
    shaderBuilder.addDefine(
      "BOUNDS_1_MAX",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (!isDefaultMinZ) {
    shaderBuilder.addDefine(
      "BOUNDS_2_MIN",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (!isDefaultMaxZ) {
    shaderBuilder.addDefine(
      "BOUNDS_2_MAX",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  let intersectionCount = 0;
  if (shapeType === VoxelShapeType.BOX) {
    // A bounded box is still a box, so it has the same number of shape intersections: 1
    intersectionCount = 1;
  } else if (shapeType === VoxelShapeType.ELLIPSOID) {
    // Intersects an outer ellipsoid for the max radius
    {
      shaderBuilder.addDefine(
        "BOUNDS_2_MAX_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
    // Intersects an inner ellipsoid for the min radius
    if (!isDefaultMinZ) {
      shaderBuilder.addDefine(
        "BOUNDS_2_MIN_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
    // Intersects a cone for min latitude
    if (!isDefaultMinY) {
      shaderBuilder.addDefine(
        "BOUNDS_1_MIN_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
    // Intersects a cone for max latitude
    if (!isDefaultMaxY) {
      shaderBuilder.addDefine(
        "BOUNDS_1_MAX_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
    // Intersects a wedge for the min and max longitude
    if (!isDefaultMinX || !isDefaultMaxX) {
      shaderBuilder.addDefine(
        "BOUNDS_0_MIN_MAX_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
  } else if (shapeType === VoxelShapeType.CYLINDER) {
    // Intersects a capped cylinder for the max radius
    // The min and max height are handled as part of the capped cylinder intersection
    {
      shaderBuilder.addDefine(
        "BOUNDS_0_MAX_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
    // Intersects an inner infinite cylinder for the min radius
    if (!isDefaultMinX) {
      shaderBuilder.addDefine(
        "BOUNDS_0_MIN_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
    // Intersects a wedge for the min and max theta
    if (!isDefaultMinZ || !isDefaultMaxZ) {
      shaderBuilder.addDefine(
        "BOUNDS_2_MIN_MAX_IDX",
        intersectionCount,
        ShaderDestination.FRAGMENT
      );
      intersectionCount++;
    }
  }
  // The intersection count is multiplied by 2 because there is an enter and exit for each intersection
  shaderBuilder.addDefine(
    "SHAPE_INTERSECTION_COUNT",
    intersectionCount * 2,
    ShaderDestination.FRAGMENT
  );
  const useClippingBounds =
    minClippingBounds.x !== defaultMinBounds.x ||
    minClippingBounds.y !== defaultMinBounds.y ||
    minClippingBounds.z !== defaultMinBounds.z ||
    maxClippingBounds.x !== defaultMaxBounds.x ||
    maxClippingBounds.y !== defaultMaxBounds.y ||
    maxClippingBounds.z !== defaultMaxBounds.z;
  if (useClippingBounds) {
    shaderBuilder.addDefine(
      "CLIPPING_BOUNDS",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  // Fragment shader uniforms

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
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionUvShapeSpace");
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

  // getPropertiesFrom2DMegatextureAtUv
  {
    const functionId = "getPropertiesFrom2DMegatextureAtUv";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} getPropertiesFrom2DMegatextureAtUv(vec2 texcoord)`,
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
    blending: BlendingState.ALPHA_BLEND,
  });

  // Create the draw commands
  const uniformMap = that._uniformMap;
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

  // console.log(drawCommand.shaderProgram._fragmentShaderText);
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
  const frameNumber = frameState.frameNumber;
  const traversal = that._traversal;
  const polylines = that._debugPolylines;
  const shapeVisible = that._shape.isVisible;
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
    if (!tile.isRenderable(frameNumber)) {
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

  if (shapeVisible) {
    drawTile(traversal.rootNode);
  }

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

export default VoxelPrimitive;
