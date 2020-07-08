import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import Rectangle from "../Core/Rectangle.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import BlendingState from "./BlendingState.js";
import CullFace from "./CullFace.js";
import SceneMode from "./SceneMode.js";

var DerivedCommandType = {
  OPAQUE_FRONT_FACE: 0,
  OPAQUE_BACK_FACE: 1,
  DEPTH_ONLY_FRONT_FACE: 2,
  DEPTH_ONLY_BACK_FACE: 3,
  DEPTH_ONLY_FRONT_AND_BACK_FACE: 4,
  TRANSLUCENT_FRONT_FACE: 5,
  TRANSLUCENT_BACK_FACE: 6,
  TRANSLUCENT_FRONT_FACE_MANUAL_DEPTH_TEST: 7,
  TRANSLUCENT_BACK_FACE_MANUAL_DEPTH_TEST: 8,
  PICK_FRONT_FACE: 9,
  PICK_BACK_FACE: 10,
  DERIVED_COMMANDS_MAXIMUM_LENGTH: 11,
};

var derivedCommandsMaximumLength =
  DerivedCommandType.DERIVED_COMMANDS_MAXIMUM_LENGTH;

var DerivedCommandNames = [
  "opaqueFrontFaceCommand",
  "opaqueBackFaceCommand",
  "depthOnlyFrontFaceCommand",
  "depthOnlyBackFaceCommand",
  "depthOnlyFrontAndBackFaceCommand",
  "translucentFrontFaceCommand",
  "translucentBackFaceCommand",
  "translucentFrontFaceManualDepthTestCommand",
  "translucentBackFaceManualDepthTestCommand",
  "pickFrontFaceCommand",
  "pickBackFaceCommand",
];

/**
 * @private
 */
function GlobeTranslucencyState() {
  this._frontFaceAlphaByDistance = new NearFarScalar(0.0, 1.0, 0.0, 1.0);
  this._backFaceAlphaByDistance = new NearFarScalar(0.0, 1.0, 0.0, 1.0);

  this._frontFaceTranslucent = false;
  this._backFaceTranslucent = false;
  this._requiresManualDepthTest = false;
  this._sunVisibleThroughGlobe = false;
  this._environmentVisible = false;
  this._useDepthPlane = false;
  this._numberOfTextureUniforms = 0;
  this._globeTranslucencyFramebuffer = undefined;
  this._rectangle = Rectangle.clone(Rectangle.MAX_VALUE);

  this._derivedCommandKey = 0;
  this._derivedCommandsDirty = false;
  this._derivedCommandPacks = undefined;

  this._derivedCommandTypes = new Array(derivedCommandsMaximumLength);
  this._derivedBlendCommandTypes = new Array(derivedCommandsMaximumLength);
  this._derivedPickCommandTypes = new Array(derivedCommandsMaximumLength);
  this._derivedCommandTypesToUpdate = new Array(derivedCommandsMaximumLength);

  this._derivedCommandsLength = 0;
  this._derivedBlendCommandsLength = 0;
  this._derivedPickCommandsLength = 0;
  this._derivedCommandsToUpdateLength = 0;
}

Object.defineProperties(GlobeTranslucencyState.prototype, {
  frontFaceAlphaByDistance: {
    get: function () {
      return this._frontFaceAlphaByDistance;
    },
  },
  backFaceAlphaByDistance: {
    get: function () {
      return this._backFaceAlphaByDistance;
    },
  },
  translucent: {
    get: function () {
      return this._frontFaceTranslucent;
    },
  },
  sunVisibleThroughGlobe: {
    get: function () {
      return this._sunVisibleThroughGlobe;
    },
  },
  environmentVisible: {
    get: function () {
      return this._environmentVisible;
    },
  },
  useDepthPlane: {
    get: function () {
      return this._useDepthPlane;
    },
  },
  numberOfTextureUniforms: {
    get: function () {
      return this._numberOfTextureUniforms;
    },
  },
  rectangle: {
    get: function () {
      return this._rectangle;
    },
  },
});

GlobeTranslucencyState.prototype.update = function (scene) {
  var globe = scene.globe;
  if (!defined(globe) || !globe.show) {
    this._frontFaceTranslucent = false;
    this._backFaceTranslucent = false;
    this._sunVisibleThroughGlobe = true;
    this._environmentVisible = true;
    this._useDepthPlane = false;
    return;
  }

  this._frontFaceAlphaByDistance = updateAlphaByDistance(
    globe.translucency.enabled,
    globe.translucency.frontFaceAlpha,
    globe.translucency.frontFaceAlphaByDistance,
    this._frontFaceAlphaByDistance
  );
  this._backFaceAlphaByDistance = updateAlphaByDistance(
    globe.translucency.enabled,
    globe.translucency.backFaceAlpha,
    globe.translucency.backFaceAlphaByDistance,
    this._backFaceAlphaByDistance
  );

  this._frontFaceTranslucent = isFaceTranslucent(
    globe.translucency.enabled,
    this._frontFaceAlphaByDistance,
    globe
  );
  this._backFaceTranslucent = isFaceTranslucent(
    globe.translucency.enabled,
    this._backFaceAlphaByDistance,
    globe
  );

  this._requiresManualDepthTest = requiresManualDepthTest(this, scene, globe);

  this._sunVisibleThroughGlobe = isSunVisibleThroughGlobe(this, scene);
  this._environmentVisible = isEnvironmentVisible(this, scene);
  this._useDepthPlane = useDepthPlane(this, scene);
  this._numberOfTextureUniforms = getNumberOfTextureUniforms(this);

  this._rectangle = Rectangle.clone(
    globe.translucency.rectangle,
    this._rectangle
  );

  gatherDerivedCommandRequirements(this, scene);
};

function updateAlphaByDistance(enabled, alpha, alphaByDistance, result) {
  if (!enabled) {
    result.nearValue = 1.0;
    result.farValue = 1.0;
    return result;
  }

  if (!defined(alphaByDistance)) {
    result.nearValue = alpha;
    result.farValue = alpha;
    return result;
  }

  NearFarScalar.clone(alphaByDistance, result);
  result.nearValue *= alpha;
  result.farValue *= alpha;
  return result;
}

function isFaceTranslucent(translucencyEnabled, alphaByDistance, globe) {
  return (
    translucencyEnabled &&
    (globe.baseColor.alpha < 1.0 ||
      alphaByDistance.nearValue < 1.0 ||
      alphaByDistance.farValue < 1.0)
  );
}

function isSunVisibleThroughGlobe(state, scene) {
  // The sun is visible through the globe if the front and back faces are translucent when above ground
  // or if front faces are translucent when below ground
  var frontTranslucent = state._frontFaceTranslucent;
  var backTranslucent = state._backFaceTranslucent;
  return frontTranslucent && (scene.cameraUnderground || backTranslucent);
}

function isEnvironmentVisible(state, scene) {
  // The environment is visible if the camera is above ground or underground with translucency
  return !scene.cameraUnderground || state._frontFaceTranslucent;
}

function useDepthPlane(state, scene) {
  // Use the depth plane when the camera is above ground and the globe is opaque
  return !scene.cameraUnderground && !state._frontFaceTranslucent;
}

function requiresManualDepthTest(state, scene, globe) {
  return (
    state._frontFaceTranslucent &&
    !state._backFaceTranslucent &&
    !globe.depthTestAgainstTerrain &&
    scene.mode !== SceneMode.SCENE2D &&
    scene.context.depthTexture
  );
}

function getNumberOfTextureUniforms(state) {
  var numberOfTextureUniforms = 0;

  if (state._frontFaceTranslucent) {
    ++numberOfTextureUniforms; // classification texture
  }

  if (state._requiresManualDepthTest) {
    ++numberOfTextureUniforms; // czm_globeDepthTexture for manual depth testing
  }

  return numberOfTextureUniforms;
}

function gatherDerivedCommandRequirements(state, scene) {
  state._derivedCommandsLength = getDerivedCommandTypes(
    state,
    scene,
    false,
    false,
    state._derivedCommandTypes
  );

  state._derivedBlendCommandsLength = getDerivedCommandTypes(
    state,
    scene,
    true,
    false,
    state._derivedBlendCommandTypes
  );

  state._derivedPickCommandsLength = getDerivedCommandTypes(
    state,
    scene,
    false,
    true,
    state._derivedPickCommandTypes
  );

  var i;

  var derivedCommandKey = 0;
  for (i = 0; i < state._derivedCommandsLength; ++i) {
    derivedCommandKey |= 1 << state._derivedCommandTypes[i];
  }
  for (i = 0; i < state._derivedBlendCommandsLength; ++i) {
    derivedCommandKey |= 1 << state._derivedBlendCommandTypes[i];
  }
  for (i = 0; i < state._derivedPickCommandsLength; ++i) {
    derivedCommandKey |= 1 << state._derivedPickCommandTypes[i];
  }

  var derivedCommandsToUpdateLength = 0;
  for (i = 0; i < derivedCommandsMaximumLength; ++i) {
    if ((derivedCommandKey & (1 << i)) > 0) {
      state._derivedCommandTypesToUpdate[derivedCommandsToUpdateLength++] = i;
    }
  }
  state._derivedCommandsToUpdateLength = derivedCommandsToUpdateLength;

  var derivedCommandsDirty = derivedCommandKey !== state._derivedCommandKey;
  state._derivedCommandKey = derivedCommandKey;
  state._derivedCommandsDirty = derivedCommandsDirty;

  if (!defined(state._derivedCommandPacks) && state._frontFaceTranslucent) {
    state._derivedCommandPacks = createDerivedCommandPacks();
  }
}

function getDerivedCommandTypes(
  state,
  scene,
  isBlendCommand,
  isPickCommand,
  types
) {
  var length = 0;

  var frontTranslucent = state._frontFaceTranslucent;
  var backTranslucent = state._backFaceTranslucent;

  if (!frontTranslucent) {
    // Don't use derived commands if the globe is opaque
    return length;
  }

  var cameraUnderground = scene.cameraUnderground;
  var requiresManualDepthTest = state._requiresManualDepthTest;

  var translucentFrontFaceCommandType = isPickCommand
    ? DerivedCommandType.PICK_FRONT_FACE
    : requiresManualDepthTest
    ? DerivedCommandType.TRANSLUCENT_FRONT_FACE_MANUAL_DEPTH_TEST
    : DerivedCommandType.TRANSLUCENT_FRONT_FACE;

  var translucentBackFaceCommandType = isPickCommand
    ? DerivedCommandType.PICK_BACK_FACE
    : requiresManualDepthTest
    ? DerivedCommandType.TRANSLUCENT_BACK_FACE_MANUAL_DEPTH_TEST
    : DerivedCommandType.TRANSLUCENT_BACK_FACE;

  if (scene.mode === SceneMode.SCENE2D) {
    types[length++] = DerivedCommandType.DEPTH_ONLY_FRONT_FACE;
    types[length++] = translucentFrontFaceCommandType;
    return length;
  }

  if (backTranslucent) {
    // Push depth-only command for classification. Blend commands do not need to write depth.
    // Push translucent commands for front and back faces.
    if (!isBlendCommand) {
      types[length++] = DerivedCommandType.DEPTH_ONLY_FRONT_AND_BACK_FACE;
    }
    if (cameraUnderground) {
      types[length++] = translucentFrontFaceCommandType;
      types[length++] = translucentBackFaceCommandType;
    } else {
      types[length++] = translucentBackFaceCommandType;
      types[length++] = translucentFrontFaceCommandType;
    }
  } else {
    // Push opaque command for the face that appears in back.
    // Push depth-only command and translucent command for the face that appears in front.
    // eslint-disable-next-line no-lonely-if
    if (cameraUnderground) {
      if (!isBlendCommand) {
        types[length++] = DerivedCommandType.DEPTH_ONLY_BACK_FACE;
      }
      types[length++] = DerivedCommandType.OPAQUE_FRONT_FACE;
      types[length++] = translucentBackFaceCommandType;
    } else {
      if (!isBlendCommand) {
        types[length++] = DerivedCommandType.DEPTH_ONLY_FRONT_FACE;
      }
      types[length++] = DerivedCommandType.OPAQUE_BACK_FACE;
      types[length++] = translucentFrontFaceCommandType;
    }
  }

  return length;
}

function removeDefine(defines, defineToRemove) {
  var index = defines.indexOf(defineToRemove);
  if (index > -1) {
    defines.splice(index, 1);
  }
}

function hasDefine(defines, define) {
  return defines.indexOf(define) > -1;
}

function getOpaqueFrontFaceShaderProgram(vs, fs) {
  removeDefine(vs.defines, "TRANSLUCENT");
  removeDefine(fs.defines, "TRANSLUCENT");
}

function getOpaqueBackFaceShaderProgram(vs, fs) {
  removeDefine(vs.defines, "GROUND_ATMOSPHERE");
  removeDefine(fs.defines, "GROUND_ATMOSPHERE");
  removeDefine(vs.defines, "FOG");
  removeDefine(fs.defines, "FOG");
  removeDefine(vs.defines, "TRANSLUCENT");
  removeDefine(fs.defines, "TRANSLUCENT");
}

function getDepthOnlyShaderProgram(vs, fs) {
  if (
    hasDefine(fs.defines, "TILE_LIMIT_RECTANGLE") ||
    hasDefine(fs.defines, "ENABLE_CLIPPING_PLANES")
  ) {
    // Need to execute the full shader if discard is called
    return;
  }

  var depthOnlyShader =
    "void main() \n" + "{ \n" + "    gl_FragColor = vec4(1.0); \n" + "} \n";

  fs.sources = [depthOnlyShader];
}

function getTranslucentShaderProgram(vs, fs) {
  var sources = fs.sources;
  var length = sources.length;
  for (var i = 0; i < length; ++i) {
    sources[i] = ShaderSource.replaceMain(
      sources[i],
      "czm_globe_translucency_main"
    );
  }

  var globeTranslucencyMain =
    "\n\n" +
    "uniform sampler2D u_classificationTexture; \n" +
    "void main() \n" +
    "{ \n" +
    "    vec2 st = gl_FragCoord.xy / czm_viewport.zw; \n" +
    "#ifdef MANUAL_DEPTH_TEST \n" +
    "    float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, st)); \n" +
    "    if (logDepthOrDepth != 0.0) \n" +
    "    { \n" +
    "        vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth); \n" +
    "        float depthEC = eyeCoordinate.z / eyeCoordinate.w; \n" +
    "        if (v_positionEC.z < depthEC) \n" +
    "        { \n" +
    "            discard; \n" +
    "        } \n" +
    "    } \n" +
    "#endif \n" +
    "    czm_globe_translucency_main(); \n" +
    "    vec4 classificationColor = texture2D(u_classificationTexture, st); \n" +
    "    if (classificationColor.a > 0.0) \n" +
    "    { \n" +
    "        // Reverse premultiplication process to get the correct composited result of the classification primitives \n" +
    "        classificationColor.rgb /= classificationColor.a; \n" +
    "    } \n" +
    "    gl_FragColor = classificationColor * vec4(classificationColor.aaa, 1.0) + gl_FragColor * (1.0 - classificationColor.a); \n" +
    "} \n";

  sources.push(globeTranslucencyMain);
}

function getTranslucentBackFaceShaderProgram(vs, fs) {
  getTranslucentShaderProgram(vs, fs);
  removeDefine(vs.defines, "GROUND_ATMOSPHERE");
  removeDefine(fs.defines, "GROUND_ATMOSPHERE");
  removeDefine(vs.defines, "FOG");
  removeDefine(fs.defines, "FOG");
}

function getTranslucentFrontFaceManualDepthTestShaderProgram(vs, fs) {
  getTranslucentShaderProgram(vs, fs);
  vs.defines.push("GENERATE_POSITION");
  fs.defines.push("MANUAL_DEPTH_TEST");
}

function getTranslucentBackFaceManualDepthTestShaderProgram(vs, fs) {
  getTranslucentBackFaceShaderProgram(vs, fs);
  vs.defines.push("GENERATE_POSITION");
  fs.defines.push("MANUAL_DEPTH_TEST");
}

function getPickShaderProgram(vs, fs) {
  var pickShader =
    "uniform sampler2D u_classificationTexture; \n" +
    "void main() \n" +
    "{ \n" +
    "    vec2 st = gl_FragCoord.xy / czm_viewport.zw; \n" +
    "    vec4 pickColor = texture2D(u_classificationTexture, st); \n" +
    "    if (pickColor == vec4(0.0)) \n" +
    "    { \n" +
    "        discard; \n" +
    "    } \n" +
    "    gl_FragColor = pickColor; \n" +
    "} \n";

  fs.sources = [pickShader];
}

function getDerivedShaderProgram(
  context,
  shaderProgram,
  derivedShaderProgram,
  shaderProgramDirty,
  getShaderProgramFunction,
  cacheName
) {
  if (!defined(getShaderProgramFunction)) {
    return shaderProgram;
  }

  if (!shaderProgramDirty && defined(derivedShaderProgram)) {
    return derivedShaderProgram;
  }

  var shader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    cacheName
  );
  if (!defined(shader)) {
    var attributeLocations = shaderProgram._attributeLocations;
    var vs = shaderProgram.vertexShaderSource.clone();
    var fs = shaderProgram.fragmentShaderSource.clone();
    vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
    fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];

    getShaderProgramFunction(vs, fs);

    shader = context.shaderCache.createDerivedShaderProgram(
      shaderProgram,
      cacheName,
      {
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      }
    );
  }

  return shader;
}

function getOpaqueFrontFaceRenderState(renderState) {
  renderState.cull.face = CullFace.BACK;
  renderState.cull.enabled = true;
}

function getOpaqueBackFaceRenderState(renderState) {
  renderState.cull.face = CullFace.FRONT;
  renderState.cull.enabled = true;
}

function getDepthOnlyFrontFaceRenderState(renderState) {
  renderState.cull.face = CullFace.BACK;
  renderState.cull.enabled = true;
  renderState.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };
}

function getDepthOnlyBackFaceRenderState(renderState) {
  renderState.cull.face = CullFace.FRONT;
  renderState.cull.enabled = true;
  renderState.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };
}

function getDepthOnlyFrontAndBackFaceRenderState(renderState) {
  renderState.cull.enabled = false;
  renderState.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };
}

function getTranslucentFrontFaceRenderState(renderState) {
  renderState.cull.face = CullFace.BACK;
  renderState.cull.enabled = true;
  renderState.depthMask = false;
  renderState.blending = BlendingState.ALPHA_BLEND;
}

function getTranslucentBackFaceRenderState(renderState) {
  renderState.cull.face = CullFace.FRONT;
  renderState.cull.enabled = true;
  renderState.depthMask = false;
  renderState.blending = BlendingState.ALPHA_BLEND;
}

function getPickFrontFaceRenderState(renderState) {
  renderState.cull.face = CullFace.BACK;
  renderState.cull.enabled = true;
  renderState.blending.enabled = false;
}

function getPickBackFaceRenderState(renderState) {
  renderState.cull.face = CullFace.FRONT;
  renderState.cull.enabled = true;
  renderState.blending.enabled = false;
}

function getDerivedRenderState(
  renderState,
  derivedRenderState,
  renderStateDirty,
  getRenderStateFunction,
  cache
) {
  if (!defined(getRenderStateFunction)) {
    return renderState;
  }

  if (!renderStateDirty && defined(derivedRenderState)) {
    return derivedRenderState;
  }

  var cachedRenderState = cache[renderState.id];
  if (!defined(cachedRenderState)) {
    var rs = RenderState.getState(renderState);
    getRenderStateFunction(rs);
    cachedRenderState = RenderState.fromCache(rs);
    cache[renderState.id] = cachedRenderState;
  }

  return cachedRenderState;
}

function getTranslucencyUniformMap(state) {
  return {
    u_classificationTexture: function () {
      return state._globeTranslucencyFramebuffer.classificationTexture;
    },
  };
}

function getDerivedUniformMap(
  state,
  uniformMap,
  derivedUniformMap,
  uniformMapDirty,
  getDerivedUniformMapFunction
) {
  if (!defined(getDerivedUniformMapFunction)) {
    return uniformMap;
  }

  if (!uniformMapDirty && defined(derivedUniformMap)) {
    return derivedUniformMap;
  }

  return combine(uniformMap, getDerivedUniformMapFunction(state), false);
}

function DerivedCommandPack(options) {
  this.pass = options.pass;
  this.pickOnly = options.pickOnly;
  this.getShaderProgramFunction = options.getShaderProgramFunction;
  this.getRenderStateFunction = options.getRenderStateFunction;
  this.getUniformMapFunction = options.getUniformMapFunction;
  this.renderStateCache = {};
}

function createDerivedCommandPacks() {
  return [
    // opaqueFrontFaceCommand
    new DerivedCommandPack({
      pass: Pass.GLOBE,
      pickOnly: false,
      getShaderProgramFunction: getOpaqueFrontFaceShaderProgram,
      getRenderStateFunction: getOpaqueFrontFaceRenderState,
      getUniformMapFunction: undefined,
    }),
    // opaqueBackFaceCommand
    new DerivedCommandPack({
      pass: Pass.GLOBE,
      pickOnly: false,
      getShaderProgramFunction: getOpaqueBackFaceShaderProgram,
      getRenderStateFunction: getOpaqueBackFaceRenderState,
      getUniformMapFunction: undefined,
    }),
    // depthOnlyFrontFaceCommand
    new DerivedCommandPack({
      pass: Pass.GLOBE,
      pickOnly: false,
      getShaderProgramFunction: getDepthOnlyShaderProgram,
      getRenderStateFunction: getDepthOnlyFrontFaceRenderState,
      getUniformMapFunction: undefined,
    }),
    // depthOnlyBackFaceCommand
    new DerivedCommandPack({
      pass: Pass.GLOBE,
      pickOnly: false,
      getShaderProgramFunction: getDepthOnlyShaderProgram,
      getRenderStateFunction: getDepthOnlyBackFaceRenderState,
      getUniformMapFunction: undefined,
    }),
    // depthOnlyFrontAndBackFaceCommand
    new DerivedCommandPack({
      pass: Pass.GLOBE,
      pickOnly: false,
      getShaderProgramFunction: getDepthOnlyShaderProgram,
      getRenderStateFunction: getDepthOnlyFrontAndBackFaceRenderState,
      getUniformMapFunction: undefined,
    }),
    // translucentFrontFaceCommand
    new DerivedCommandPack({
      pass: Pass.TRANSLUCENT,
      pickOnly: false,
      getShaderProgramFunction: getTranslucentShaderProgram,
      getRenderStateFunction: getTranslucentFrontFaceRenderState,
      getUniformMapFunction: getTranslucencyUniformMap,
    }),
    // translucentBackFaceCommand
    new DerivedCommandPack({
      pass: Pass.TRANSLUCENT,
      pickOnly: false,
      getShaderProgramFunction: getTranslucentBackFaceShaderProgram,
      getRenderStateFunction: getTranslucentBackFaceRenderState,
      getUniformMapFunction: getTranslucencyUniformMap,
    }),
    // translucentFrontFaceManualDepthTestCommand
    new DerivedCommandPack({
      pass: Pass.TRANSLUCENT,
      pickOnly: false,
      getShaderProgramFunction: getTranslucentFrontFaceManualDepthTestShaderProgram,
      getRenderStateFunction: getTranslucentFrontFaceRenderState,
      getUniformMapFunction: getTranslucencyUniformMap,
    }),
    // translucentBackFaceManualDepthTestCommand
    new DerivedCommandPack({
      pass: Pass.TRANSLUCENT,
      pickOnly: false,
      getShaderProgramFunction: getTranslucentBackFaceManualDepthTestShaderProgram,
      getRenderStateFunction: getTranslucentBackFaceRenderState,
      getUniformMapFunction: getTranslucencyUniformMap,
    }),
    // pickFrontFaceCommand
    new DerivedCommandPack({
      pass: Pass.TRANSLUCENT,
      pickOnly: true,
      getShaderProgramFunction: getPickShaderProgram,
      getRenderStateFunction: getPickFrontFaceRenderState,
      getUniformMapFunction: getTranslucencyUniformMap,
    }),
    // pickBackFaceCommand
    new DerivedCommandPack({
      pass: Pass.TRANSLUCENT,
      pickOnly: true,
      getShaderProgramFunction: getPickShaderProgram,
      getRenderStateFunction: getPickBackFaceRenderState,
      getUniformMapFunction: getTranslucencyUniformMap,
    }),
  ];
}

var derivedCommandNames = new Array(derivedCommandsMaximumLength);
var derivedCommandPacks = new Array(derivedCommandsMaximumLength);

GlobeTranslucencyState.prototype.updateDerivedCommands = function (
  command,
  frameState
) {
  var derivedCommandTypes = this._derivedCommandTypesToUpdate;
  var derivedCommandsLength = this._derivedCommandsToUpdateLength;

  if (derivedCommandsLength === 0) {
    return;
  }

  for (var i = 0; i < derivedCommandsLength; ++i) {
    derivedCommandPacks[i] = this._derivedCommandPacks[derivedCommandTypes[i]];
    derivedCommandNames[i] = DerivedCommandNames[derivedCommandTypes[i]];
  }

  updateDerivedCommands(
    this,
    command,
    derivedCommandsLength,
    derivedCommandTypes,
    derivedCommandNames,
    derivedCommandPacks,
    frameState
  );
};

function updateDerivedCommands(
  state,
  command,
  derivedCommandsLength,
  derivedCommandTypes,
  derivedCommandNames,
  derivedCommandPacks,
  frameState
) {
  var derivedCommandsObject = command.derivedCommands.globeTranslucency;
  var derivedCommandsDirty = state._derivedCommandsDirty;

  if (
    command.dirty ||
    !defined(derivedCommandsObject) ||
    derivedCommandsDirty
  ) {
    command.dirty = false;

    if (!defined(derivedCommandsObject)) {
      derivedCommandsObject = {};
      command.derivedCommands.globeTranslucency = derivedCommandsObject;
    }

    var frameNumber = frameState.frameNumber;

    var uniformMapDirtyFrame = defaultValue(
      derivedCommandsObject.uniformMapDirtyFrame,
      0
    );
    var shaderProgramDirtyFrame = defaultValue(
      derivedCommandsObject.shaderProgramDirtyFrame,
      0
    );
    var renderStateDirtyFrame = defaultValue(
      derivedCommandsObject.renderStateDirtyFrame,
      0
    );

    var uniformMapDirty =
      derivedCommandsObject.uniformMap !== command.uniformMap;

    var shaderProgramDirty =
      derivedCommandsObject.shaderProgramId !== command.shaderProgram.id;

    var renderStateDirty =
      derivedCommandsObject.renderStateId !== command.renderState.id;

    if (uniformMapDirty) {
      derivedCommandsObject.uniformMapDirtyFrame = frameNumber;
    }
    if (shaderProgramDirty) {
      derivedCommandsObject.shaderProgramDirtyFrame = frameNumber;
    }
    if (renderStateDirty) {
      derivedCommandsObject.renderStateDirtyFrame = frameNumber;
    }

    derivedCommandsObject.uniformMap = command.uniformMap;
    derivedCommandsObject.shaderProgramId = command.shaderProgram.id;
    derivedCommandsObject.renderStateId = command.renderState.id;

    for (var i = 0; i < derivedCommandsLength; ++i) {
      var derivedCommandPack = derivedCommandPacks[i];
      var derivedCommandType = derivedCommandTypes[i];
      var derivedCommandName = derivedCommandNames[i];
      var derivedCommand = derivedCommandsObject[derivedCommandName];

      var derivedUniformMap;
      var derivedShaderProgram;
      var derivedRenderState;

      if (defined(derivedCommand)) {
        derivedUniformMap = derivedCommand.uniformMap;
        derivedShaderProgram = derivedCommand.shaderProgram;
        derivedRenderState = derivedCommand.renderState;
      } else {
        derivedUniformMap = undefined;
        derivedShaderProgram = undefined;
        derivedRenderState = undefined;
      }

      derivedCommand = DrawCommand.shallowClone(command, derivedCommand);
      derivedCommandsObject[derivedCommandName] = derivedCommand;

      var derivedUniformMapDirtyFrame = defaultValue(
        derivedCommand.derivedCommands.uniformMapDirtyFrame,
        0
      );
      var derivedShaderProgramDirtyFrame = defaultValue(
        derivedCommand.derivedCommands.shaderProgramDirtyFrame,
        0
      );
      var derivedRenderStateDirtyFrame = defaultValue(
        derivedCommand.derivedCommands.renderStateDirtyFrame,
        0
      );

      var derivedUniformMapDirty =
        uniformMapDirty || derivedUniformMapDirtyFrame < uniformMapDirtyFrame;
      var derivedShaderProgramDirty =
        shaderProgramDirty ||
        derivedShaderProgramDirtyFrame < shaderProgramDirtyFrame;
      var derivedRenderStateDirty =
        renderStateDirty ||
        derivedRenderStateDirtyFrame < renderStateDirtyFrame;

      if (derivedUniformMapDirty) {
        derivedCommand.derivedCommands.uniformMapDirtyFrame = frameNumber;
      }
      if (derivedShaderProgramDirty) {
        derivedCommand.derivedCommands.shaderProgramDirtyFrame = frameNumber;
      }
      if (derivedRenderStateDirty) {
        derivedCommand.derivedCommands.renderStateDirtyFrame = frameNumber;
      }

      derivedCommand.derivedCommands.type = derivedCommandType;
      derivedCommand.pass = derivedCommandPack.pass;
      derivedCommand.pickOnly = derivedCommandPack.pickOnly;
      derivedCommand.uniformMap = getDerivedUniformMap(
        state,
        command.uniformMap,
        derivedUniformMap,
        derivedUniformMapDirty,
        derivedCommandPack.getUniformMapFunction
      );
      derivedCommand.shaderProgram = getDerivedShaderProgram(
        frameState.context,
        command.shaderProgram,
        derivedShaderProgram,
        derivedShaderProgramDirty,
        derivedCommandPack.getShaderProgramFunction,
        derivedCommandName
      );
      derivedCommand.renderState = getDerivedRenderState(
        command.renderState,
        derivedRenderState,
        derivedRenderStateDirty,
        derivedCommandPack.getRenderStateFunction,
        derivedCommandPack.renderStateCache
      );
    }
  }
}

GlobeTranslucencyState.prototype.pushDerivedCommands = function (
  command,
  isBlendCommand,
  frameState
) {
  var picking = frameState.passes.pick;
  if (picking && isBlendCommand) {
    // No need to push blend commands in the pick pass
    return;
  }

  var derivedCommandTypes = this._derivedCommandTypes;
  var derivedCommandsLength = this._derivedCommandsLength;

  if (picking) {
    derivedCommandTypes = this._derivedPickCommandTypes;
    derivedCommandsLength = this._derivedPickCommandsLength;
  } else if (isBlendCommand) {
    derivedCommandTypes = this._derivedBlendCommandTypes;
    derivedCommandsLength = this._derivedBlendCommandsLength;
  }

  if (derivedCommandsLength === 0) {
    // No derived commands to push so just push the globe command
    frameState.commandList.push(command);
    return;
  }

  // Push derived commands
  var derivedCommands = command.derivedCommands.globeTranslucency;
  for (var i = 0; i < derivedCommandsLength; ++i) {
    var derivedCommandName = DerivedCommandNames[derivedCommandTypes[i]];
    frameState.commandList.push(derivedCommands[derivedCommandName]);
  }
};

function executeCommandsMatchingType(
  commands,
  commandsLength,
  executeCommandFunction,
  scene,
  context,
  passState,
  types
) {
  for (var i = 0; i < commandsLength; ++i) {
    var command = commands[i];
    var type = command.derivedCommands.type;
    if (!defined(types) || types.indexOf(type) > -1) {
      executeCommandFunction(command, scene, context, passState);
    }
  }
}

function executeCommands(
  commands,
  commandsLength,
  executeCommandFunction,
  scene,
  context,
  passState
) {
  for (var i = 0; i < commandsLength; ++i) {
    executeCommandFunction(commands[i], scene, context, passState);
  }
}

var opaqueTypes = [
  DerivedCommandType.OPAQUE_FRONT_FACE,
  DerivedCommandType.OPAQUE_BACK_FACE,
];
var depthOnlyTypes = [
  DerivedCommandType.DEPTH_ONLY_FRONT_FACE,
  DerivedCommandType.DEPTH_ONLY_BACK_FACE,
  DerivedCommandType.DEPTH_ONLY_FRONT_AND_BACK_FACE,
];

GlobeTranslucencyState.prototype.executeGlobeCommands = function (
  frustumCommands,
  executeCommandFunction,
  globeTranslucencyFramebuffer,
  scene,
  passState
) {
  var context = scene.context;
  var globeCommands = frustumCommands.commands[Pass.GLOBE];
  var globeCommandsLength = frustumCommands.indices[Pass.GLOBE];

  if (globeCommandsLength === 0) {
    return;
  }

  this._globeTranslucencyFramebuffer = globeTranslucencyFramebuffer;
  globeTranslucencyFramebuffer.clearClassification(context, passState);

  // Render opaque commands like normal
  executeCommandsMatchingType(
    globeCommands,
    globeCommandsLength,
    executeCommandFunction,
    scene,
    context,
    passState,
    opaqueTypes
  );
};

GlobeTranslucencyState.prototype.executeGlobeClassificationCommands = function (
  frustumCommands,
  executeCommandFunction,
  globeTranslucencyFramebuffer,
  scene,
  passState
) {
  var context = scene.context;
  var globeCommands = frustumCommands.commands[Pass.GLOBE];
  var globeCommandsLength = frustumCommands.indices[Pass.GLOBE];
  var classificationCommands =
    frustumCommands.commands[Pass.TERRAIN_CLASSIFICATION];
  var classificationCommandsLength =
    frustumCommands.indices[Pass.TERRAIN_CLASSIFICATION];

  if (globeCommandsLength === 0 || classificationCommandsLength === 0) {
    return;
  }

  var frontTranslucent = this._frontFaceTranslucent;
  var backTranslucent = this._backFaceTranslucent;

  if (!frontTranslucent || !backTranslucent) {
    // Render classification on opaque faces like normal
    executeCommands(
      classificationCommands,
      classificationCommandsLength,
      executeCommandFunction,
      scene,
      context,
      passState
    );
  }

  if (!frontTranslucent && !backTranslucent) {
    // No translucent commands to render. Skip translucent classification.
    return;
  }

  this._globeTranslucencyFramebuffer = globeTranslucencyFramebuffer;

  var originalGlobeDepthTexture = context.uniformState.globeDepthTexture;
  var originalFramebuffer = passState.framebuffer;

  // Render to internal framebuffer and get the first depth peel
  passState.framebuffer =
    globeTranslucencyFramebuffer.classificationFramebuffer;

  executeCommandsMatchingType(
    globeCommands,
    globeCommandsLength,
    executeCommandFunction,
    scene,
    context,
    passState,
    depthOnlyTypes
  );

  if (context.depthTexture) {
    // Pack depth into separate texture for ground polylines and textured ground primitives
    var packedDepthTexture = globeTranslucencyFramebuffer.packDepth(
      context,
      passState
    );
    context.uniformState.globeDepthTexture = packedDepthTexture;
  }

  // Render classification on translucent faces
  executeCommands(
    classificationCommands,
    classificationCommandsLength,
    executeCommandFunction,
    scene,
    context,
    passState
  );

  // Unset temporary state
  context.uniformState.globeDepthTexture = originalGlobeDepthTexture;
  passState.framebuffer = originalFramebuffer;
};

export default GlobeTranslucencyState;
