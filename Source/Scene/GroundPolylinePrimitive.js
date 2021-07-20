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
import when from "../ThirdParty/when.js";
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
 * @param {Object} [options] Object with the following properties:
 * @param {Array|GeometryInstance} [options.geometryInstances] GeometryInstances containing GroundPolylineGeometry
 * @param {Appearance} [options.appearance] The Appearance used to render the polyline. Defaults to a white color {@link Material} on a {@link PolylineMaterialAppearance}.
 * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
 * @param {Boolean} [options.interleave=false] When <code>true</code>, geometry vertex attributes are interleaved, which can slightly improve rendering performance but increases load time.
 * @param {Boolean} [options.releaseGeometryInstances=true] When <code>true</code>, the primitive does not keep a reference to the input <code>geometryInstances</code> to save memory.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each geometry instance will only be pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
 * @param {Boolean} [options.asynchronous=true] Determines if the primitive will be created asynchronously or block until ready. If false initializeTerrainHeights() must be called first.
 * @param {ClassificationType} [options.classificationType=ClassificationType.BOTH] Determines whether terrain, 3D Tiles or both will be classified.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
 * @param {Boolean} [options.debugShowShadowVolume=false] For debugging only. Determines if the shadow volume for each geometry in the primitive is drawn. Must be <code>true</code> on creation to have effect.
 *
 * @example
 * // 1. Draw a polyline on terrain with a basic color material
 *
 * var instance = new Cesium.GeometryInstance({
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
 * var instance = new Cesium.GeometryInstance({
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
 *   geometryInstances : instance,
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

  var appearance = options.appearance;
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
  this._readyPromise = when.defer();

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
   * @type {Boolean}
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
   * @type {Boolean}
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
   * @type {Boolean}
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
   * @type {Boolean}
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
   * @memberof GroundPolylinePrimitive.prototype
   * @type {when.Promise.<GroundPolylinePrimitive>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
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
   * @type {Boolean}
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
 * @returns {when.Promise.<void>} A promise that will resolve once the terrain heights have been loaded.
 */
GroundPolylinePrimitive.initializeTerrainHeights = function () {
  return ApproximateTerrainHeights.initialize();
};

function createShaderProgram(groundPolylinePrimitive, frameState, appearance) {
  var context = frameState.context;
  var primitive = groundPolylinePrimitive._primitive;
  var attributeLocations = primitive._attributeLocations;

  var vs = primitive._batchTable.getVertexShaderCallback()(
    PolylineShadowVolumeVS
  );
  vs = Primitive._appendShowToShader(primitive, vs);
  vs = Primitive._appendDistanceDisplayConditionToShader(primitive, vs);
  vs = Primitive._modifyShaderPosition(
    groundPolylinePrimitive,
    vs,
    frameState.scene3DOnly
  );

  var vsMorph = primitive._batchTable.getVertexShaderCallback()(
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
  var fs = primitive._batchTable.getVertexShaderCallback()(
    PolylineShadowVolumeFS
  );

  var vsDefines = [
    "GLOBE_MINIMUM_ALTITUDE " +
      frameState.mapProjection.ellipsoid.minimumRadius.toFixed(1),
  ];
  var colorDefine = "";
  var materialShaderSource = "";
  if (defined(appearance.material)) {
    materialShaderSource = defined(appearance.material)
      ? appearance.material.shaderSource
      : "";

    // Check for use of v_width and v_polylineAngle in material shader
    // to determine whether these varyings should be active in the vertex shader.
    if (
      materialShaderSource.search(/varying\s+float\s+v_polylineAngle;/g) !== -1
    ) {
      vsDefines.push("ANGLE_VARYING");
    }
    if (materialShaderSource.search(/varying\s+float\s+v_width;/g) !== -1) {
      vsDefines.push("WIDTH_VARYING");
    }
  } else {
    colorDefine = "PER_INSTANCE_COLOR";
  }

  vsDefines.push(colorDefine);
  var fsDefines = groundPolylinePrimitive.debugShowShadowVolume
    ? ["DEBUG_SHOW_VOLUME", colorDefine]
    : [colorDefine];

  var vsColor3D = new ShaderSource({
    defines: vsDefines,
    sources: [vs],
  });
  var fsColor3D = new ShaderSource({
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
  var colorProgram2D = context.shaderCache.getDerivedShaderProgram(
    groundPolylinePrimitive._sp,
    "2dColor"
  );
  if (!defined(colorProgram2D)) {
    var vsColor2D = new ShaderSource({
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
  var colorProgramMorph = context.shaderCache.getDerivedShaderProgram(
    groundPolylinePrimitive._sp,
    "MorphColor"
  );
  if (!defined(colorProgramMorph)) {
    var vsColorMorph = new ShaderSource({
      defines: vsDefines.concat([
        "MAX_TERRAIN_HEIGHT " +
          ApproximateTerrainHeights._defaultMaxTerrainHeight.toFixed(1),
      ]),
      sources: [vsMorph],
    });

    fs = primitive._batchTable.getVertexShaderCallback()(
      PolylineShadowVolumeMorphFS
    );
    var fsColorMorph = new ShaderSource({
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
  var primitive = groundPolylinePrimitive._primitive;
  var length = primitive._va.length;
  colorCommands.length = length;
  pickCommands.length = length;

  var isPolylineColorAppearance = appearance instanceof PolylineColorAppearance;

  var materialUniforms = isPolylineColorAppearance ? {} : material._uniforms;
  var uniformMap = primitive._batchTable.getUniformMapCallback()(
    materialUniforms
  );

  for (var i = 0; i < length; i++) {
    var vertexArray = primitive._va[i];

    var command = colorCommands[i];
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

    var derivedTilesetCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.tileset
    );
    derivedTilesetCommand.renderState =
      groundPolylinePrimitive._renderState3DTiles;
    derivedTilesetCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    command.derivedCommands.tileset = derivedTilesetCommand;

    // derive for 2D
    var derived2DCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.color2D
    );
    derived2DCommand.shaderProgram = groundPolylinePrimitive._sp2D;
    command.derivedCommands.color2D = derived2DCommand;

    var derived2DTilesetCommand = DrawCommand.shallowClone(
      derivedTilesetCommand,
      derivedTilesetCommand.derivedCommands.color2D
    );
    derived2DTilesetCommand.shaderProgram = groundPolylinePrimitive._sp2D;
    derivedTilesetCommand.derivedCommands.color2D = derived2DTilesetCommand;

    // derive for Morph
    var derivedMorphCommand = DrawCommand.shallowClone(
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
  var primitive = groundPolylinePrimitive._primitive;

  Primitive._updateBoundingVolumes(primitive, frameState, modelMatrix); // Expected to be identity - GroundPrimitives don't support other model matrices

  var boundingSpheres;
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

  var morphing = frameState.mode === SceneMode.MORPHING;
  var classificationType = groundPolylinePrimitive.classificationType;
  var queueTerrainCommands =
    classificationType !== ClassificationType.CESIUM_3D_TILE;
  var queue3DTilesCommands =
    classificationType !== ClassificationType.TERRAIN && !morphing;

  var command;
  var passes = frameState.passes;
  if (passes.render || (passes.pick && primitive.allowPicking)) {
    var colorLength = colorCommands.length;
    for (var j = 0; j < colorLength; ++j) {
      var boundingVolume = boundingSpheres[j];
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

  var i;

  var that = this;
  var primitiveOptions = this._primitiveOptions;
  if (!defined(this._primitive)) {
    var geometryInstances = Array.isArray(this.geometryInstances)
      ? this.geometryInstances
      : [this.geometryInstances];
    var geometryInstancesLength = geometryInstances.length;
    var groundInstances = new Array(geometryInstancesLength);

    var attributes;

    // Check if each instance has a color attribute.
    for (i = 0; i < geometryInstancesLength; ++i) {
      attributes = geometryInstances[i].attributes;
      if (!defined(attributes) || !defined(attributes.color)) {
        this._hasPerInstanceColors = false;
        break;
      }
    }

    for (i = 0; i < geometryInstancesLength; ++i) {
      var geometryInstance = geometryInstances[i];
      attributes = {};
      var instanceAttributes = geometryInstance.attributes;
      for (var attributeKey in instanceAttributes) {
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
    this._primitive.readyPromise.then(function (primitive) {
      that._ready = true;

      if (that.releaseGeometryInstances) {
        that.geometryInstances = undefined;
      }

      var error = primitive._error;
      if (!defined(error)) {
        that._readyPromise.resolve(that);
      } else {
        that._readyPromise.reject(error);
      }
    });
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
 * var attributes = primitive.getGeometryInstanceAttributes('an id');
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
 * @returns {Boolean} Whether or not the current scene supports GroundPolylinePrimitives.
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
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
