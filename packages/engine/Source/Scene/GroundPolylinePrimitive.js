import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import GeometryInstanceAttribute from "../Core/GeometryInstanceAttribute.js";
import GroundPolylineGeometry from "../Core/GroundPolylineGeometry.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import PolylineShadowVolumeFS from "../Shaders/PolylineShadowVolumeFS.js";
import PolylineShadowVolumeMorphFS from "../Shaders/PolylineShadowVolumeMorphFS.js";
import PolylineShadowVolumeMorphVS from "../Shaders/PolylineShadowVolumeMorphVS.js";
import PolylineShadowVolumeVS from "../Shaders/PolylineShadowVolumeVS.js";
import BlendingState from "./BlendingState.js";
import ClassificationType from "./ClassificationType.js";
import CullFace from "./CullFace.js";
import PolylineColorAppearance from "./PolylineColorAppearance.js";
import PolylineMaterialAppearance from "./PolylineMaterialAppearance.js";
import Primitive from "./Primitive.js";
import SceneMode from "./SceneMode.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";

/**
 * A GroundPolylinePrimitive represents a polyline draped over the terrain or 3D Tiles in the {@link Scene}.
 * <p>
 * Only to be used with GeometryInstances containing {@link GroundPolylineGeometry}.
 * </p>
 *
 * @alias GroundPolylinePrimitive
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {Array|GeometryInstance} [options.geometryInstances] GeometryInstances containing GroundPolylineGeometry
 * @param {Appearance} [options.appearance] The Appearance used to render the polyline. Defaults to a white color {@link Material} on a {@link PolylineMaterialAppearance}.
 * @param {boolean} [options.show=true] Determines if this primitive will be shown.
 * @param {boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
 * @param {boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
 * @param {boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
 * @param {boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready. If false initializeTerrainHeights() must be called first.
 * @param {ClassificationType} [options.classificationType=ClassificationType.BOTH] Determines whether terrain, 3D Tiles or both will be classified.
 * @param {boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
 * @param {boolean} [options.debugShowShadowVolume=false] For debugging only. Determines if the shadow volume for each geometry in the primitive is drawn. Must be <code>true</code> on creation to have effect.
 *
 * @example
 * // 1. Draw a polyline on terrain with a basic color material
 *
 * const instance = new Cesium.GeometryInstance({
 *   geometry : new Cesium.GroundPolylineGeometry({
 *      positions : Cesium.Cartesian3.fromDegreesArray([
 *          -112.1340164450331, 36.05494287836128,
 *          -112.08821010582645, 36.097804071380715
 *      ]),
 *      width : 4.0
 *   }),
 *   id : 'object returned when this instance is picked and to get/set per-instance attributes'
 * });
 *
 * scene.groundPrimitives.add(new Cesium.GroundPolylinePrimitive({
 *   geometryInstances : instance,
 *   appearance : new Cesium.PolylineMaterialAppearance()
 * }));
 *
 * // 2. Draw a looped polyline on terrain with per-instance color and a distance display condition.
 * // Distance display conditions for polylines on terrain are based on an approximate terrain height
 * // instead of true terrain height.
 *
 * const instance2 = new Cesium.GeometryInstance({
 *   geometry : new Cesium.GroundPolylineGeometry({
 *      positions : Cesium.Cartesian3.fromDegreesArray([
 *          -112.1340164450331, 36.05494287836128,
 *          -112.08821010582645, 36.097804071380715,
 *          -112.13296079730024, 36.168769146801104
 *      ]),
 *      loop : true,
 *      width : 4.0
 *   }),
 *   attributes : {
 *      color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString('green').withAlpha(0.7)),
 *      distanceDisplayCondition : new Cesium.DistanceDisplayConditionGeometryInstanceAttribute(1000, 30000)
 *   },
 *   id : 'object returned when this instance is picked and to get/set per-instance attributes'
 * });
 *
 * scene.groundPrimitives.add(new Cesium.GroundPolylinePrimitive({
 *   geometryInstances : instance2,
 *   appearance : new Cesium.PolylineColorAppearance()
 * }));
 */
function GroundPolylinePrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The geometry instances rendered with this primitive. This may
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
  this._hasPerInstanceColors = true;

  let appearance = options.appearance;
  if (!defined(appearance)) {
    appearance = new PolylineMaterialAppearance();
  }
  /**
   * The {@link Appearance} used to shade this primitive. Each geometry
   * instance is shaded with the same appearance.  Some appearances, like
   * {@link PolylineColorAppearance} allow giving each instance unique
   * properties.
   *
   * @type Appearance
   *
   * @default undefined
   */
  this.appearance = appearance;

  /**
   * Determines if the primitive will be shown.  This affects all geometry
   * instances in the primitive.
   *
   * @type {boolean}
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
   * @type {boolean}
   *
   * @default false
   */
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );

  // Shadow volume is shown by removing a discard in the shader, so this isn't toggleable.
  this._debugShowShadowVolume = defaultValue(
    options.debugShowShadowVolume,
    false
  );

  this._primitiveOptions = {
    geometryInstances: undefined,
    appearance: undefined,
    vertexCacheOptimize: false,
    interleave: defaultValue(options.interleave, false),
    releaseGeometryInstances: defaultValue(
      options.releaseGeometryInstances,
      true
    ),
    allowPicking: defaultValue(options.allowPicking, true),
    asynchronous: defaultValue(options.asynchronous, true),
    compressVertices: false,
    _createShaderProgramFunction: undefined,
    _createCommandsFunction: undefined,
    _updateAndQueueCommandsFunction: undefined,
  };

  // Used when inserting in an OrderedPrimitiveCollection
  this._zIndex = undefined;

  this._ready = false;
  this._primitive = undefined;

  this._sp = undefined;
  this._sp2D = undefined;
  this._spMorph = undefined;

  this._renderState = getRenderState(false);
  this._renderState3DTiles = getRenderState(true);

  this._renderStateMorph = RenderState.fromCache({
    cull: {
      enabled: true,
      face: CullFace.FRONT, // Geometry is "inverted," so cull front when materials on volume instead of on terrain (morph)
    },
    depthTest: {
      enabled: true,
    },
    blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
    depthMask: false,
  });
}

Object.defineProperties(GroundPolylinePrimitive.prototype, {
  /**
   * Determines if geometry vertex attributes are interleaved, which can slightly improve rendering performance.
   *
   * @memberof GroundPolylinePrimitive.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default false
   */
  interleave: {
    get: function () {
      return this._primitiveOptions.interleave;
    },
  },

  /**
   * When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
   *
   * @memberof GroundPolylinePrimitive.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default true
   */
  releaseGeometryInstances: {
    get: function () {
      return this._primitiveOptions.releaseGeometryInstances;
    },
  },

  /**
   * When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
   *
   * @memberof GroundPolylinePrimitive.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default true
   */
  allowPicking: {
    get: function () {
      return this._primitiveOptions.allowPicking;
    },
  },

  /**
   * Determines if the geometry instances will be created and batched on a web worker.
   *
   * @memberof GroundPolylinePrimitive.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default true
   */
  asynchronous: {
    get: function () {
      return this._primitiveOptions.asynchronous;
    },
  },

  /**
   * Determines if the primitive is complete and ready to render.  If this property is
   * true, the primitive will be rendered the next time that {@link GroundPolylinePrimitive#update}
   * is called.
   *
   * @memberof GroundPolylinePrimitive.prototype
   *
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * If true, draws the shadow volume for each geometry in the primitive.
   * </p>
   *
   * @memberof GroundPolylinePrimitive.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default false
   */
  debugShowShadowVolume: {
    get: function () {
      return this._debugShowShadowVolume;
    },
  },
});

/**
 * Initializes the minimum and maximum terrain heights. This only needs to be called if you are creating the
 * GroundPolylinePrimitive synchronously.
 *
 * @returns {Promise<void>} A promise that will resolve once the terrain heights have been loaded.
 */
GroundPolylinePrimitive.initializeTerrainHeights = function () {
  return ApproximateTerrainHeights.initialize();
};

function createShaderProgram(groundPolylinePrimitive, frameState, appearance) {
  const context = frameState.context;
  const primitive = groundPolylinePrimitive._primitive;
  const attributeLocations = primitive._attributeLocations;

  let vs = primitive._batchTable.getVertexShaderCallback()(
    PolylineShadowVolumeVS
  );
  vs = Primitive._appendShowToShader(primitive, vs);
  vs = Primitive._appendDistanceDisplayConditionToShader(primitive, vs);
  vs = Primitive._modifyShaderPosition(
    groundPolylinePrimitive,
    vs,
    frameState.scene3DOnly
  );

  let vsMorph = primitive._batchTable.getVertexShaderCallback()(
    PolylineShadowVolumeMorphVS
  );
  vsMorph = Primitive._appendShowToShader(primitive, vsMorph);
  vsMorph = Primitive._appendDistanceDisplayConditionToShader(
    primitive,
    vsMorph
  );
  vsMorph = Primitive._modifyShaderPosition(
    groundPolylinePrimitive,
    vsMorph,
    frameState.scene3DOnly
  );

  // Access pick color from fragment shader.
  // Helps with varying budget.
  let fs = primitive._batchTable.getVertexShaderCallback()(
    PolylineShadowVolumeFS
  );

  const vsDefines = [
    `GLOBE_MINIMUM_ALTITUDE ${frameState.mapProjection.ellipsoid.minimumRadius.toFixed(
      1
    )}`,
  ];
  let colorDefine = "";
  let materialShaderSource = "";
  if (defined(appearance.material)) {
    materialShaderSource = defined(appearance.material)
      ? appearance.material.shaderSource
      : "";

    // Check for use of v_width and v_polylineAngle in material shader
    // to determine whether these varyings should be active in the vertex shader.
    if (materialShaderSource.search(/in\s+float\s+v_polylineAngle;/g) !== -1) {
      vsDefines.push("ANGLE_VARYING");
    }
    if (materialShaderSource.search(/in\s+float\s+v_width;/g) !== -1) {
      vsDefines.push("WIDTH_VARYING");
    }
  } else {
    colorDefine = "PER_INSTANCE_COLOR";
  }

  vsDefines.push(colorDefine);
  const fsDefines = groundPolylinePrimitive.debugShowShadowVolume
    ? ["DEBUG_SHOW_VOLUME", colorDefine]
    : [colorDefine];

  const vsColor3D = new ShaderSource({
    defines: vsDefines,
    sources: [vs],
  });
  const fsColor3D = new ShaderSource({
    defines: fsDefines,
    sources: [materialShaderSource, fs],
  });
  groundPolylinePrimitive._sp = ShaderProgram.replaceCache({
    context: context,
    shaderProgram: primitive._sp,
    vertexShaderSource: vsColor3D,
    fragmentShaderSource: fsColor3D,
    attributeLocations: attributeLocations,
  });

  // Derive 2D/CV
  let colorProgram2D = context.shaderCache.getDerivedShaderProgram(
    groundPolylinePrimitive._sp,
    "2dColor"
  );
  if (!defined(colorProgram2D)) {
    const vsColor2D = new ShaderSource({
      defines: vsDefines.concat(["COLUMBUS_VIEW_2D"]),
      sources: [vs],
    });
    colorProgram2D = context.shaderCache.createDerivedShaderProgram(
      groundPolylinePrimitive._sp,
      "2dColor",
      {
        context: context,
        shaderProgram: groundPolylinePrimitive._sp2D,
        vertexShaderSource: vsColor2D,
        fragmentShaderSource: fsColor3D,
        attributeLocations: attributeLocations,
      }
    );
  }
  groundPolylinePrimitive._sp2D = colorProgram2D;

  // Derive Morph
  let colorProgramMorph = context.shaderCache.getDerivedShaderProgram(
    groundPolylinePrimitive._sp,
    "MorphColor"
  );
  if (!defined(colorProgramMorph)) {
    const vsColorMorph = new ShaderSource({
      defines: vsDefines.concat([
        `MAX_TERRAIN_HEIGHT ${ApproximateTerrainHeights._defaultMaxTerrainHeight.toFixed(
          1
        )}`,
      ]),
      sources: [vsMorph],
    });

    fs = primitive._batchTable.getVertexShaderCallback()(
      PolylineShadowVolumeMorphFS
    );
    const fsColorMorph = new ShaderSource({
      defines: fsDefines,
      sources: [materialShaderSource, fs],
    });
    colorProgramMorph = context.shaderCache.createDerivedShaderProgram(
      groundPolylinePrimitive._sp,
      "MorphColor",
      {
        context: context,
        shaderProgram: groundPolylinePrimitive._spMorph,
        vertexShaderSource: vsColorMorph,
        fragmentShaderSource: fsColorMorph,
        attributeLocations: attributeLocations,
      }
    );
  }
  groundPolylinePrimitive._spMorph = colorProgramMorph;
}

function getRenderState(mask3DTiles) {
  return RenderState.fromCache({
    cull: {
      enabled: true, // prevent double-draw. Geometry is "inverted" (reversed winding order) so we're drawing backfaces.
    },
    blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
    depthMask: false,
    stencilTest: {
      enabled: mask3DTiles,
      frontFunction: StencilFunction.EQUAL,
      frontOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.KEEP,
        zPass: StencilOperation.KEEP,
      },
      backFunction: StencilFunction.EQUAL,
      backOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.KEEP,
        zPass: StencilOperation.KEEP,
      },
      reference: StencilConstants.CESIUM_3D_TILE_MASK,
      mask: StencilConstants.CESIUM_3D_TILE_MASK,
    },
  });
}

function createCommands(
  groundPolylinePrimitive,
  appearance,
  material,
  translucent,
  colorCommands,
  pickCommands
) {
  const primitive = groundPolylinePrimitive._primitive;
  const length = primitive._va.length;
  colorCommands.length = length;
  pickCommands.length = length;

  const isPolylineColorAppearance =
    appearance instanceof PolylineColorAppearance;

  const materialUniforms = isPolylineColorAppearance ? {} : material._uniforms;
  const uniformMap = primitive._batchTable.getUniformMapCallback()(
    materialUniforms
  );

  for (let i = 0; i < length; i++) {
    const vertexArray = primitive._va[i];

    let command = colorCommands[i];
    if (!defined(command)) {
      command = colorCommands[i] = new DrawCommand({
        owner: groundPolylinePrimitive,
        primitiveType: primitive._primitiveType,
      });
    }

    command.vertexArray = vertexArray;
    command.renderState = groundPolylinePrimitive._renderState;
    command.shaderProgram = groundPolylinePrimitive._sp;
    command.uniformMap = uniformMap;
    command.pass = Pass.TERRAIN_CLASSIFICATION;
    command.pickId = "czm_batchTable_pickColor(v_endPlaneNormalEcAndBatchId.w)";

    const derivedTilesetCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.tileset
    );
    derivedTilesetCommand.renderState =
      groundPolylinePrimitive._renderState3DTiles;
    derivedTilesetCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    command.derivedCommands.tileset = derivedTilesetCommand;

    // derive for 2D
    const derived2DCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.color2D
    );
    derived2DCommand.shaderProgram = groundPolylinePrimitive._sp2D;
    command.derivedCommands.color2D = derived2DCommand;

    const derived2DTilesetCommand = DrawCommand.shallowClone(
      derivedTilesetCommand,
      derivedTilesetCommand.derivedCommands.color2D
    );
    derived2DTilesetCommand.shaderProgram = groundPolylinePrimitive._sp2D;
    derivedTilesetCommand.derivedCommands.color2D = derived2DTilesetCommand;

    // derive for Morph
    const derivedMorphCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.colorMorph
    );
    derivedMorphCommand.renderState = groundPolylinePrimitive._renderStateMorph;
    derivedMorphCommand.shaderProgram = groundPolylinePrimitive._spMorph;
    derivedMorphCommand.pickId = "czm_batchTable_pickColor(v_batchId)";
    command.derivedCommands.colorMorph = derivedMorphCommand;
  }
}

function updateAndQueueCommand(
  groundPolylinePrimitive,
  command,
  frameState,
  modelMatrix,
  cull,
  boundingVolume,
  debugShowBoundingVolume
) {
  // Use derived appearance command for morph and 2D
  if (frameState.mode === SceneMode.MORPHING) {
    command = command.derivedCommands.colorMorph;
  } else if (frameState.mode !== SceneMode.SCENE3D) {
    command = command.derivedCommands.color2D;
  }
  command.modelMatrix = modelMatrix;
  command.boundingVolume = boundingVolume;
  command.cull = cull;
  command.debugShowBoundingVolume = debugShowBoundingVolume;

  frameState.commandList.push(command);
}

function updateAndQueueCommands(
  groundPolylinePrimitive,
  frameState,
  colorCommands,
  pickCommands,
  modelMatrix,
  cull,
  debugShowBoundingVolume
) {
  const primitive = groundPolylinePrimitive._primitive;

  Primitive._updateBoundingVolumes(primitive, frameState, modelMatrix); // Expected to be identity - GroundPrimitives don't support other model matrices

  let boundingSpheres;
  if (frameState.mode === SceneMode.SCENE3D) {
    boundingSpheres = primitive._boundingSphereWC;
  } else if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
    boundingSpheres = primitive._boundingSphereCV;
  } else if (
    frameState.mode === SceneMode.SCENE2D &&
    defined(primitive._boundingSphere2D)
  ) {
    boundingSpheres = primitive._boundingSphere2D;
  } else if (defined(primitive._boundingSphereMorph)) {
    boundingSpheres = primitive._boundingSphereMorph;
  }

  const morphing = frameState.mode === SceneMode.MORPHING;
  const classificationType = groundPolylinePrimitive.classificationType;
  const queueTerrainCommands =
    classificationType !== ClassificationType.CESIUM_3D_TILE;
  const queue3DTilesCommands =
    classificationType !== ClassificationType.TERRAIN && !morphing;

  let command;
  const passes = frameState.passes;
  if (passes.render || (passes.pick && primitive.allowPicking)) {
    const colorLength = colorCommands.length;
    for (let j = 0; j < colorLength; ++j) {
      const boundingVolume = boundingSpheres[j];
      if (queueTerrainCommands) {
        command = colorCommands[j];
        updateAndQueueCommand(
          groundPolylinePrimitive,
          command,
          frameState,
          modelMatrix,
          cull,
          boundingVolume,
          debugShowBoundingVolume
        );
      }
      if (queue3DTilesCommands) {
        command = colorCommands[j].derivedCommands.tileset;
        updateAndQueueCommand(
          groundPolylinePrimitive,
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
}

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {DeveloperError} For synchronous GroundPolylinePrimitives, you must call GroundPolylinePrimitives.initializeTerrainHeights() and wait for the returned promise to resolve.
 * @exception {DeveloperError} All GeometryInstances must have color attributes to use PolylineColorAppearance with GroundPolylinePrimitive.
 */
GroundPolylinePrimitive.prototype.update = function (frameState) {
  if (!defined(this._primitive) && !defined(this.geometryInstances)) {
    return;
  }

  if (!ApproximateTerrainHeights.initialized) {
    //>>includeStart('debug', pragmas.debug);
    if (!this.asynchronous) {
      throw new DeveloperError(
        "For synchronous GroundPolylinePrimitives, you must call GroundPolylinePrimitives.initializeTerrainHeights() and wait for the returned promise to resolve."
      );
    }
    //>>includeEnd('debug');

    GroundPolylinePrimitive.initializeTerrainHeights();
    return;
  }

  let i;

  const that = this;
  const primitiveOptions = this._primitiveOptions;
  if (!defined(this._primitive)) {
    const geometryInstances = Array.isArray(this.geometryInstances)
      ? this.geometryInstances
      : [this.geometryInstances];
    const geometryInstancesLength = geometryInstances.length;
    const groundInstances = new Array(geometryInstancesLength);

    let attributes;

    // Check if each instance has a color attribute.
    for (i = 0; i < geometryInstancesLength; ++i) {
      attributes = geometryInstances[i].attributes;
      if (!defined(attributes) || !defined(attributes.color)) {
        this._hasPerInstanceColors = false;
        break;
      }
    }

    for (i = 0; i < geometryInstancesLength; ++i) {
      const geometryInstance = geometryInstances[i];
      attributes = {};
      const instanceAttributes = geometryInstance.attributes;
      for (const attributeKey in instanceAttributes) {
        if (instanceAttributes.hasOwnProperty(attributeKey)) {
          attributes[attributeKey] = instanceAttributes[attributeKey];
        }
      }

      // Automatically create line width attribute if not already given
      if (!defined(attributes.width)) {
        attributes.width = new GeometryInstanceAttribute({
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          componentsPerAttribute: 1.0,
          value: [geometryInstance.geometry.width],
        });
      }

      // Update each geometry for framestate.scene3DOnly = true and projection
      geometryInstance.geometry._scene3DOnly = frameState.scene3DOnly;
      GroundPolylineGeometry.setProjectionAndEllipsoid(
        geometryInstance.geometry,
        frameState.mapProjection
      );

      groundInstances[i] = new GeometryInstance({
        geometry: geometryInstance.geometry,
        attributes: attributes,
        id: geometryInstance.id,
        pickPrimitive: that,
      });
    }

    primitiveOptions.geometryInstances = groundInstances;
    primitiveOptions.appearance = this.appearance;

    primitiveOptions._createShaderProgramFunction = function (
      primitive,
      frameState,
      appearance
    ) {
      createShaderProgram(that, frameState, appearance);
    };
    primitiveOptions._createCommandsFunction = function (
      primitive,
      appearance,
      material,
      translucent,
      twoPasses,
      colorCommands,
      pickCommands
    ) {
      createCommands(
        that,
        appearance,
        material,
        translucent,
        colorCommands,
        pickCommands
      );
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
        debugShowBoundingVolume
      );
    };

    this._primitive = new Primitive(primitiveOptions);
  }

  if (
    this.appearance instanceof PolylineColorAppearance &&
    !this._hasPerInstanceColors
  ) {
    throw new DeveloperError(
      "All GeometryInstances must have color attributes to use PolylineColorAppearance with GroundPolylinePrimitive."
    );
  }

  this._primitive.appearance = this.appearance;
  this._primitive.show = this.show;
  this._primitive.debugShowBoundingVolume = this.debugShowBoundingVolume;
  this._primitive.update(frameState);
  frameState.afterRender.push(() => {
    if (!this._ready && defined(this._primitive) && this._primitive.ready) {
      this._ready = true;

      if (this.releaseGeometryInstances) {
        this.geometryInstances = undefined;
      }
    }
  });
};

/**
 * Returns the modifiable per-instance attributes for a {@link GeometryInstance}.
 *
 * @param {*} id The id of the {@link GeometryInstance}.
 * @returns {object} The typed array in the attribute's format or undefined if the is no instance with id.
 *
 * @exception {DeveloperError} must call update before calling getGeometryInstanceAttributes.
 *
 * @example
 * const attributes = primitive.getGeometryInstanceAttributes('an id');
 * attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.AQUA);
 * attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(true);
 */
GroundPolylinePrimitive.prototype.getGeometryInstanceAttributes = function (
  id
) {
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
 * Checks if the given Scene supports GroundPolylinePrimitives.
 * GroundPolylinePrimitives require support for the WEBGL_depth_texture extension.
 *
 * @param {Scene} scene The current scene.
 * @returns {boolean} Whether or not the current scene supports GroundPolylinePrimitives.
 */
GroundPolylinePrimitive.isSupported = function (scene) {
  return scene.frameState.context.depthTexture;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GroundPolylinePrimitive#destroy
 */
GroundPolylinePrimitive.prototype.isDestroyed = function () {
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
 * @see GroundPolylinePrimitive#isDestroyed
 */
GroundPolylinePrimitive.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  this._sp = this._sp && this._sp.destroy();

  // Derived programs, destroyed above if they existed.
  this._sp2D = undefined;
  this._spMorph = undefined;

  return destroyObject(this);
};
export default GroundPolylinePrimitive;
