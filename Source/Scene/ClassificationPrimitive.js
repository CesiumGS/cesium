import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ShadowVolumeAppearanceVS from "../Shaders/ShadowVolumeAppearanceVS.js";
import ShadowVolumeFS from "../Shaders/ShadowVolumeFS.js";
import when from "../ThirdParty/when.js";
import BlendingState from "./BlendingState.js";
import ClassificationType from "./ClassificationType.js";
import DepthFunction from "./DepthFunction.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Primitive from "./Primitive.js";
import SceneMode from "./SceneMode.js";
import ShadowVolumeAppearance from "./ShadowVolumeAppearance.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";

/**
 * A classification primitive represents a volume enclosing geometry in the {@link Scene} to be highlighted.
 * <p>
 * A primitive combines geometry instances with an {@link Appearance} that describes the full shading, including
 * {@link Material} and {@link RenderState}.  Roughly, the geometry instance defines the structure and placement,
 * and the appearance defines the visual characteristics.  Decoupling geometry and appearance allows us to mix
 * and match most of them and add a new geometry or appearance independently of each other.
 * Only {@link PerInstanceColorAppearance} with the same color across all instances is supported at this time when using
 * ClassificationPrimitive directly.
 * For full {@link Appearance} support when classifying terrain or 3D Tiles use {@link GroundPrimitive} instead.
 * </p>
 * <p>
 * For correct rendering, this feature requires the EXT_frag_depth WebGL extension. For hardware that do not support this extension, there
 * will be rendering artifacts for some viewing angles.
 * </p>
 * <p>
 * Valid geometries are {@link BoxGeometry}, {@link CylinderGeometry}, {@link EllipsoidGeometry}, {@link PolylineVolumeGeometry}, and {@link SphereGeometry}.
 * </p>
 * <p>
 * Geometries that follow the surface of the ellipsoid, such as {@link CircleGeometry}, {@link CorridorGeometry}, {@link EllipseGeometry}, {@link PolygonGeometry}, and {@link RectangleGeometry},
 * are also valid if they are extruded volumes; otherwise, they will not be rendered.
 * </p>
 *
 * @alias ClassificationPrimitive
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Array|GeometryInstance} [options.geometryInstances] The geometry instances to render. This can either be a single instance or an array of length one.
 * @param {Appearance} [options.appearance] The appearance used to render the primitive. Defaults to PerInstanceColorAppearance when GeometryInstances have a color attribute.
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
 * @see Primitive
 * @see GroundPrimitive
 * @see GeometryInstance
 * @see Appearance
 */
function ClassificationPrimitive(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var geometryInstances = options.geometryInstances;

  /**
   * The geometry instance rendered with this primitive.  This may
   * be <code>undefined</code> if <code>options.releaseGeometryInstances</code>
   * is <code>true</code> when the primitive is constructed.
   * <p>
   * Changing this property after the primitive is rendered has no effect.
   * </p>
   * <p>
   * Because of the rendering technique used, all geometry instances must be the same color.
   * If there is an instance with a differing color, a <code>DeveloperError</code> will be thrown
   * on the first attempt to render.
   * </p>
   *
   * @readonly
   * @type {Array|GeometryInstance}
   *
   * @default undefined
   */
  this.geometryInstances = geometryInstances;
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
  this._debugShowShadowVolume = false;

  // These are used by GroundPrimitive to augment the shader and uniform map.
  this._extruded = defaultValue(options._extruded, false);
  this._uniformMap = options._uniformMap;

  this._sp = undefined;
  this._spStencil = undefined;
  this._spPick = undefined;
  this._spColor = undefined;

  this._spPick2D = undefined; // only derived if necessary
  this._spColor2D = undefined; // only derived if necessary

  this._rsStencilDepthPass = undefined;
  this._rsStencilDepthPass3DTiles = undefined;
  this._rsColorPass = undefined;
  this._rsPickPass = undefined;

  this._commandsIgnoreShow = [];

  this._ready = false;
  this._readyPromise = when.defer();

  this._primitive = undefined;
  this._pickPrimitive = options._pickPrimitive;

  // Set in update
  this._hasSphericalExtentsAttribute = false;
  this._hasPlanarExtentsAttributes = false;
  this._hasPerColorAttribute = false;

  this.appearance = options.appearance;

  this._createBoundingVolumeFunction = options._createBoundingVolumeFunction;
  this._updateAndQueueCommandsFunction =
    options._updateAndQueueCommandsFunction;

  this._usePickOffsets = false;

  this._primitiveOptions = {
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
    _createRenderStatesFunction: undefined,
    _createShaderProgramFunction: undefined,
    _createCommandsFunction: undefined,
    _updateAndQueueCommandsFunction: undefined,
    _createPickOffsets: true,
  };
}

Object.defineProperties(ClassificationPrimitive.prototype, {
  /**
   * When <code>true</code>, geometry vertices are optimized for the pre and post-vertex-shader caches.
   *
   * @memberof ClassificationPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  vertexCacheOptimize: {
    get: function () {
      return this._primitiveOptions.vertexCacheOptimize;
    },
  },

  /**
   * Determines if geometry vertex attributes are interleaved, which can slightly improve rendering performance.
   *
   * @memberof ClassificationPrimitive.prototype
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
   * @memberof ClassificationPrimitive.prototype
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
   * @memberof ClassificationPrimitive.prototype
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
   * @memberof ClassificationPrimitive.prototype
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
   * When <code>true</code>, geometry vertices are compressed, which will save memory.
   *
   * @memberof ClassificationPrimitive.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  compressVertices: {
    get: function () {
      return this._primitiveOptions.compressVertices;
    },
  },

  /**
   * Determines if the primitive is complete and ready to render.  If this property is
   * true, the primitive will be rendered the next time that {@link ClassificationPrimitive#update}
   * is called.
   *
   * @memberof ClassificationPrimitive.prototype
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
   * @memberof ClassificationPrimitive.prototype
   * @type {Promise.<ClassificationPrimitive>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Returns true if the ClassificationPrimitive needs a separate shader and commands for 2D.
   * This is because texture coordinates on ClassificationPrimitives are computed differently,
   * and are used for culling when multiple GeometryInstances are batched in one ClassificationPrimitive.
   * @memberof ClassificationPrimitive.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  _needs2DShader: {
    get: function () {
      return (
        this._hasPlanarExtentsAttributes || this._hasSphericalExtentsAttribute
      );
    },
  },
});

/**
 * Determines if ClassificationPrimitive rendering is supported.
 *
 * @param {Scene} scene The scene.
 * @returns {Boolean} <code>true</code> if ClassificationPrimitives are supported; otherwise, returns <code>false</code>
 */
ClassificationPrimitive.isSupported = function (scene) {
  return scene.context.stencilBuffer;
};

function getStencilDepthRenderState(enableStencil, mask3DTiles) {
  var stencilFunction = mask3DTiles
    ? StencilFunction.EQUAL
    : StencilFunction.ALWAYS;
  return {
    colorMask: {
      red: false,
      green: false,
      blue: false,
      alpha: false,
    },
    stencilTest: {
      enabled: enableStencil,
      frontFunction: stencilFunction,
      frontOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.DECREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      backFunction: stencilFunction,
      backOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.INCREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      reference: StencilConstants.CESIUM_3D_TILE_MASK,
      mask: StencilConstants.CESIUM_3D_TILE_MASK,
    },
    stencilMask: StencilConstants.CLASSIFICATION_MASK,
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
    depthMask: false,
  };
}

function getColorRenderState(enableStencil) {
  return {
    stencilTest: {
      enabled: enableStencil,
      frontFunction: StencilFunction.NOT_EQUAL,
      frontOperation: {
        fail: StencilOperation.ZERO,
        zFail: StencilOperation.ZERO,
        zPass: StencilOperation.ZERO,
      },
      backFunction: StencilFunction.NOT_EQUAL,
      backOperation: {
        fail: StencilOperation.ZERO,
        zFail: StencilOperation.ZERO,
        zPass: StencilOperation.ZERO,
      },
      reference: 0,
      mask: StencilConstants.CLASSIFICATION_MASK,
    },
    stencilMask: StencilConstants.CLASSIFICATION_MASK,
    depthTest: {
      enabled: false,
    },
    depthMask: false,
    blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
  };
}

var pickRenderState = {
  stencilTest: {
    enabled: true,
    frontFunction: StencilFunction.NOT_EQUAL,
    frontOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    backFunction: StencilFunction.NOT_EQUAL,
    backOperation: {
      fail: StencilOperation.ZERO,
      zFail: StencilOperation.ZERO,
      zPass: StencilOperation.ZERO,
    },
    reference: 0,
    mask: StencilConstants.CLASSIFICATION_MASK,
  },
  stencilMask: StencilConstants.CLASSIFICATION_MASK,
  depthTest: {
    enabled: false,
  },
  depthMask: false,
};

function createRenderStates(
  classificationPrimitive,
  context,
  appearance,
  twoPasses
) {
  if (defined(classificationPrimitive._rsStencilDepthPass)) {
    return;
  }
  var stencilEnabled = !classificationPrimitive.debugShowShadowVolume;

  classificationPrimitive._rsStencilDepthPass = RenderState.fromCache(
    getStencilDepthRenderState(stencilEnabled, false)
  );
  classificationPrimitive._rsStencilDepthPass3DTiles = RenderState.fromCache(
    getStencilDepthRenderState(stencilEnabled, true)
  );
  classificationPrimitive._rsColorPass = RenderState.fromCache(
    getColorRenderState(stencilEnabled, false)
  );
  classificationPrimitive._rsPickPass = RenderState.fromCache(pickRenderState);
}

function modifyForEncodedNormals(primitive, vertexShaderSource) {
  if (!primitive.compressVertices) {
    return vertexShaderSource;
  }

  if (
    vertexShaderSource.search(/attribute\s+vec3\s+extrudeDirection;/g) !== -1
  ) {
    var attributeName = "compressedAttributes";

    //only shadow volumes use extrudeDirection, and shadow volumes use vertexFormat: POSITION_ONLY so we don't need to check other attributes
    var attributeDecl = "attribute vec2 " + attributeName + ";";

    var globalDecl = "vec3 extrudeDirection;\n";
    var decode =
      "    extrudeDirection = czm_octDecode(" + attributeName + ", 65535.0);\n";

    var modifiedVS = vertexShaderSource;
    modifiedVS = modifiedVS.replace(
      /attribute\s+vec3\s+extrudeDirection;/g,
      ""
    );
    modifiedVS = ShaderSource.replaceMain(
      modifiedVS,
      "czm_non_compressed_main"
    );
    var compressedMain =
      "void main() \n" +
      "{ \n" +
      decode +
      "    czm_non_compressed_main(); \n" +
      "}";

    return [attributeDecl, globalDecl, modifiedVS, compressedMain].join("\n");
  }
}

function createShaderProgram(classificationPrimitive, frameState) {
  var context = frameState.context;
  var primitive = classificationPrimitive._primitive;
  var vs = ShadowVolumeAppearanceVS;
  vs = classificationPrimitive._primitive._batchTable.getVertexShaderCallback()(
    vs
  );
  vs = Primitive._appendDistanceDisplayConditionToShader(primitive, vs);
  vs = Primitive._modifyShaderPosition(
    classificationPrimitive,
    vs,
    frameState.scene3DOnly
  );
  vs = Primitive._updateColorAttribute(primitive, vs);

  var planarExtents = classificationPrimitive._hasPlanarExtentsAttributes;
  var cullFragmentsUsingExtents =
    planarExtents || classificationPrimitive._hasSphericalExtentsAttribute;

  if (classificationPrimitive._extruded) {
    vs = modifyForEncodedNormals(primitive, vs);
  }

  var extrudedDefine = classificationPrimitive._extruded
    ? "EXTRUDED_GEOMETRY"
    : "";

  var vsSource = new ShaderSource({
    defines: [extrudedDefine],
    sources: [vs],
  });
  var fsSource = new ShaderSource({
    sources: [ShadowVolumeFS],
  });
  var attributeLocations =
    classificationPrimitive._primitive._attributeLocations;

  var shadowVolumeAppearance = new ShadowVolumeAppearance(
    cullFragmentsUsingExtents,
    planarExtents,
    classificationPrimitive.appearance
  );

  classificationPrimitive._spStencil = ShaderProgram.replaceCache({
    context: context,
    shaderProgram: classificationPrimitive._spStencil,
    vertexShaderSource: vsSource,
    fragmentShaderSource: fsSource,
    attributeLocations: attributeLocations,
  });

  if (classificationPrimitive._primitive.allowPicking) {
    var vsPick = ShaderSource.createPickVertexShaderSource(vs);
    vsPick = Primitive._appendShowToShader(primitive, vsPick);
    vsPick = Primitive._updatePickColorAttribute(vsPick);

    var pickFS3D = shadowVolumeAppearance.createPickFragmentShader(false);
    var pickVS3D = shadowVolumeAppearance.createPickVertexShader(
      [extrudedDefine],
      vsPick,
      false,
      frameState.mapProjection
    );

    classificationPrimitive._spPick = ShaderProgram.replaceCache({
      context: context,
      shaderProgram: classificationPrimitive._spPick,
      vertexShaderSource: pickVS3D,
      fragmentShaderSource: pickFS3D,
      attributeLocations: attributeLocations,
    });

    // Derive a 2D pick shader if the primitive uses texture coordinate-based fragment culling,
    // since texture coordinates are computed differently in 2D.
    if (cullFragmentsUsingExtents) {
      var pickProgram2D = context.shaderCache.getDerivedShaderProgram(
        classificationPrimitive._spPick,
        "2dPick"
      );
      if (!defined(pickProgram2D)) {
        var pickFS2D = shadowVolumeAppearance.createPickFragmentShader(true);
        var pickVS2D = shadowVolumeAppearance.createPickVertexShader(
          [extrudedDefine],
          vsPick,
          true,
          frameState.mapProjection
        );

        pickProgram2D = context.shaderCache.createDerivedShaderProgram(
          classificationPrimitive._spPick,
          "2dPick",
          {
            vertexShaderSource: pickVS2D,
            fragmentShaderSource: pickFS2D,
            attributeLocations: attributeLocations,
          }
        );
      }
      classificationPrimitive._spPick2D = pickProgram2D;
    }
  } else {
    classificationPrimitive._spPick = ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vsSource,
      fragmentShaderSource: fsSource,
      attributeLocations: attributeLocations,
    });
  }

  vs = Primitive._appendShowToShader(primitive, vs);
  vsSource = new ShaderSource({
    defines: [extrudedDefine],
    sources: [vs],
  });

  classificationPrimitive._sp = ShaderProgram.replaceCache({
    context: context,
    shaderProgram: classificationPrimitive._sp,
    vertexShaderSource: vsSource,
    fragmentShaderSource: fsSource,
    attributeLocations: attributeLocations,
  });

  // Create a fragment shader that computes only required material hookups using screen space techniques
  var fsColorSource = shadowVolumeAppearance.createFragmentShader(false);
  var vsColorSource = shadowVolumeAppearance.createVertexShader(
    [extrudedDefine],
    vs,
    false,
    frameState.mapProjection
  );

  classificationPrimitive._spColor = ShaderProgram.replaceCache({
    context: context,
    shaderProgram: classificationPrimitive._spColor,
    vertexShaderSource: vsColorSource,
    fragmentShaderSource: fsColorSource,
    attributeLocations: attributeLocations,
  });

  // Derive a 2D shader if the primitive uses texture coordinate-based fragment culling,
  // since texture coordinates are computed differently in 2D.
  // Any material that uses texture coordinates will also equip texture coordinate-based fragment culling.
  if (cullFragmentsUsingExtents) {
    var colorProgram2D = context.shaderCache.getDerivedShaderProgram(
      classificationPrimitive._spColor,
      "2dColor"
    );
    if (!defined(colorProgram2D)) {
      var fsColorSource2D = shadowVolumeAppearance.createFragmentShader(true);
      var vsColorSource2D = shadowVolumeAppearance.createVertexShader(
        [extrudedDefine],
        vs,
        true,
        frameState.mapProjection
      );

      colorProgram2D = context.shaderCache.createDerivedShaderProgram(
        classificationPrimitive._spColor,
        "2dColor",
        {
          vertexShaderSource: vsColorSource2D,
          fragmentShaderSource: fsColorSource2D,
          attributeLocations: attributeLocations,
        }
      );
    }
    classificationPrimitive._spColor2D = colorProgram2D;
  }
}

function createColorCommands(classificationPrimitive, colorCommands) {
  var primitive = classificationPrimitive._primitive;
  var length = primitive._va.length * 2; // each geometry (pack of vertex attributes) needs 2 commands: front/back stencils and fill
  colorCommands.length = length;

  var i;
  var command;
  var derivedCommand;
  var vaIndex = 0;
  var uniformMap = primitive._batchTable.getUniformMapCallback()(
    classificationPrimitive._uniformMap
  );

  var needs2DShader = classificationPrimitive._needs2DShader;

  for (i = 0; i < length; i += 2) {
    var vertexArray = primitive._va[vaIndex++];

    // Stencil depth command
    command = colorCommands[i];
    if (!defined(command)) {
      command = colorCommands[i] = new DrawCommand({
        owner: classificationPrimitive,
        primitiveType: primitive._primitiveType,
      });
    }

    command.vertexArray = vertexArray;
    command.renderState = classificationPrimitive._rsStencilDepthPass;
    command.shaderProgram = classificationPrimitive._sp;
    command.uniformMap = uniformMap;
    command.pass = Pass.TERRAIN_CLASSIFICATION;

    derivedCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.tileset
    );
    derivedCommand.renderState =
      classificationPrimitive._rsStencilDepthPass3DTiles;
    derivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    command.derivedCommands.tileset = derivedCommand;

    // Color command
    command = colorCommands[i + 1];
    if (!defined(command)) {
      command = colorCommands[i + 1] = new DrawCommand({
        owner: classificationPrimitive,
        primitiveType: primitive._primitiveType,
      });
    }

    command.vertexArray = vertexArray;
    command.renderState = classificationPrimitive._rsColorPass;
    command.shaderProgram = classificationPrimitive._spColor;
    command.pass = Pass.TERRAIN_CLASSIFICATION;

    var appearance = classificationPrimitive.appearance;
    var material = appearance.material;
    if (defined(material)) {
      uniformMap = combine(uniformMap, material._uniforms);
    }

    command.uniformMap = uniformMap;

    derivedCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.tileset
    );
    derivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    command.derivedCommands.tileset = derivedCommand;

    // Derive for 2D if texture coordinates are ever computed
    if (needs2DShader) {
      // First derive from the terrain command
      var derived2DCommand = DrawCommand.shallowClone(
        command,
        command.derivedCommands.appearance2D
      );
      derived2DCommand.shaderProgram = classificationPrimitive._spColor2D;
      command.derivedCommands.appearance2D = derived2DCommand;

      // Then derive from the 3D Tiles command
      derived2DCommand = DrawCommand.shallowClone(
        derivedCommand,
        derivedCommand.derivedCommands.appearance2D
      );
      derived2DCommand.shaderProgram = classificationPrimitive._spColor2D;
      derivedCommand.derivedCommands.appearance2D = derived2DCommand;
    }
  }

  var commandsIgnoreShow = classificationPrimitive._commandsIgnoreShow;
  var spStencil = classificationPrimitive._spStencil;

  var commandIndex = 0;
  length = commandsIgnoreShow.length = length / 2;

  for (var j = 0; j < length; ++j) {
    var commandIgnoreShow = (commandsIgnoreShow[j] = DrawCommand.shallowClone(
      colorCommands[commandIndex],
      commandsIgnoreShow[j]
    ));
    commandIgnoreShow.shaderProgram = spStencil;
    commandIgnoreShow.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW;

    commandIndex += 2;
  }
}

function createPickCommands(classificationPrimitive, pickCommands) {
  var usePickOffsets = classificationPrimitive._usePickOffsets;

  var primitive = classificationPrimitive._primitive;
  var length = primitive._va.length * 2; // each geometry (pack of vertex attributes) needs 2 commands: front/back stencils and fill

  // Fallback for batching same-color geometry instances
  var pickOffsets;
  var pickIndex = 0;
  var pickOffset;
  if (usePickOffsets) {
    pickOffsets = primitive._pickOffsets;
    length = pickOffsets.length * 2;
  }

  pickCommands.length = length;

  var j;
  var command;
  var derivedCommand;
  var vaIndex = 0;
  var uniformMap = primitive._batchTable.getUniformMapCallback()(
    classificationPrimitive._uniformMap
  );

  var needs2DShader = classificationPrimitive._needs2DShader;

  for (j = 0; j < length; j += 2) {
    var vertexArray = primitive._va[vaIndex++];
    if (usePickOffsets) {
      pickOffset = pickOffsets[pickIndex++];
      vertexArray = primitive._va[pickOffset.index];
    }

    // Stencil depth command
    command = pickCommands[j];
    if (!defined(command)) {
      command = pickCommands[j] = new DrawCommand({
        owner: classificationPrimitive,
        primitiveType: primitive._primitiveType,
        pickOnly: true,
      });
    }

    command.vertexArray = vertexArray;
    command.renderState = classificationPrimitive._rsStencilDepthPass;
    command.shaderProgram = classificationPrimitive._sp;
    command.uniformMap = uniformMap;
    command.pass = Pass.TERRAIN_CLASSIFICATION;
    if (usePickOffsets) {
      command.offset = pickOffset.offset;
      command.count = pickOffset.count;
    }

    // Derive for 3D Tiles classification
    derivedCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.tileset
    );
    derivedCommand.renderState =
      classificationPrimitive._rsStencilDepthPass3DTiles;
    derivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    command.derivedCommands.tileset = derivedCommand;

    // Pick color command
    command = pickCommands[j + 1];
    if (!defined(command)) {
      command = pickCommands[j + 1] = new DrawCommand({
        owner: classificationPrimitive,
        primitiveType: primitive._primitiveType,
        pickOnly: true,
      });
    }

    command.vertexArray = vertexArray;
    command.renderState = classificationPrimitive._rsPickPass;
    command.shaderProgram = classificationPrimitive._spPick;
    command.uniformMap = uniformMap;
    command.pass = Pass.TERRAIN_CLASSIFICATION;
    if (usePickOffsets) {
      command.offset = pickOffset.offset;
      command.count = pickOffset.count;
    }

    derivedCommand = DrawCommand.shallowClone(
      command,
      command.derivedCommands.tileset
    );
    derivedCommand.pass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    command.derivedCommands.tileset = derivedCommand;

    // Derive for 2D if texture coordinates are ever computed
    if (needs2DShader) {
      // First derive from the terrain command
      var derived2DCommand = DrawCommand.shallowClone(
        command,
        command.derivedCommands.pick2D
      );
      derived2DCommand.shaderProgram = classificationPrimitive._spPick2D;
      command.derivedCommands.pick2D = derived2DCommand;

      // Then derive from the 3D Tiles command
      derived2DCommand = DrawCommand.shallowClone(
        derivedCommand,
        derivedCommand.derivedCommands.pick2D
      );
      derived2DCommand.shaderProgram = classificationPrimitive._spPick2D;
      derivedCommand.derivedCommands.pick2D = derived2DCommand;
    }
  }
}

function createCommands(
  classificationPrimitive,
  appearance,
  material,
  translucent,
  twoPasses,
  colorCommands,
  pickCommands
) {
  createColorCommands(classificationPrimitive, colorCommands);
  createPickCommands(classificationPrimitive, pickCommands);
}

function boundingVolumeIndex(commandIndex, length) {
  return Math.floor((commandIndex % length) / 2);
}

function updateAndQueueRenderCommand(
  command,
  frameState,
  modelMatrix,
  cull,
  boundingVolume,
  debugShowBoundingVolume
) {
  command.modelMatrix = modelMatrix;
  command.boundingVolume = boundingVolume;
  command.cull = cull;
  command.debugShowBoundingVolume = debugShowBoundingVolume;

  frameState.commandList.push(command);
}

function updateAndQueuePickCommand(
  command,
  frameState,
  modelMatrix,
  cull,
  boundingVolume
) {
  command.modelMatrix = modelMatrix;
  command.boundingVolume = boundingVolume;
  command.cull = cull;

  frameState.commandList.push(command);
}

function updateAndQueueCommands(
  classificationPrimitive,
  frameState,
  colorCommands,
  pickCommands,
  modelMatrix,
  cull,
  debugShowBoundingVolume,
  twoPasses
) {
  var primitive = classificationPrimitive._primitive;
  Primitive._updateBoundingVolumes(primitive, frameState, modelMatrix);

  var boundingVolumes;
  if (frameState.mode === SceneMode.SCENE3D) {
    boundingVolumes = primitive._boundingSphereWC;
  } else if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
    boundingVolumes = primitive._boundingSphereCV;
  } else if (
    frameState.mode === SceneMode.SCENE2D &&
    defined(primitive._boundingSphere2D)
  ) {
    boundingVolumes = primitive._boundingSphere2D;
  } else if (defined(primitive._boundingSphereMorph)) {
    boundingVolumes = primitive._boundingSphereMorph;
  }

  var classificationType = classificationPrimitive.classificationType;
  var queueTerrainCommands =
    classificationType !== ClassificationType.CESIUM_3D_TILE;
  var queue3DTilesCommands = classificationType !== ClassificationType.TERRAIN;

  var passes = frameState.passes;

  var i;
  var boundingVolume;
  var command;

  if (passes.render) {
    var colorLength = colorCommands.length;
    for (i = 0; i < colorLength; ++i) {
      boundingVolume = boundingVolumes[boundingVolumeIndex(i, colorLength)];
      if (queueTerrainCommands) {
        command = colorCommands[i];
        updateAndQueueRenderCommand(
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
      var ignoreShowCommands = classificationPrimitive._commandsIgnoreShow;
      var ignoreShowCommandsLength = ignoreShowCommands.length;
      for (i = 0; i < ignoreShowCommandsLength; ++i) {
        boundingVolume = boundingVolumes[i];
        command = ignoreShowCommands[i];
        updateAndQueueRenderCommand(
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
    var pickLength = pickCommands.length;
    var pickOffsets = primitive._pickOffsets;
    for (i = 0; i < pickLength; ++i) {
      var pickOffset = pickOffsets[boundingVolumeIndex(i, pickLength)];
      boundingVolume = boundingVolumes[pickOffset.index];
      if (queueTerrainCommands) {
        command = pickCommands[i];
        updateAndQueuePickCommand(
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
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {DeveloperError} All instance geometries must have the same primitiveType.
 * @exception {DeveloperError} Appearance and material have a uniform with the same name.
 * @exception {DeveloperError} Not all of the geometry instances have the same color attribute.
 */
ClassificationPrimitive.prototype.update = function (frameState) {
  if (!defined(this._primitive) && !defined(this.geometryInstances)) {
    return;
  }

  var appearance = this.appearance;
  if (defined(appearance) && defined(appearance.material)) {
    appearance.material.update(frameState.context);
  }

  var that = this;
  var primitiveOptions = this._primitiveOptions;

  if (!defined(this._primitive)) {
    var instances = Array.isArray(this.geometryInstances)
      ? this.geometryInstances
      : [this.geometryInstances];
    var length = instances.length;

    var i;
    var instance;
    var attributes;

    var hasPerColorAttribute = false;
    var allColorsSame = true;
    var firstColor;
    var hasSphericalExtentsAttribute = false;
    var hasPlanarExtentsAttributes = false;

    if (length > 0) {
      attributes = instances[0].attributes;
      // Not expecting these to be set by users, should only be set via GroundPrimitive.
      // So don't check for mismatch.
      hasSphericalExtentsAttribute = ShadowVolumeAppearance.hasAttributesForSphericalExtents(
        attributes
      );
      hasPlanarExtentsAttributes = ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(
        attributes
      );
      firstColor = attributes.color;
    }

    for (i = 0; i < length; i++) {
      instance = instances[i];
      var color = instance.attributes.color;
      if (defined(color)) {
        hasPerColorAttribute = true;
      }
      //>>includeStart('debug', pragmas.debug);
      else if (hasPerColorAttribute) {
        throw new DeveloperError(
          "All GeometryInstances must have color attributes to use per-instance color."
        );
      }
      //>>includeEnd('debug');

      allColorsSame =
        allColorsSame &&
        defined(color) &&
        ColorGeometryInstanceAttribute.equals(firstColor, color);
    }

    // If no attributes exist for computing spherical extents or fragment culling,
    // throw if the colors aren't all the same.
    if (
      !allColorsSame &&
      !hasSphericalExtentsAttribute &&
      !hasPlanarExtentsAttributes
    ) {
      throw new DeveloperError(
        "All GeometryInstances must have the same color attribute except via GroundPrimitives"
      );
    }

    // default to a color appearance
    if (hasPerColorAttribute && !defined(appearance)) {
      appearance = new PerInstanceColorAppearance({
        flat: true,
      });
      this.appearance = appearance;
    }

    //>>includeStart('debug', pragmas.debug);
    if (
      !hasPerColorAttribute &&
      appearance instanceof PerInstanceColorAppearance
    ) {
      throw new DeveloperError(
        "PerInstanceColorAppearance requires color GeometryInstanceAttributes on all GeometryInstances"
      );
    }
    if (
      defined(appearance.material) &&
      !hasSphericalExtentsAttribute &&
      !hasPlanarExtentsAttributes
    ) {
      throw new DeveloperError(
        "Materials on ClassificationPrimitives are not supported except via GroundPrimitives"
      );
    }
    //>>includeEnd('debug');

    this._usePickOffsets =
      !hasSphericalExtentsAttribute && !hasPlanarExtentsAttributes;
    this._hasSphericalExtentsAttribute = hasSphericalExtentsAttribute;
    this._hasPlanarExtentsAttributes = hasPlanarExtentsAttributes;
    this._hasPerColorAttribute = hasPerColorAttribute;

    var geometryInstances = new Array(length);
    for (i = 0; i < length; ++i) {
      instance = instances[i];
      geometryInstances[i] = new GeometryInstance({
        geometry: instance.geometry,
        attributes: instance.attributes,
        modelMatrix: instance.modelMatrix,
        id: instance.id,
        pickPrimitive: defaultValue(this._pickPrimitive, that),
      });
    }

    primitiveOptions.appearance = appearance;
    primitiveOptions.geometryInstances = geometryInstances;

    if (defined(this._createBoundingVolumeFunction)) {
      primitiveOptions._createBoundingVolumeFunction = function (
        frameState,
        geometry
      ) {
        that._createBoundingVolumeFunction(frameState, geometry);
      };
    }

    primitiveOptions._createRenderStatesFunction = function (
      primitive,
      context,
      appearance,
      twoPasses
    ) {
      createRenderStates(that, context);
    };
    primitiveOptions._createShaderProgramFunction = function (
      primitive,
      frameState,
      appearance
    ) {
      createShaderProgram(that, frameState);
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
        undefined,
        undefined,
        true,
        false,
        colorCommands,
        pickCommands
      );
    };

    if (defined(this._updateAndQueueCommandsFunction)) {
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
        that._updateAndQueueCommandsFunction(
          primitive,
          frameState,
          colorCommands,
          pickCommands,
          modelMatrix,
          cull,
          debugShowBoundingVolume,
          twoPasses
        );
      };
    } else {
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
    }

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
    this.debugShowShadowVolume &&
    !this._debugShowShadowVolume &&
    this._ready
  ) {
    this._debugShowShadowVolume = true;
    this._rsStencilDepthPass = RenderState.fromCache(
      getStencilDepthRenderState(false, false)
    );
    this._rsStencilDepthPass3DTiles = RenderState.fromCache(
      getStencilDepthRenderState(false, true)
    );
    this._rsColorPass = RenderState.fromCache(getColorRenderState(false));
  } else if (!this.debugShowShadowVolume && this._debugShowShadowVolume) {
    this._debugShowShadowVolume = false;
    this._rsStencilDepthPass = RenderState.fromCache(
      getStencilDepthRenderState(true, false)
    );
    this._rsStencilDepthPass3DTiles = RenderState.fromCache(
      getStencilDepthRenderState(true, true)
    );
    this._rsColorPass = RenderState.fromCache(getColorRenderState(true));
  }
  // Update primitive appearance
  if (this._primitive.appearance !== appearance) {
    //>>includeStart('debug', pragmas.debug);
    // Check if the appearance is supported by the geometry attributes
    if (
      !this._hasSphericalExtentsAttribute &&
      !this._hasPlanarExtentsAttributes &&
      defined(appearance.material)
    ) {
      throw new DeveloperError(
        "Materials on ClassificationPrimitives are not supported except via GroundPrimitive"
      );
    }
    if (
      !this._hasPerColorAttribute &&
      appearance instanceof PerInstanceColorAppearance
    ) {
      throw new DeveloperError(
        "PerInstanceColorAppearance requires color GeometryInstanceAttribute"
      );
    }
    //>>includeEnd('debug');
    this._primitive.appearance = appearance;
  }

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
ClassificationPrimitive.prototype.getGeometryInstanceAttributes = function (
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
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ClassificationPrimitive#destroy
 */
ClassificationPrimitive.prototype.isDestroyed = function () {
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
 * @see ClassificationPrimitive#isDestroyed
 */
ClassificationPrimitive.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  this._sp = this._sp && this._sp.destroy();
  this._spPick = this._spPick && this._spPick.destroy();
  this._spColor = this._spColor && this._spColor.destroy();

  // Derived programs, destroyed above if they existed.
  this._spPick2D = undefined;
  this._spColor2D = undefined;
  return destroyObject(this);
};
export default ClassificationPrimitive;
