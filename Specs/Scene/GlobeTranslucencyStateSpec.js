import { Color } from "../../Source/Cesium.js";
import { DrawCommand } from "../../Source/Cesium.js";
import { FrustumCommands } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import { GlobeTranslucencyFramebuffer } from "../../Source/Cesium.js";
import { GlobeTranslucencyState } from "../../Source/Cesium.js";
import { NearFarScalar } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { PassState } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { SceneMode } from "../../Source/Cesium.js";
import { ShaderProgram } from "../../Source/Cesium.js";
import { ShaderSource } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

let scene;
let globe;
let frameState;
let state;
let framebuffer;

function reset() {
  scene._globe = globe;

  globe.show = true;
  globe.translucency.enabled = false;
  globe.translucency.frontFaceAlpha = 1.0;
  globe.translucency.frontFaceAlphaByDistance = undefined;
  globe.translucency.backFaceAlpha = 1.0;
  globe.translucency.backFaceAlphaByDistance = undefined;
  globe.baseColor = Color.WHITE;
  globe.depthTestAgainstTerrain = false;

  frameState.commandList.length = 0;
  frameState.passes.pick = false;
  frameState.frameNumber = 0;

  scene._cameraUnderground = false;
  scene._mode = SceneMode.SCENE3D;
}

function createShaderProgram(colorString) {
  const vs = "void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); }";
  const fs = `void main() { gl_FragColor = vec4(${colorString}); }`;

  const vertexShaderSource = new ShaderSource({
    sources: [vs],
  });

  const fragmentShaderSource = new ShaderSource({
    sources: [fs],
  });

  return ShaderProgram.fromCache({
    context: scene.context,
    vertexShaderSource: vertexShaderSource,
    fragmentShaderSource: fragmentShaderSource,
  });
}

function createDrawCommand() {
  const uniformMap = {};
  const shaderProgram = createShaderProgram("0.0");

  const renderState = RenderState.fromCache({
    depthMask: true,
    cull: {
      enabled: true,
    },
  });

  const drawCommand = new DrawCommand({
    shaderProgram: shaderProgram,
    uniformMap: uniformMap,
    renderState: renderState,
  });

  return drawCommand;
}

describe("Scene/GlobeTranslucencyState", function () {
  beforeAll(function () {
    scene = createScene();
    scene.globe = new Globe();
    globe = scene.globe;
    frameState = scene.frameState;
    state = new GlobeTranslucencyState();
    framebuffer = new GlobeTranslucencyFramebuffer();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  beforeEach(function () {
    reset();
  });

  it("gets front face alpha by distance", function () {
    // Opaque
    reset();
    state.update(scene);
    const frontFaceAlphaByDistance = state.frontFaceAlphaByDistance;
    const backFaceAlphaByDistance = state.backFaceAlphaByDistance;
    expect(frontFaceAlphaByDistance.nearValue).toBe(1.0);
    expect(frontFaceAlphaByDistance.farValue).toBe(1.0);
    expect(backFaceAlphaByDistance.nearValue).toBe(1.0);
    expect(backFaceAlphaByDistance.farValue).toBe(1.0);

    // Front and back translucent
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.translucency.backFaceAlpha = 0.25;
    state.update(scene);
    expect(frontFaceAlphaByDistance.nearValue).toBe(0.5);
    expect(frontFaceAlphaByDistance.farValue).toBe(0.5);
    expect(backFaceAlphaByDistance.nearValue).toBe(0.25);
    expect(backFaceAlphaByDistance.farValue).toBe(0.25);

    // Front and back translucent with alpha by distance
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.translucency.backFaceAlpha = 0.25;
    globe.translucency.frontFaceAlphaByDistance = new NearFarScalar(
      0.0,
      0.5,
      1.0,
      0.75
    );
    state.update(scene);
    expect(frontFaceAlphaByDistance.nearValue).toBe(0.25);
    expect(frontFaceAlphaByDistance.farValue).toBe(0.375);
    expect(backFaceAlphaByDistance.nearValue).toBe(0.25);
    expect(backFaceAlphaByDistance.farValue).toBe(0.25);
  });

  it("detects if globe is translucent", function () {
    // Returns false when globe is undefined
    reset();
    scene._globe = undefined;
    state.update(scene);
    expect(state.translucent).toBe(false);

    // Returns false when globe.show is false
    reset();
    globe.show = false;
    state.update(scene);
    expect(state.translucent).toBe(false);

    // Returns false for default globe
    reset();
    state.update(scene);
    expect(state.translucent).toBe(false);

    // Returns true when base color is translucent
    reset();
    globe.translucency.enabled = true;
    globe.baseColor = Color.TRANSPARENT;
    state.update(scene);
    expect(state.translucent).toBe(true);

    // Returns true when front face alpha is less than 1.0
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    state.update(scene);
    expect(state.translucent).toBe(true);
  });

  it("detects if sun is visible through globe", function () {
    // Returns true when globe is undefined
    reset();
    scene._globe = undefined;
    state.update(scene);
    expect(state.sunVisibleThroughGlobe).toBe(true);

    // Returns true when globe.show is false
    reset();
    globe.show = false;
    state.update(scene);
    expect(state.sunVisibleThroughGlobe).toBe(true);

    // Returns false for default globe
    reset();
    state.update(scene);
    expect(state.sunVisibleThroughGlobe).toBe(false);

    // Returns true if front face and back face are translucent and camera is above ground
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.translucency.backFaceAlpha = 0.5;
    state.update(scene);
    expect(state.sunVisibleThroughGlobe).toBe(true);

    // Returns false if front face is translucent and back face is opaque and camera is above ground
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    state.update(scene);
    expect(state.sunVisibleThroughGlobe).toBe(false);

    // Returns true if front face is translucent and camera is underground
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    scene._cameraUnderground = true;
    state.update(scene);
    expect(state.sunVisibleThroughGlobe).toBe(true);
  });

  it("detects if environment is visible", function () {
    // Returns true when globe is undefined
    reset();
    scene._globe = undefined;
    state.update(scene);
    expect(state.environmentVisible).toBe(true);

    // Returns true when globe.show is false
    reset();
    globe.show = false;
    state.update(scene);
    expect(state.environmentVisible).toBe(true);

    // Returns true for default globe
    reset();
    state.update(scene);
    expect(state.environmentVisible).toBe(true);

    // Returns false if globe is opaque and camera is underground
    reset();
    scene._cameraUnderground = true;
    state.update(scene);
    expect(state.environmentVisible).toBe(false);

    // Returns true if front faces are translucent and camera is underground
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    scene._cameraUnderground = true;
    state.update(scene);
    expect(state.environmentVisible).toBe(true);
  });

  it("detects whether to use depth plane", function () {
    // Returns false when globe is undefined
    reset();
    scene._globe = undefined;
    state.update(scene);
    expect(state.useDepthPlane).toBe(false);

    // Returns false when globe.show is false
    reset();
    globe.show = false;
    state.update(scene);
    expect(state.useDepthPlane).toBe(false);

    // Returns false if camera is underground
    reset();
    scene._cameraUnderground = true;
    state.update(scene);
    expect(state.useDepthPlane).toBe(false);

    // Return false when globe is translucent
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    state.update(scene);
    expect(state.useDepthPlane).toBe(false);
  });

  it("gets number of texture uniforms required", function () {
    // Returns zero if globe is opaque
    reset();
    state.update(scene);
    expect(state.numberOfTextureUniforms).toBe(0);

    // Returns two when globe is translucent and manual depth testing is required
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    state.update(scene);
    expect(state.numberOfTextureUniforms).toBe(1 + scene.context.depthTexture);

    // Returns one when globe is translucent and manual depth testing is not required
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    expect(state.numberOfTextureUniforms).toBe(1);
  });

  function checkTypes(state, typeArrays) {
    const derivedCommandTypes = state._derivedCommandTypes;
    const derivedBlendCommandTypes = state._derivedBlendCommandTypes;
    const derivedPickCommandTypes = state._derivedPickCommandTypes;
    const derivedCommandTypesToUpdate = state._derivedCommandTypesToUpdate;

    const length = state._derivedCommandsLength;
    const blendLength = state._derivedBlendCommandsLength;
    const pickLength = state._derivedPickCommandsLength;
    const updateLength = state._derivedCommandsToUpdateLength;

    const types = derivedCommandTypes.slice(0, length);
    const blendTypes = derivedBlendCommandTypes.slice(0, blendLength);
    const pickTypes = derivedPickCommandTypes.slice(0, pickLength);
    const updateTypes = derivedCommandTypesToUpdate.slice(0, updateLength);

    expect(types).toEqual(typeArrays[0]);
    expect(blendTypes).toEqual(typeArrays[1]);
    expect(pickTypes).toEqual(typeArrays[2]);
    expect(updateTypes).toEqual(typeArrays[3]);
  }

  it("gets derived commands to update", function () {
    // Front opaque
    reset();
    state.update(scene);
    checkTypes(state, [[], [], [], []]);

    // Front translucent, back opaque
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    checkTypes(state, [
      [2, 1, 5],
      [1, 5],
      [2, 1, 9],
      [1, 2, 5, 9],
    ]);

    // Front translucent, back opaque, manual depth test
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    state.update(scene);

    if (frameState.context.depthTexture) {
      checkTypes(state, [
        [2, 1, 7],
        [1, 7],
        [2, 1, 9],
        [1, 2, 7, 9],
      ]);
    } else {
      checkTypes(state, [
        [2, 1, 5],
        [1, 5],
        [2, 1, 9],
        [1, 2, 5, 9],
      ]);
    }

    // Front translucent, back opaque, manual depth test, camera underground
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    scene._cameraUnderground = true;
    state.update(scene);
    if (frameState.context.depthTexture) {
      checkTypes(state, [
        [3, 0, 8],
        [0, 8],
        [3, 0, 10],
        [0, 3, 8, 10],
      ]);
    } else {
      checkTypes(state, [
        [3, 0, 6],
        [0, 6],
        [3, 0, 10],
        [0, 3, 6, 10],
      ]);
    }

    // Front translucent, back translucent
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.translucency.backFaceAlpha = 0.5;
    state.update(scene);
    checkTypes(state, [
      [4, 6, 5],
      [6, 5],
      [4, 10, 9],
      [4, 5, 6, 9, 10],
    ]);

    // Front translucent, back translucent, camera underground
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.translucency.backFaceAlpha = 0.5;
    scene._cameraUnderground = true;
    state.update(scene);
    checkTypes(state, [
      [4, 5, 6],
      [5, 6],
      [4, 9, 10],
      [4, 5, 6, 9, 10],
    ]);

    // Translucent, 2D
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    scene._mode = SceneMode.SCENE2D;
    state.update(scene);
    checkTypes(state, [
      [2, 5],
      [2, 5],
      [2, 9],
      [2, 5, 9],
    ]);
  });

  it("detects when derived command requirements have changed", function () {
    // Front opaque
    reset();
    state.update(scene);

    // Front translucent, back opaque
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    expect(state._derivedCommandsDirty).toBe(true);

    // Same state
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    expect(state._derivedCommandsDirty).toBe(false);
  });

  it("does not update derived commands when globe is opaque", function () {
    const command = createDrawCommand();

    reset();
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    const derivedCommands = command.derivedCommands.globeTranslucency;
    expect(derivedCommands).toBeUndefined();
  });

  it("updates derived commands", function () {
    const command = createDrawCommand();
    const uniformMap = command.uniformMap;
    const shaderProgram = command.shaderProgram;
    const renderState = command.renderState;

    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    let derivedCommands = command.derivedCommands.globeTranslucency;
    expect(derivedCommands).toBeDefined();
    expect(derivedCommands.opaqueBackFaceCommand).toBeDefined();
    expect(derivedCommands.depthOnlyFrontFaceCommand).toBeDefined();
    expect(derivedCommands.translucentFrontFaceCommand).toBeDefined();
    expect(derivedCommands.pickFrontFaceCommand).toBeDefined();
    expect(derivedCommands.pickBackFaceCommand).toBeUndefined();

    let derivedCommand = derivedCommands.translucentFrontFaceCommand;
    const derivedUniformMap = derivedCommand.uniformMap;
    const derivedShaderProgram = derivedCommand.shaderProgram;
    const derivedRenderState = derivedCommand.renderState;

    expect(derivedUniformMap).not.toBe(uniformMap);
    expect(derivedShaderProgram).not.toBe(shaderProgram);
    expect(derivedRenderState).not.toBe(renderState);

    // Check that the derived commands get updated when the command changes
    command.uniformMap = {};
    command.shaderProgram = createShaderProgram("1.0");
    command.renderState = RenderState.fromCache({
      colorMask: {
        red: false,
      },
    });

    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    derivedCommands = command.derivedCommands.globeTranslucency;
    derivedCommand = derivedCommands.translucentFrontFaceCommand;

    expect(derivedCommand.uniformMap).not.toBe(derivedUniformMap);
    expect(derivedCommand.shaderProgram).not.toBe(derivedShaderProgram);
    expect(derivedCommand.renderState).not.toBe(derivedRenderState);
    expect(derivedCommand.uniformMap).not.toBe(uniformMap);
    expect(derivedCommand.shaderProgram).not.toBe(shaderProgram);
    expect(derivedCommand.renderState).not.toBe(renderState);

    // Check that cached shader programs and render states are used
    command.uniformMap = uniformMap;
    command.shaderProgram = shaderProgram;
    command.renderState = renderState;

    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    derivedCommands = command.derivedCommands.globeTranslucency;
    derivedCommand = derivedCommands.translucentFrontFaceCommand;

    expect(derivedCommand.uniformMap).not.toBe(derivedUniformMap);
    expect(derivedCommand.shaderProgram).toBe(derivedShaderProgram);
    expect(derivedCommand.renderState).toBe(derivedRenderState);
  });

  it("does not push derived commands when blend command is in the pick pass", function () {
    const command = createDrawCommand();

    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    frameState.passes.pick = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    state.pushDerivedCommands(command, true, frameState);

    expect(frameState.commandList.length).toBe(0);
  });

  it("pushes globe command when globe is opaque", function () {
    const command = createDrawCommand();

    reset();
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    state.pushDerivedCommands(command, false, frameState);

    expect(frameState.commandList.length).toBe(1);
    expect(frameState.commandList[0]).toBe(command);
  });

  it("pushes derived commands when globe is translucent", function () {
    const command = createDrawCommand();

    // isBlendCommand = false
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    state.pushDerivedCommands(command, false, frameState);

    const derivedCommands = command.derivedCommands.globeTranslucency;
    expect(frameState.commandList).toEqual([
      derivedCommands.depthOnlyFrontFaceCommand,
      derivedCommands.opaqueBackFaceCommand,
      derivedCommands.translucentFrontFaceCommand,
    ]);

    // isBlendCommand = true
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    state.pushDerivedCommands(command, true, frameState);

    expect(frameState.commandList).toEqual([
      derivedCommands.opaqueBackFaceCommand,
      derivedCommands.translucentFrontFaceCommand,
    ]);

    // picking
    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    frameState.passes.pick = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    state.pushDerivedCommands(command, false, frameState);

    expect(frameState.commandList).toEqual([
      derivedCommands.depthOnlyFrontFaceCommand,
      derivedCommands.opaqueBackFaceCommand,
      derivedCommands.pickFrontFaceCommand,
    ]);
  });

  it("executes globe commands", function () {
    const context = frameState.context;
    const passState = new PassState(context);
    const command = createDrawCommand();

    const executeCommand = jasmine.createSpy("executeCommand");
    spyOn(GlobeTranslucencyFramebuffer.prototype, "clearClassification");

    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    state.pushDerivedCommands(command, false, frameState);

    const globeCommands = frameState.commandList;

    const frustumCommands = new FrustumCommands();
    frustumCommands.commands[Pass.GLOBE] = globeCommands;
    frustumCommands.indices[Pass.GLOBE] = globeCommands.length;

    state.executeGlobeCommands(
      frustumCommands,
      executeCommand,
      framebuffer,
      scene,
      passState
    );

    expect(executeCommand).toHaveBeenCalledWith(
      command.derivedCommands.globeTranslucency.opaqueBackFaceCommand,
      scene,
      context,
      passState
    );
    expect(
      GlobeTranslucencyFramebuffer.prototype.clearClassification
    ).toHaveBeenCalled();
  });

  it("does not execute globe commands if there are no commands", function () {
    const frameState = scene.frameState;
    const context = frameState.context;
    const passState = new PassState(context);

    const frustumCommands = new FrustumCommands();

    const executeCommand = jasmine.createSpy("executeCommand");
    state.executeGlobeCommands(
      frustumCommands,
      executeCommand,
      framebuffer,
      scene,
      passState
    );

    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("executes classification commands", function () {
    const context = frameState.context;
    const passState = new PassState(context);
    const command = createDrawCommand();

    const executeCommand = jasmine.createSpy("executeCommand");
    spyOn(GlobeTranslucencyFramebuffer.prototype, "packDepth");
    spyOn(GlobeTranslucencyFramebuffer.prototype, "clearClassification");

    reset();
    globe.translucency.enabled = true;
    globe.translucency.frontFaceAlpha = 0.5;
    globe.depthTestAgainstTerrain = true;
    state.update(scene);
    state.updateDerivedCommands(command, frameState);
    state.pushDerivedCommands(command, false, frameState);

    const classificationCommand = createDrawCommand();
    const globeCommands = frameState.commandList;
    const classificationCommands = [classificationCommand];
    const frustumCommands = new FrustumCommands();
    frustumCommands.commands[Pass.GLOBE] = globeCommands;
    frustumCommands.indices[Pass.GLOBE] = globeCommands.length;
    frustumCommands.commands[
      Pass.TERRAIN_CLASSIFICATION
    ] = classificationCommands;
    frustumCommands.indices[Pass.TERRAIN_CLASSIFICATION] =
      classificationCommands.length;

    state.executeGlobeClassificationCommands(
      frustumCommands,
      executeCommand,
      framebuffer,
      scene,
      passState
    );

    expect(executeCommand).toHaveBeenCalledWith(
      classificationCommand,
      scene,
      context,
      passState
    );
    expect(executeCommand).toHaveBeenCalledWith(
      command.derivedCommands.globeTranslucency.depthOnlyFrontFaceCommand,
      scene,
      context,
      passState
    );

    if (context.depthTexture) {
      expect(
        GlobeTranslucencyFramebuffer.prototype.packDepth
      ).toHaveBeenCalled();
    }
  });
});
