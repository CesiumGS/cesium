import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import NearFarScalar from "../Core/NearFarScalar.js";
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

var TranslucencyMode = {
  FRONT_INVISIBLE: 1,
  FRONT_OPAQUE: 2,
  FRONT_TRANSLUCENT: 3,
  BACK_INVISIBLE: 4,
  BACK_OPAQUE: 8,
  BACK_TRANSLUCENT: 12,
  INVISIBLE: 5, // Shorthand for FRONT_INVISIBLE | BACK_INVISIBLE
  OPAQUE: 10, // Shorthand for FRONT_OPAQUE | BACK_OPAQUE
  FRONT_MASK: 3, // Mask front bits (0-1)
  BACK_MASK: 12, // Mask front bits (2-3)
};

/**
 * @private
 */
function GlobeTranslucencyState() {
  this._translucencyEnabled = false;
  this._frontFaceAlpha = 1.0;
  this._frontFaceAlphaByDistance = undefined;
  this._backFaceAlpha = 1.0;
  this._backFaceAlphaByDistance = undefined;
  this._depthTestAgainstTerrain = false;

  this._frontFaceAlphaByDistanceFinal = new NearFarScalar(0.0, 1.0, 0.0, 1.0);
  this._backFaceAlphaByDistanceFinal = new NearFarScalar(0.0, 1.0, 0.0, 1.0);

  this._translucencyMode = TranslucencyMode.OPAQUE;
  this._frontFaceTranslucencyMode = TranslucencyMode.FRONT_OPAQUE;
  this._backFaceTranslucencyMode = TranslucencyMode.BACK_OPAQUE;
  this._translucent = false;
  this._sunVisibleThroughGlobe = false;
  this._environmentVisible = false;
  this._useDepthPlane = false;
  this._requiresManualDepthTest = false;
  this._numberOfTextureUniforms = 0;
  this._globeTranslucencyFramebuffer = undefined;

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
      return this._frontFaceAlphaByDistanceFinal;
    },
  },
  backFaceAlphaByDistance: {
    get: function () {
      return this._backFaceAlphaByDistanceFinal;
    },
  },
  translucent: {
    get: function () {
      return this._translucent;
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
});

/**
 * @private
 */
GlobeTranslucencyState.prototype.update = function (
  globe,
  globeTranslucencyFramebuffer,
  frameState
) {
  if (!defined(globe) || !globe.show) {
    this._translucent = false;
    this._sunVisibleThroughGlobe = true;
    this._environmentVisible = true;
    this._useDepthPlane = false;
    return;
  }

  this._translucencyEnabled = globe.translucencyEnabled;
  this._frontFaceAlpha = globe.frontFaceAlpha;
  this._frontFaceAlphaByDistance = globe.frontFaceAlphaByDistance;
  this._backFaceAlpha = globe.backFaceAlpha;
  this._backFaceAlphaByDistance = globe.backFaceAlphaByDistance;
  this._depthTestAgainstTerrain = globe.depthTestAgainstTerrain;

  updateFrontFaceAlphaByDistance(this);
  updateBackFaceAlphaByDistance(this);

  var translucencyMode = getTranslucencyMode(this, globe);
  var frontFaceTranslucencyMode =
    translucencyMode & TranslucencyMode.FRONT_MASK;
  var backFaceTranslucencyMode = translucencyMode & TranslucencyMode.BACK_MASK;

  this._translucencyMode = translucencyMode;
  this._frontFaceTranslucencyMode = frontFaceTranslucencyMode;
  this._backFaceTranslucencyMode = backFaceTranslucencyMode;
  this._translucent = isTranslucent(this);
  this._sunVisibleThroughGlobe = isSunVisibleThroughGlobe(this, frameState);
  this._environmentVisible = isEnvironmentVisible(this, frameState);
  this._useDepthPlane = useDepthPlane(this, frameState);
  this._requiresManualDepthTest = requiresManualDepthTest(this, frameState);
  this._numberOfTextureUniforms = getNumberOfTextureUniforms(this);
  this._globeTranslucencyFramebuffer = globeTranslucencyFramebuffer;

  gatherDerivedCommandRequirements(this, frameState);
};

function updateFrontFaceAlphaByDistance(state) {
  updateAlphaByDistance(
    state._translucencyEnabled,
    state._frontFaceAlpha,
    state._frontFaceAlphaByDistance,
    state._frontFaceAlphaByDistanceFinal
  );
}

function updateBackFaceAlphaByDistance(state) {
  updateAlphaByDistance(
    state._translucencyEnabled,
    state._backFaceAlpha,
    state._backFaceAlphaByDistance,
    state._backFaceAlphaByDistanceFinal
  );
}

function updateAlphaByDistance(
  translucencyEnabled,
  alpha,
  alphaByDistance,
  alphaByDistanceFinal
) {
  if (!translucencyEnabled) {
    alphaByDistanceFinal.nearValue = 1.0;
    alphaByDistanceFinal.farValue = 1.0;
    return;
  }

  if (!defined(alphaByDistance)) {
    alphaByDistanceFinal.nearValue = alpha;
    alphaByDistanceFinal.farValue = alpha;
    return;
  }

  NearFarScalar.clone(alphaByDistance, alphaByDistanceFinal);
  alphaByDistanceFinal.nearValue *= alpha;
  alphaByDistanceFinal.farValue *= alpha;
}

function getTranslucencyMode(state, globe) {
  if (!state._translucencyEnabled) {
    return TranslucencyMode.OPAQUE;
  }

  var frontFaceAlphaByDistance = state._frontFaceAlphaByDistanceFinal;
  var backFaceAlphaByDistance = state._backFaceAlphaByDistanceFinal;
  var baseColor = globe.baseColor;
  var baseLayerTranslucent = baseColor.alpha < 1.0;

  var frontInvisible =
    frontFaceAlphaByDistance.nearValue === 0.0 &&
    frontFaceAlphaByDistance.farValue === 0.0;
  var frontOpaque =
    !baseLayerTranslucent &&
    frontFaceAlphaByDistance.nearValue === 1.0 &&
    frontFaceAlphaByDistance.farValue === 1.0;

  var backInvisible =
    backFaceAlphaByDistance.nearValue === 0.0 &&
    backFaceAlphaByDistance.farValue === 0.0;
  var backOpaque =
    !baseLayerTranslucent &&
    backFaceAlphaByDistance.nearValue === 1.0 &&
    backFaceAlphaByDistance.farValue === 1.0;

  var translucencyMode = 0;

  if (frontInvisible) {
    translucencyMode += TranslucencyMode.FRONT_INVISIBLE;
  } else if (frontOpaque) {
    translucencyMode += TranslucencyMode.FRONT_OPAQUE;
  } else {
    translucencyMode += TranslucencyMode.FRONT_TRANSLUCENT;
  }

  if (backInvisible) {
    translucencyMode += TranslucencyMode.BACK_INVISIBLE;
  } else if (backOpaque) {
    translucencyMode += TranslucencyMode.BACK_OPAQUE;
  } else {
    translucencyMode += TranslucencyMode.BACK_TRANSLUCENT;
  }

  return translucencyMode;
}

function isTranslucent(state) {
  return state._frontFaceTranslucencyMode !== TranslucencyMode.FRONT_OPAQUE;
}

function isSunVisibleThroughGlobe(state, frameState) {
  var frontOpaque =
    state._frontFaceTranslucencyMode === TranslucencyMode.FRONT_OPAQUE;
  var backOpaque =
    state._backFaceTranslucencyMode === TranslucencyMode.BACK_OPAQUE;

  // The sun is visible through the globe if the front and back faces are translucent when above ground
  // or if front faces are translucent when below ground
  return !frontOpaque && (frameState.cameraUnderground || !backOpaque);
}

function isEnvironmentVisible(state, frameState) {
  // The environment is visible if the camera is above ground or underground with translucency
  return !frameState.cameraUnderground || state._translucent;
}

function useDepthPlane(state, frameState) {
  // Use the depth plane when the camera is above ground and the globe is opaque
  return !frameState.cameraUnderground && !state._translucent;
}

function requiresManualDepthTest(state, frameState) {
  var translucentOpaqueMode =
    TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_OPAQUE;

  return (
    state._translucencyMode === translucentOpaqueMode &&
    !state._depthTestAgainstTerrain &&
    frameState.context.depthTexture
  );
}

function getNumberOfTextureUniforms(state) {
  var translucent = state._translucent;

  var numberOfTextureUniforms = 0;

  if (translucent) {
    ++numberOfTextureUniforms; // classification texture
  }

  if (state._requiresManualDepthTest) {
    ++numberOfTextureUniforms; // czm_globeDepthTexture for manual depth testing
  }

  return numberOfTextureUniforms;
}

function gatherDerivedCommandRequirements(state, frameState) {
  state._derivedCommandsLength = getDerivedCommandTypes(
    state,
    frameState,
    false,
    false,
    state._derivedCommandTypes
  );

  state._derivedBlendCommandsLength = getDerivedCommandTypes(
    state,
    frameState,
    true,
    false,
    state._derivedBlendCommandTypes
  );

  state._derivedPickCommandsLength = getDerivedCommandTypes(
    state,
    frameState,
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

  if (!defined(state._derivedCommandPacks) && state._translucent) {
    state._derivedCommandPacks = createDerivedCommandPacks();
  }
}

function getDerivedCommandTypes(
  state,
  frameState,
  isBlendCommand,
  isPickCommand,
  types
) {
  var length = 0;
  var translucencyMode = state._translucencyMode;

  if (translucencyMode === TranslucencyMode.INVISIBLE) {
    // Don't use derived commands if both front and back faces are invisible
    return length;
  }

  if (state._frontFaceTranslucencyMode === TranslucencyMode.FRONT_OPAQUE) {
    // Don't use derived commands if the globe is opaque
    return length;
  }

  if (frameState.mode === SceneMode.SCENE2D) {
    types[length++] = DerivedCommandType.DEPTH_ONLY_FRONT_FACE;
    types[length++] = DerivedCommandType.TRANSLUCENT_FRONT_FACE;
    return length;
  }

  var cameraUnderground = frameState.cameraUnderground;
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

  if (
    translucencyMode ===
    (TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_TRANSLUCENT)
  ) {
    // Push depth-only command for classification. Blend commands do not need to write depth.
    // Push translucent front and back face commands.
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
  } else if (
    translucencyMode ===
    (TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_OPAQUE)
  ) {
    // Push opaque command for the face that appears in back.
    // Push depth-only command and translucent command for the face that appears in front.
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
  } else if (
    translucencyMode ===
    (TranslucencyMode.FRONT_TRANSLUCENT | TranslucencyMode.BACK_INVISIBLE)
  ) {
    // Push depth-only command and translucent command for the face that appears in front.
    if (cameraUnderground) {
      if (!isBlendCommand) {
        types[length++] = DerivedCommandType.DEPTH_ONLY_BACK_FACE;
      }
      types[length++] = translucentBackFaceCommandType;
    } else {
      if (!isBlendCommand) {
        types[length++] = DerivedCommandType.DEPTH_ONLY_FRONT_FACE;
      }
      types[length++] = translucentFrontFaceCommandType;
    }
  } else if (
    translucencyMode ===
    (TranslucencyMode.FRONT_INVISIBLE | TranslucencyMode.BACK_TRANSLUCENT)
  ) {
    // Push depth-only command and translucent command for the face that appears in back.
    if (cameraUnderground) {
      if (!isBlendCommand) {
        types[length++] = DerivedCommandType.DEPTH_ONLY_FRONT_FACE;
      }
      types[length++] = translucentFrontFaceCommandType;
    } else {
      if (!isBlendCommand) {
        types[length++] = DerivedCommandType.DEPTH_ONLY_BACK_FACE;
      }
      types[length++] = translucentBackFaceCommandType;
    }
  } else if (
    translucencyMode ===
    (TranslucencyMode.FRONT_INVISIBLE | TranslucencyMode.BACK_OPAQUE)
  ) {
    // Push command for the opaque pass
    if (frameState.cameraUnderground) {
      types[length++] = DerivedCommandType.OPAQUE_FRONT_FACE;
    } else {
      types[length++] = DerivedCommandType.OPAQUE_BACK_FACE;
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
  if (fs.defines.indexOf("TILE_LIMIT_RECTANGLE") > -1) {
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
        renderStateDirtyFrame ||
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
  var translucencyMode = this._translucencyMode;
  if (translucencyMode === TranslucencyMode.INVISIBLE) {
    // Don't push any commands if both front and back faces are invisible
    return;
  }

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
  scene,
  passState
) {
  var context = scene.context;
  var globeCommands = frustumCommands.commands[Pass.GLOBE];
  var globeCommandsLength = frustumCommands.indices[Pass.GLOBE];

  if (globeCommandsLength === 0) {
    return;
  }

  this._globeTranslucencyFramebuffer.clearClassification(context, passState);

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

  var frontFaceTranslucencyMode = this._frontFaceTranslucencyMode;
  var backFaceTranslucencyMode = this._backFaceTranslucencyMode;

  var frontOpaque = frontFaceTranslucencyMode === TranslucencyMode.FRONT_OPAQUE;
  var backOpaque = backFaceTranslucencyMode === TranslucencyMode.BACK_OPAQUE;
  var frontTranslucent =
    frontFaceTranslucencyMode === TranslucencyMode.FRONT_TRANSLUCENT;
  var backTranslucent =
    backFaceTranslucencyMode === TranslucencyMode.BACK_TRANSLUCENT;

  if (frontOpaque || backOpaque) {
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

  var globeTranslucencyFramebuffer = this._globeTranslucencyFramebuffer;

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
