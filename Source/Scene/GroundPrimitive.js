import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";
import TerrainExaggeration from "../Core/TerrainExaggeration.js";
import ClassificationPrimitive from "./ClassificationPrimitive.js";
import ClassificationType from "./ClassificationType.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import SceneMode from "./SceneMode.js";
import ShadowVolumeAppearance from "./ShadowVolumeAppearance.js";

const GroundPrimitiveUniformMap = {
  u_globeMinimumAltitude: function () {
    return 55000.0;
  },
};

/**
 * A ground primitive represents geometry draped over terrain or 3D Tiles in the {@link Scene}.
 * <p>
 * A primitive combines geometry instances with an {@link Appearance} that describes the full shading, including
 * {@link Material} and {@link RenderState}.  Roughly, the geometry instance defines the structure and placement,
 * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
 * and match most of them and add a new geometry or appearance independently of each other.
 * </p>
 * <p>
 * Support for the WEBGL_depth_texture extension is required to use GeometryInstances with different PerInstanceColors
 * or materials besides PerInstanceColorAppearance.
 * </p>
 * <p>
 * Textured GroundPrimitives were designed for notional patterns and are not meant for precisely mapping
 * textures to terrain - for that use case, use {@link SingleTileImageryProvider}.
 * </p>
 * <p>
 * For correct rendering, this feature requires the EXT_frag_depth WebGL extension. For hardware that do not support this extension, there
 * will be rendering artifacts for some viewing angles.
 * </p>
 * <p>
 * Valid geometries are {@link CircleGeometry}, {@link CorridorGeometry}, {@link EllipseGeometry}, {@link PolygonGeometry}, and {@link RectangleGeometry}.
 * </p>
 *
 * @alias GroundPrimitive
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Array|GeometryInstance} [options.geometryInstances] The geometry instances to render.
 * @param {Appearance} [options.appearance] The appearance used to render the primitive. Defaults to a flat PerInstanceColorAppearance when GeometryInstances have a color attribute.
 * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
 * @param {Boolean} [options.vertexCacheOptimize=false] When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
 * @param {Boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
 * @param {Boolean} [options.compressVertices=true] When <code>true</code>, the geometry vertices are compressed, which will save memory.
 * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
 * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready. If false initializeTerrainHeights() must be called first.
 * @param {ClassificationType} [options.classificationType=ClassificationType.BOTH] Determines whether terrain, 3D Tiles or both will be classified.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
 * @param {Boolean} [options.debugShowShadowVolume=false] For debugging only. Determines if the shadow volume for each geometry in the primitive is drawn. Must be <code>true</code> on
 *                  creation for the volumes to be created before the geometry is released or options.releaseGeometryInstance must be <code>false</code>.
 *
 * @example
 * // Example 1: Create primitive with a single instance
 * const rectangleInstance = new Cesium.GeometryInstance({
 *   geometry : new Cesium.RectangleGeometry({
 *     rectangle : Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0)
 *   }),
 *   id : 'rectangle',
 *   attributes : {
 *     color : new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5)
 *   }
 * });
 * scene.primitives.add(new Cesium.GroundPrimitive({
 *   geometryInstances : rectangleInstance
 * }));
 *
 * // Example 2: Batch instances
 * const color = new Cesium.ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 0.5); // Both instances must have the same color.
 * const rectangleInstance = new Cesium.GeometryInstance({
 *   geometry : new Cesium.RectangleGeometry({
 *     rectangle : Cesium.Rectangle.fromDegrees(-140.0, 30.0, -100.0, 40.0)
 *   }),
 *   id : 'rectangle',
 *   attributes : {
 *     color : color
 *   }
 * });
 * const ellipseInstance = new Cesium.GeometryInstance({
 *     geometry : new Cesium.EllipseGeometry({
 *         center : Cesium.Cartesian3.fromDegrees(-105.0, 40.0),
 *         semiMinorAxis : 300000.0,
 *         semiMajorAxis : 400000.0
 *     }),
 *     id : 'ellipse',
 *     attributes : {
 *         color : color
 *     }
 * });
 * scene.primitives.add(new Cesium.GroundPrimitive({
 *   geometryInstances : [rectangleInstance, ellipseInstance]
 * }));
 *
 * @see Primitive
 * @see ClassificationPrimitive
 * @see GeometryInstance
 * @see Appearance
 */
function GroundPrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  let appearance = options.appearance;
  const geometryInstances = options.geometryInstances;
  if (!defined(appearance) && defined(geometryInstances)) {
    const geometryInstancesArray = Array.isArray(geometryInstances)
      ? geometryInstances
      : [geometryInstances];
    const geometryInstanceCount = geometryInstancesArray.length;
    for (let i = 0; i < geometryInstanceCount; i++) {
      const attributes = geometryInstancesArray[i].attributes;
      if (defined(attributes) && defined(attributes.color)) {
        appearance = new PerInstanceColorAppearance({
          flat: true,
        });
        break;
      }
    }
  }
  /**
   * The {@link Appearance} used to shade this primitive. Each geometry
   * instance is shaded with the same appearance.  Some appearances, like
   * {@link PerInstanceColorAppearance} allow giving each instance unique
   * properties.
   *
   * @type Appearance
   *
   * @default undefined
   */
  this.appearance = appearance;

  /**
   * The geometry instances rendered with this primitive.  This may
   * be <code>undefined</code> if <code>options.releaseGeometryInstances</code>
   * is <code>true</code> when the primitive is constructed.
   * <p>
   * Changing this property after the primitive is rendered has no effect.
   * </p>
   *
   * @readonly
   * @type {Array|GeometryInstance}
   *
   * @default undefined
   */
  this.geometryInstances = options.geometryInstances;
  /**
   * Determines if the primitive will be shown.  This affects all geometry
   * instances in the primitive.
   *
   * @type {Boolean}
   *
   * @default true
   */
  this.show = defaultValue(options.show, true);
  /**
   * Determines whether terrain, 3D Tiles or both will be classified.
   *
   * @type {ClassificationType}
   *
   * @default ClassificationType.BOTH
   */
  this.classificationType = defaultValue(
    options.classificationType,
    ClassificationType.BOTH
  );
  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the primitive.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the shadow volume for each geometry in the primitive.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugShowShadowVolume = defaultValue(
    options.debugShowShadowVolume,
    false
  );

  this._boundingVolumes = [];
  this._boundingVolumes2D = [];

  this._ready = false;

  const groundPrimitive = this;
  this._readyPromise = new Promise((resolve, reject) => {
    groundPrimitive._completeLoad = () => {
      if (this._ready) {
        return;
      }

      this._ready = true;

      if (this.releaseGeometryInstances) {
        this.geometryInstances = undefined;
      }

      const error = this._error;
      if (!defined(error)) {
        resolve(this);
      } else {
        reject(error);
      }
    };
  });

  this._primitive = undefined;

  this._maxHeight = undefined;
  this._minHeight = undefined;

  this._maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
  this._minTerrainHeight = ApproximateTerrainHeights._defaultMinTerrainHeight;

  this._boundingSpheresKeys = [];
  this._boundingSpheres = [];

  this._useFragmentCulling = false;
  // Used when inserting in an OrderedPrimitiveCollection
  this._zIndex = undefined;

  const that = this;
  this._classificationPrimitiveOptions = {
    geometryInstances: undefined,
    appearance: undefined,
    vertexCacheOptimize: defaultValue(options.vertexCacheOptimize, false),
    interleave: defaultValue(options.interleave, false),
    releaseGeometryInstances: defaultValue(
      options.releaseGeometryInstances,
      true
    ),
    allowPicking: defaultValue(options.allowPicking, true),
    asynchronous: defaultValue(options.asynchronous, true),
    compressVertices: defaultValue(options.compressVertices, true),
    _createBoundingVolumeFunction: undefined,
    _updateAndQueueCommandsFunction: undefined,
    _pickPrimitive: that,
    _extruded: true,
    _uniformMap: GroundPrimitiveUniformMap,
  };
}

Object.defineProperties(GroundPrimitive.prototype, {
  /**
   * When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
   *
   * @memberof GroundPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  vertexCacheOptimize: {
    get: function () {
      return this._classificationPrimitiveOptions.vertexCacheOptimize;
    },
  },

  /**
   * Determines if geometry vertex attributes are interleaved, which can slightly improve rendering performance.
   *
   * @memberof GroundPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  interleave: {
    get: function () {
      return this._classificationPrimitiveOptions.interleave;
    },
  },

  /**
   * When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
   *
   * @memberof GroundPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  releaseGeometryInstances: {
    get: function () {
      return this._classificationPrimitiveOptions.releaseGeometryInstances;
    },
  },

  /**
   * When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
   *
   * @memberof GroundPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  allowPicking: {
    get: function () {
      return this._classificationPrimitiveOptions.allowPicking;
    },
  },

  /**
   * Determines if the geometry instances will be created and batched on a web worker.
   *
   * @memberof GroundPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  asynchronous: {
    get: function () {
      return this._classificationPrimitiveOptions.asynchronous;
    },
  },

  /**
   * When <code>true</code>, geometry vertices are compressed, which will save memory.
   *
   * @memberof GroundPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  compressVertices: {
    get: function () {
      return this._classificationPrimitiveOptions.compressVertices;
    },
  },

  /**
   * Determines if the primitive is complete and ready to render.  If this property is
   * true, the primitive will be rendered the next time that {@link GroundPrimitive#update}
   * is called.
   *
   * @memberof GroundPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves when the primitive is ready to render.
   * @memberof GroundPrimitive.prototype
   * @type {Promise.<GroundPrimitive>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

/**
 * Determines if GroundPrimitive rendering is supported.
 *
 * @function
 * @param {Scene} scene The scene.
 * @returns {Boolean} <code>true</code> if GroundPrimitives are supported; otherwise, returns <code>false</code>
 */
GroundPrimitive.isSupported = ClassificationPrimitive.isSupported;

function getComputeMaximumHeightFunction(primitive) {
  return function (granularity, ellipsoid) {
    const r = ellipsoid.maximumRadius;
    const delta = r / Math.cos(granularity * 0.5) - r;
    return primitive._maxHeight + delta;
  };
}

function getComputeMinimumHeightFunction(primitive) {
  return function (granularity, ellipsoid) {
    return primitive._minHeight;
  };
}

const scratchBVCartesianHigh = new Cartesian3();
const scratchBVCartesianLow = new Cartesian3();
const scratchBVCartesian = new Cartesian3();
const scratchBVCartographic = new Cartographic();
const scratchBVRectangle = new Rectangle();

function getRectangle(frameState, geometry) {
  const ellipsoid = frameState.mapProjection.ellipsoid;

  if (
    !defined(geometry.attributes) ||
    !defined(geometry.attributes.position3DHigh)
  ) {
    if (defined(geometry.rectangle)) {
      return geometry.rectangle;
    }

    return undefined;
  }

  const highPositions = geometry.attributes.position3DHigh.values;
  const lowPositions = geometry.attributes.position3DLow.values;
  const length = highPositions.length;

  let minLat = Number.POSITIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < length; i += 3) {
    const highPosition = Cartesian3.unpack(
      highPositions,
      i,
      scratchBVCartesianHigh
    );
    const lowPosition = Cartesian3.unpack(
      lowPositions,
      i,
      scratchBVCartesianLow
    );

    const position = Cartesian3.add(
      highPosition,
      lowPosition,
      scratchBVCartesian
    );
    const cartographic = ellipsoid.cartesianToCartographic(
      position,
      scratchBVCartographic
    );

    const latitude = cartographic.latitude;
    const longitude = cartographic.longitude;

    minLat = Math.min(minLat, latitude);
    minLon = Math.min(minLon, longitude);
    maxLat = Math.max(maxLat, latitude);
    maxLon = Math.max(maxLon, longitude);
  }

  const rectangle = scratchBVRectangle;
  rectangle.north = maxLat;
  rectangle.south = minLat;
  rectangle.east = maxLon;
  rectangle.west = minLon;

  return rectangle;
}

function setMinMaxTerrainHeights(primitive, rectangle, ellipsoid) {
  const result = ApproximateTerrainHeights.getMinimumMaximumHeights(
    rectangle,
    ellipsoid
  );

  primitive._minTerrainHeight = result.minimumTerrainHeight;
  primitive._maxTerrainHeight = result.maximumTerrainHeight;
}

function createBoundingVolume(groundPrimitive, frameState, geometry) {
  const ellipsoid = frameState.mapProjection.ellipsoid;
  const rectangle = getRectangle(frameState, geometry);

  const obb = OrientedBoundingBox.fromRectangle(
    rectangle,
    groundPrimitive._minHeight,
    groundPrimitive._maxHeight,
    ellipsoid
  );
  groundPrimitive._boundingVolumes.push(obb);

  if (!frameState.scene3DOnly) {
    const projection = frameState.mapProjection;
    const boundingVolume = BoundingSphere.fromRectangleWithHeights2D(
      rectangle,
      projection,
      groundPrimitive._maxHeight,
      groundPrimitive._minHeight
    );
    Cartesian3.fromElements(
      boundingVolume.center.z,
      boundingVolume.center.x,
      boundingVolume.center.y,
      boundingVolume.center
    );

    groundPrimitive._boundingVolumes2D.push(boundingVolume);
  }
}

function boundingVolumeIndex(commandIndex, length) {
  return Math.floor((commandIndex % length) / 2);
}

function updateAndQueueRenderCommand(
  groundPrimitive,
  command,
  frameState,
  modelMatrix,
  cull,
  boundingVolume,
  debugShowBoundingVolume
) {
  // Use derived appearance command for 2D if needed
  const classificationPrimitive = groundPrimitive._primitive;
  if (
    frameState.mode !== SceneMode.SCENE3D &&
    command.shaderProgram === classificationPrimitive._spColor &&
    classificationPrimitive._needs2DShader
  ) {
    command = command.derivedCommands.appearance2D;
  }

  command.owner = groundPrimitive;
  command.modelMatrix = modelMatrix;
  command.boundingVolume = boundingVolume;
  command.cull = cull;
  command.debugShowBoundingVolume = debugShowBoundingVolume;

  frameState.commandList.push(command);
}

function updateAndQueuePickCommand(
  groundPrimitive,
  command,
  frameState,
  modelMatrix,
  cull,
  boundingVolume
) {
  // Use derived pick command for 2D if needed
  const classificationPrimitive = groundPrimitive._primitive;
  if (
    frameState.mode !== SceneMode.SCENE3D &&
    command.shaderProgram === classificationPrimitive._spPick &&
    classificationPrimitive._needs2DShader
  ) {
    command = command.derivedCommands.pick2D;
  }

  command.owner = groundPrimitive;
  command.modelMatrix = modelMatrix;
  command.boundingVolume = boundingVolume;
  command.cull = cull;

  frameState.commandList.push(command);
}

function updateAndQueueCommands(
  groundPrimitive,
  frameState,
  colorCommands,
  pickCommands,
  modelMatrix,
  cull,
  debugShowBoundingVolume,
  twoPasses
) {
  let boundingVolumes;
  if (frameState.mode === SceneMode.SCENE3D) {
    boundingVolumes = groundPrimitive._boundingVolumes;
  } else {
    boundingVolumes = groundPrimitive._boundingVolumes2D;
  }

  const classificationType = groundPrimitive.classificationType;
  const queueTerrainCommands =
    classificationType !== ClassificationType.CESIUM_3D_TILE;
  const queue3DTilesCommands =
    classificationType !== ClassificationType.TERRAIN;

  const passes = frameState.passes;
  const classificationPrimitive = groundPrimitive._primitive;

  let i;
  let boundingVolume;
  let command;

  if (passes.render) {
    const colorLength = colorCommands.length;

    for (i = 0; i < colorLength; ++i) {
      boundingVolume = boundingVolumes[boundingVolumeIndex(i, colorLength)];
      if (queueTerrainCommands) {
        command = colorCommands[i];
        updateAndQueueRenderCommand(
          groundPrimitive,
          command,
          frameState,
          modelMatrix,
          cull,
          boundingVolume,
          debugShowBoundingVolume
        );
      }
      if (queue3DTilesCommands) {
        command = colorCommands[i].derivedCommands.tileset;
        updateAndQueueRenderCommand(
          groundPrimitive,
          command,
          frameState,
          modelMatrix,
          cull,
          boundingVolume,
          debugShowBoundingVolume
        );
      }
    }

    if (frameState.invertClassification) {
      const ignoreShowCommands = classificationPrimitive._commandsIgnoreShow;
      const ignoreShowCommandsLength = ignoreShowCommands.length;
      for (i = 0; i < ignoreShowCommandsLength; ++i) {
        boundingVolume = boundingVolumes[i];
        command = ignoreShowCommands[i];
        updateAndQueueRenderCommand(
          groundPrimitive,
          command,
          frameState,
          modelMatrix,
          cull,
          boundingVolume,
          debugShowBoundingVolume
        );
      }
    }
  }

  if (passes.pick) {
    const pickLength = pickCommands.length;

    let pickOffsets;
    if (!groundPrimitive._useFragmentCulling) {
      // Must be using pick offsets
      pickOffsets = classificationPrimitive._primitive._pickOffsets;
    }
    for (i = 0; i < pickLength; ++i) {
      boundingVolume = boundingVolumes[boundingVolumeIndex(i, pickLength)];
      if (!groundPrimitive._useFragmentCulling) {
        const pickOffset = pickOffsets[boundingVolumeIndex(i, pickLength)];
        boundingVolume = boundingVolumes[pickOffset.index];
      }
      if (queueTerrainCommands) {
        command = pickCommands[i];
        updateAndQueuePickCommand(
          groundPrimitive,
          command,
          frameState,
          modelMatrix,
          cull,
          boundingVolume
        );
      }
      if (queue3DTilesCommands) {
        command = pickCommands[i].derivedCommands.tileset;
        updateAndQueuePickCommand(
          groundPrimitive,
          command,
          frameState,
          modelMatrix,
          cull,
          boundingVolume
        );
      }
    }
  }
}

/**
 * Initializes the minimum and maximum terrain heights. This only needs to be called if you are creating the
 * GroundPrimitive synchronously.
 *
 * @returns {Promise<void>} A promise that will resolve once the terrain heights have been loaded.
 *
 */
GroundPrimitive.initializeTerrainHeights = function () {
  return ApproximateTerrainHeights.initialize();
};

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {DeveloperError} For synchronous GroundPrimitive, you must call GroundPrimitive.initializeTerrainHeights() and wait for the returned promise to resolve.
 * @exception {DeveloperError} All instance geometries must have the same primitiveType.
 * @exception {DeveloperError} Appearance and material have a uniform with the same name.
 */
GroundPrimitive.prototype.update = function (frameState) {
  if (!defined(this._primitive) && !defined(this.geometryInstances)) {
    return;
  }

  if (!ApproximateTerrainHeights.initialized) {
    //>>includeStart('debug', pragmas.debug);
    if (!this.asynchronous) {
      throw new DeveloperError(
        "For synchronous GroundPrimitives, you must call GroundPrimitive.initializeTerrainHeights() and wait for the returned promise to resolve."
      );
    }
    //>>includeEnd('debug');

    GroundPrimitive.initializeTerrainHeights();
    return;
  }

  const that = this;
  const primitiveOptions = this._classificationPrimitiveOptions;

  if (!defined(this._primitive)) {
    const ellipsoid = frameState.mapProjection.ellipsoid;

    let instance;
    let geometry;
    let instanceType;

    const instances = Array.isArray(this.geometryInstances)
      ? this.geometryInstances
      : [this.geometryInstances];
    const length = instances.length;
    const groundInstances = new Array(length);

    let i;
    let rectangle;
    for (i = 0; i < length; ++i) {
      instance = instances[i];
      geometry = instance.geometry;
      const instanceRectangle = getRectangle(frameState, geometry);
      if (!defined(rectangle)) {
        rectangle = Rectangle.clone(instanceRectangle);
      } else if (defined(instanceRectangle)) {
        Rectangle.union(rectangle, instanceRectangle, rectangle);
      }

      const id = instance.id;
      if (defined(id) && defined(instanceRectangle)) {
        const boundingSphere = ApproximateTerrainHeights.getBoundingSphere(
          instanceRectangle,
          ellipsoid
        );
        this._boundingSpheresKeys.push(id);
        this._boundingSpheres.push(boundingSphere);
      }

      instanceType = geometry.constructor;
      if (!defined(instanceType) || !defined(instanceType.createShadowVolume)) {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError(
          "Not all of the geometry instances have GroundPrimitive support."
        );
        //>>includeEnd('debug');
      }
    }

    // Now compute the min/max heights for the primitive
    setMinMaxTerrainHeights(this, rectangle, ellipsoid);
    const exaggeration = frameState.terrainExaggeration;
    const exaggerationRelativeHeight =
      frameState.terrainExaggerationRelativeHeight;
    this._minHeight = TerrainExaggeration.getHeight(
      this._minTerrainHeight,
      exaggeration,
      exaggerationRelativeHeight
    );
    this._maxHeight = TerrainExaggeration.getHeight(
      this._maxTerrainHeight,
      exaggeration,
      exaggerationRelativeHeight
    );

    const useFragmentCulling = GroundPrimitive._supportsMaterials(
      frameState.context
    );
    this._useFragmentCulling = useFragmentCulling;

    if (useFragmentCulling) {
      // Determine whether to add spherical or planar extent attributes for computing texture coordinates.
      // This depends on the size of the GeometryInstances.
      let attributes;
      let usePlanarExtents = true;
      for (i = 0; i < length; ++i) {
        instance = instances[i];
        geometry = instance.geometry;
        rectangle = getRectangle(frameState, geometry);
        if (ShadowVolumeAppearance.shouldUseSphericalCoordinates(rectangle)) {
          usePlanarExtents = false;
          break;
        }
      }

      for (i = 0; i < length; ++i) {
        instance = instances[i];
        geometry = instance.geometry;
        instanceType = geometry.constructor;

        const boundingRectangle = getRectangle(frameState, geometry);
        const textureCoordinateRotationPoints =
          geometry.textureCoordinateRotationPoints;

        if (usePlanarExtents) {
          attributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(
            boundingRectangle,
            textureCoordinateRotationPoints,
            ellipsoid,
            frameState.mapProjection,
            this._maxHeight
          );
        } else {
          attributes = ShadowVolumeAppearance.getSphericalExtentGeometryInstanceAttributes(
            boundingRectangle,
            textureCoordinateRotationPoints,
            ellipsoid,
            frameState.mapProjection
          );
        }

        const instanceAttributes = instance.attributes;
        for (const attributeKey in instanceAttributes) {
          if (instanceAttributes.hasOwnProperty(attributeKey)) {
            attributes[attributeKey] = instanceAttributes[attributeKey];
          }
        }

        groundInstances[i] = new GeometryInstance({
          geometry: instanceType.createShadowVolume(
            geometry,
            getComputeMinimumHeightFunction(this),
            getComputeMaximumHeightFunction(this)
          ),
          attributes: attributes,
          id: instance.id,
        });
      }
    } else {
      // ClassificationPrimitive will check if the colors are all the same if it detects lack of fragment culling attributes
      for (i = 0; i < length; ++i) {
        instance = instances[i];
        geometry = instance.geometry;
        instanceType = geometry.constructor;
        groundInstances[i] = new GeometryInstance({
          geometry: instanceType.createShadowVolume(
            geometry,
            getComputeMinimumHeightFunction(this),
            getComputeMaximumHeightFunction(this)
          ),
          attributes: instance.attributes,
          id: instance.id,
        });
      }
    }

    primitiveOptions.geometryInstances = groundInstances;
    primitiveOptions.appearance = this.appearance;

    primitiveOptions._createBoundingVolumeFunction = function (
      frameState,
      geometry
    ) {
      createBoundingVolume(that, frameState, geometry);
    };
    primitiveOptions._updateAndQueueCommandsFunction = function (
      primitive,
      frameState,
      colorCommands,
      pickCommands,
      modelMatrix,
      cull,
      debugShowBoundingVolume,
      twoPasses
    ) {
      updateAndQueueCommands(
        that,
        frameState,
        colorCommands,
        pickCommands,
        modelMatrix,
        cull,
        debugShowBoundingVolume,
        twoPasses
      );
    };

    this._primitive = new ClassificationPrimitive(primitiveOptions);
  }

  this._primitive.appearance = this.appearance;
  this._primitive.show = this.show;
  this._primitive.debugShowShadowVolume = this.debugShowShadowVolume;
  this._primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
  this._primitive.update(frameState);

  frameState.afterRender.push(() => {
    if (defined(this._primitive) && this._primitive.ready) {
      this._completeLoad();
    }
  });
};

/**
 * @private
 */
GroundPrimitive.prototype.getBoundingSphere = function (id) {
  const index = this._boundingSpheresKeys.indexOf(id);
  if (index !== -1) {
    return this._boundingSpheres[index];
  }

  return undefined;
};

/**
 * Returns the modifiable per-instance attributes for a {@link GeometryInstance}.
 *
 * @param {*} id The id of the {@link GeometryInstance}.
 * @returns {Object} The typed array in the attribute's format or undefined if the is no instance with id.
 *
 * @exception {DeveloperError} must call update before calling getGeometryInstanceAttributes.
 *
 * @example
 * const attributes = primitive.getGeometryInstanceAttributes('an id');
 * attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.AQUA);
 * attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(true);
 */
GroundPrimitive.prototype.getGeometryInstanceAttributes = function (id) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(this._primitive)) {
    throw new DeveloperError(
      "must call update before calling getGeometryInstanceAttributes"
    );
  }
  //>>includeEnd('debug');
  return this._primitive.getGeometryInstanceAttributes(id);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GroundPrimitive#destroy
 */
GroundPrimitive.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * e = e && e.destroy();
 *
 * @see GroundPrimitive#isDestroyed
 */
GroundPrimitive.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  return destroyObject(this);
};

/**
 * Exposed for testing.
 *
 * @param {Context} context Rendering context
 * @returns {Boolean} Whether or not the current context supports materials on GroundPrimitives.
 * @private
 */
GroundPrimitive._supportsMaterials = function (context) {
  return context.depthTexture;
};

/**
 * Checks if the given Scene supports materials on GroundPrimitives.
 * Materials on GroundPrimitives require support for the WEBGL_depth_texture extension.
 *
 * @param {Scene} scene The current scene.
 * @returns {Boolean} Whether or not the current scene supports materials on GroundPrimitives.
 */
GroundPrimitive.supportsMaterials = function (scene) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("scene", scene);
  //>>includeEnd('debug');

  return GroundPrimitive._supportsMaterials(scene.frameState.context);
};
export default GroundPrimitive;
