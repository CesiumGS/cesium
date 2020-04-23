import { BoundingRectangle, Framebuffer } from "../../Source/Cesium.js";
import { ClearCommand } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { DrawCommand } from "../../Source/Cesium.js";
import { FrustumCommands } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import { GlobeTranslucency } from "../../Source/Cesium.js";
import { NearFarScalar } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { PassState } from "../../Source/Cesium.js";
import { PixelDatatype } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { SceneMode } from "../../Source/Cesium.js";
import { ShaderProgram } from "../../Source/Cesium.js";
import { ShaderSource } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

var opaqueAlphaByDistance = new NearFarScalar(0.0, 1.0, 1.0, 1.0);
var translucentAlphaByDistance = new NearFarScalar(0.0, 0.5, 1.0, 0.5);
var invisibleAlphaByDistance = new NearFarScalar(0.0, 0.0, 1.0, 0.0);

function reset(scene) {
  var globe = scene.globe;
  var frameState = scene.frameState;

  globe.show = true;
  globe.translucencyEnabled = false;
  globe.frontFaceAlpha = 1.0;
  globe.frontFaceAlphaByDistance = undefined;
  globe.backFaceAlpha = 1.0;
  globe.backFaceAlphaByDistance = undefined;
  globe.baseColor = Color.WHITE;

  var tileProvider = globe._surface.tileProvider;
  tileProvider.depthTestAgainstTerrain = true;
  tileProvider.frontFaceAlphaByDistance = opaqueAlphaByDistance;
  tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;

  frameState.commandList.length = 0;
  frameState.cameraUnderground = false;
  frameState.mode = SceneMode.SCENE3D;
  frameState.passes.pick = false;
}

function createDrawCommand(context) {
  var uniformMap = {};

  var vs = "void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); }";
  var fs = "void main() { gl_FragColor = vec4(1.0); }";

  var vertexShaderSource = new ShaderSource({
    sources: [vs],
  });

  var fragmentShaderSource = new ShaderSource({
    sources: [fs],
  });

  var shaderProgram = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: vertexShaderSource,
    fragmentShaderSource: fragmentShaderSource,
  });

  var renderState = RenderState.fromCache({
    depthMask: true,
    cull: {
      enabled: true,
    },
  });

  var drawCommand = new DrawCommand({
    shaderProgram: shaderProgram,
    uniformMap: uniformMap,
    renderState: renderState,
  });

  return drawCommand;
}

describe("Scene/GlobeTranslucency", function () {
  var scene;

  beforeAll(function () {
    scene = createScene();
    scene.globe = new Globe();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  beforeEach(function () {
    reset(scene);
  });

  it("detects if globe is translucent", function () {
    var globe = scene.globe;

    // Returns false when globe is undefined
    reset(scene);
    expect(GlobeTranslucency.isTranslucent()).toBe(false);

    // Returns false when globe.show is false
    reset(scene);
    globe.show = false;
    expect(GlobeTranslucency.isTranslucent(globe)).toBe(false);

    // Returns false for default globe
    reset(scene);
    expect(GlobeTranslucency.isTranslucent(globe)).toBe(false);

    // Returns true when base color is translucent
    reset(scene);
    globe.translucencyEnabled = true;
    globe.baseColor = Color.TRANSPARENT;
    expect(GlobeTranslucency.isTranslucent(globe)).toBe(true);

    // Returns true when front face alpha is less than 1.0
    reset(scene);
    globe.translucencyEnabled = true;
    globe.frontFaceAlpha = 0.5;
    expect(GlobeTranslucency.isTranslucent(globe)).toBe(true);
  });

  it("detects if sun is visible through globe", function () {
    var globe = scene.globe;

    // Returns true when globe is undefined
    reset(scene);
    expect(GlobeTranslucency.isSunVisibleThroughGlobe()).toBe(true);

    // Returns true when globe.show is false
    reset(scene);
    globe.show = false;
    expect(GlobeTranslucency.isSunVisibleThroughGlobe(globe, false)).toBe(true);

    // Returns false for default globe
    reset(scene);
    expect(GlobeTranslucency.isSunVisibleThroughGlobe(globe, false)).toBe(
      false
    );

    // Returns true if front face and back face are translucent and camera is above ground
    reset(scene);
    globe.translucencyEnabled = true;
    globe.frontFaceAlpha = 0.5;
    globe.backFaceAlpha = 0.5;
    expect(GlobeTranslucency.isSunVisibleThroughGlobe(globe, true)).toBe(true);

    // Returns true if front face and back face are translucent and camera is above ground
    reset(scene);
    globe.translucencyEnabled = true;
    globe.frontFaceAlpha = 0.5;
    expect(GlobeTranslucency.isSunVisibleThroughGlobe(globe, true)).toBe(true);
    expect(GlobeTranslucency.isSunVisibleThroughGlobe(globe, false)).toBe(
      false
    );
  });

  it("detects if environment is visible", function () {
    var globe = scene.globe;

    // Returns true when globe is undefined
    reset(scene);
    expect(GlobeTranslucency.isEnvironmentVisible()).toBe(true);

    // Returns true when globe.show is false
    reset(scene);
    globe.show = false;
    expect(GlobeTranslucency.isEnvironmentVisible(globe, false)).toBe(true);

    // Returns true for default globe
    reset(scene);
    expect(GlobeTranslucency.isEnvironmentVisible(globe, false)).toBe(true);

    // Returns false if globe is opaque and camera is underground
    reset(scene);
    expect(GlobeTranslucency.isEnvironmentVisible(globe, true)).toBe(false);

    // Returns true if front faces are translucent and camera is underground
    reset(scene);
    globe.translucencyEnabled = true;
    globe.frontFaceAlpha = 0.5;
    expect(GlobeTranslucency.isEnvironmentVisible(globe, true)).toBe(true);
  });

  it("detects whether to use depth plane", function () {
    var globe = scene.globe;

    // Returns false when globe is undefined
    reset(scene);
    expect(GlobeTranslucency.useDepthPlane()).toBe(false);

    // Returns false when globe.show is false
    reset(scene);
    globe.show = false;
    expect(GlobeTranslucency.useDepthPlane(globe, false)).toBe(false);

    // Returns false if camera is underground
    reset(scene);
    expect(GlobeTranslucency.useDepthPlane(globe, true)).toBe(false);

    // Return false when globe is translucent
    reset(scene);
    globe.translucencyEnabled = true;
    globe.frontFaceAlpha = 0.5;
    expect(GlobeTranslucency.useDepthPlane(globe, false)).toBe(false);
  });

  it("gets number of texture uniforms required", function () {
    var globe = scene.globe;
    var tileProvider = globe._surface.tileProvider;
    var frameState = scene.frameState;

    // Returns zero if globe is opaque
    reset(scene);
    expect(
      GlobeTranslucency.getNumberOfTextureUniforms(tileProvider, frameState)
    ).toBe(0);

    // Returns two when globe is translucent and manual depth testing is required
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.depthTestAgainstTerrain = false;
    expect(
      GlobeTranslucency.getNumberOfTextureUniforms(tileProvider, frameState)
    ).toBe(1 + scene.context.depthTexture);

    // Returns one when globe is translucent and manual depth testing is not required
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    expect(
      GlobeTranslucency.getNumberOfTextureUniforms(tileProvider, frameState)
    ).toBe(1);
  });

  it("pushes derived commands", function () {
    var globe = scene.globe;
    var tileProvider = globe._surface.tileProvider;
    var frameState = scene.frameState;
    var commandList = frameState.commandList;

    var command = createDrawCommand(frameState.context);
    GlobeTranslucency.updateDerivedCommand(command, frameState);
    var derivedCommands = command.derivedCommands.globeTranslucency;
    var backAndFrontFaceCommand = derivedCommands.backAndFrontFaceCommand;
    var backFaceCommand = derivedCommands.backFaceCommand;
    var frontFaceCommand = derivedCommands.frontFaceCommand;
    var translucentBackFaceCommand = derivedCommands.translucentBackFaceCommand;
    var translucentFrontFaceCommand =
      derivedCommands.translucentFrontFaceCommand;
    var clearDepthTranslucentBackFaceCommand =
      derivedCommands.clearDepthTranslucentBackFaceCommand;
    var clearDepthTranslucentFrontFaceCommand =
      derivedCommands.clearDepthTranslucentFrontFaceCommand;
    var pickBackFaceCommand = derivedCommands.pickBackFaceCommand;
    var pickFrontFaceCommand = derivedCommands.pickFrontFaceCommand;

    // Does not push derived commands if globe is completely invisible
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = invisibleAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = invisibleAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList.length).toBe(0);

    // Pushes regular command if the globe is opaque
    reset(scene);
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([command]);

    // Pushes derived commands when front is translucent and back is translucent
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      backAndFrontFaceCommand,
      translucentBackFaceCommand,
      translucentFrontFaceCommand,
    ]);

    // Pushes derived commands when front is translucent and back is translucent and not the first layer
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      false,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      translucentBackFaceCommand,
      translucentFrontFaceCommand,
    ]);

    // Pushes derived commands when front is translucent and back is translucent and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      backAndFrontFaceCommand,
      translucentFrontFaceCommand,
      translucentBackFaceCommand,
    ]);

    // Pushes derived commands when front is translucent and back is opaque
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      backFaceCommand,
      frontFaceCommand,
      translucentFrontFaceCommand,
    ]);

    // Pushes derived commands when front is translucent and back is opaque and not the first layer
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      false,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      frontFaceCommand,
      translucentFrontFaceCommand,
    ]);

    // Pushes derived commands when front is translucent and back is opaque and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      backFaceCommand,
      frontFaceCommand,
      translucentBackFaceCommand,
    ]);

    // Pushes derived commands when front is translucent and back is opaque and not the first layer and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      false,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([backFaceCommand, translucentBackFaceCommand]);

    // Pushes derived commands when front is translucent and back is invisible
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = invisibleAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      frontFaceCommand,
      translucentFrontFaceCommand,
    ]);

    // Pushes derived commands when front is translucent and back is invisible and not the first layer
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = invisibleAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      false,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([translucentFrontFaceCommand]);

    // Pushes derived commands when front is translucent and back is invisible and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = invisibleAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([backFaceCommand, translucentBackFaceCommand]);

    // Pushes derived commands when front is translucent and back is invisible and not the first layer and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = invisibleAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      false,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([translucentBackFaceCommand]);

    // Pushes derived commands when front is invisible and back is translucent
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = invisibleAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([backFaceCommand, translucentBackFaceCommand]);

    // Pushes derived commands when front is invisible and back is translucent and not the first layer
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = invisibleAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      false,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([translucentBackFaceCommand]);

    // Pushes derived commands when front is invisible and back is translucent and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = invisibleAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      frontFaceCommand,
      translucentFrontFaceCommand,
    ]);

    // Pushes derived commands when front is invisible and back is translucent and not the first layer and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = invisibleAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      false,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([translucentFrontFaceCommand]);

    // Pushes derived commands when front is invisible and back is opaque
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = invisibleAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([backFaceCommand]);

    // Pushes derived commands when front is invisible and back is opaque and camera is underground
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = invisibleAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
    frameState.cameraUnderground = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([frontFaceCommand]);

    // Pushes derived commands when front is translucent and scene is 2D
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
    frameState.mode = SceneMode.SCENE2D;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      frontFaceCommand,
      translucentFrontFaceCommand,
    ]);

    // Pushes derived commands for pick pass
    reset(scene);
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = translucentAlphaByDistance;
    frameState.passes.pick = true;
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    expect(commandList).toEqual([
      backAndFrontFaceCommand,
      pickBackFaceCommand,
      pickFrontFaceCommand,
    ]);

    if (frameState.context.depthTexture) {
      // Pushes derived commands when manual depth test is required
      reset(scene);
      tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
      tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
      tileProvider.depthTestAgainstTerrain = false;
      GlobeTranslucency.pushDerivedCommands(
        command,
        true,
        tileProvider,
        frameState
      );
      expect(commandList).toEqual([
        backFaceCommand,
        frontFaceCommand,
        clearDepthTranslucentFrontFaceCommand,
      ]);

      // Pushes derived commands when manual depth test is required and camera is underground
      reset(scene);
      tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
      tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;
      tileProvider.depthTestAgainstTerrain = false;
      frameState.cameraUnderground = true;
      GlobeTranslucency.pushDerivedCommands(
        command,
        true,
        tileProvider,
        frameState
      );
      expect(commandList).toEqual([
        backFaceCommand,
        frontFaceCommand,
        clearDepthTranslucentBackFaceCommand,
      ]);
    }
  });

  it("creates resources", function () {
    var globeTranslucency = scene._view.globeTranslucency;
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    expect(globeTranslucency._colorTexture).toBeDefined();
    expect(globeTranslucency._framebuffer).toBeDefined();
    expect(globeTranslucency._packedDepthTexture).toBeDefined();
    expect(globeTranslucency._packedDepthFramebuffer).toBeDefined();

    if (context.depthTexture) {
      expect(globeTranslucency._depthStencilTexture).toBeDefined();
    } else {
      expect(globeTranslucency._depthStencilRenderbuffer).toBeDefined();
    }

    expect(globeTranslucency._packedDepthCommand).toBeDefined();
    expect(globeTranslucency._clearCommand).toBeDefined();
  });

  it("recreates resources when viewport changes", function () {
    var globeTranslucency = scene._view.globeTranslucency;
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    var firstColorTexture = globeTranslucency._colorTexture;
    var firstFramebuffer = globeTranslucency._framebuffer;
    var firstPackedDepthFramebuffer = globeTranslucency._packedDepthFramebuffer;
    expect(globeTranslucency._clearCommand.framebuffer).toBe(firstFramebuffer);
    expect(globeTranslucency._packedDepthCommand.framebuffer).toBe(
      firstPackedDepthFramebuffer
    );

    viewport.width = 50;
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    expect(firstColorTexture.isDestroyed()).toBe(true);
    expect(globeTranslucency._colorTexture).not.toBe(firstColorTexture);
    expect(globeTranslucency._clearCommand.framebuffer).not.toBe(
      firstFramebuffer
    );
    expect(globeTranslucency._packedDepthCommand.framebuffer).not.toBe(
      firstPackedDepthFramebuffer
    );
  });

  it("recreates resources when HDR changes", function () {
    var globeTranslucency = scene._view.globeTranslucency;
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);
    globeTranslucency.updateAndClear(false, viewport, context, passState);
    var firstColorTexture = globeTranslucency._colorTexture;

    var expectedPixelDatatype = context.halfFloatingPointTexture
      ? PixelDatatype.HALF_FLOAT
      : PixelDatatype.FLOAT;
    globeTranslucency.updateAndClear(true, viewport, context, passState);
    expect(firstColorTexture.isDestroyed()).toBe(true);
    expect(globeTranslucency._colorTexture).not.toBe(firstColorTexture);
    expect(globeTranslucency._colorTexture.pixelDatatype).toBe(
      expectedPixelDatatype
    );
  });

  it("executes globe commands", function () {
    var globeTranslucency = scene._view.globeTranslucency;
    var globe = scene.globe;
    var tileProvider = globe._surface.tileProvider;
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);

    reset(scene);
    globe.translucencyEnabled = true;
    globe.frontFaceAlpha = 0.5;
    globe.backFaceAlpha = 1.0;
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;

    var command = createDrawCommand(frameState.context);

    var executeCommand = jasmine.createSpy("executeCommand");
    spyOn(ClearCommand.prototype, "execute");

    GlobeTranslucency.updateDerivedCommand(command, frameState);
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );
    var expectedCommand =
      command.derivedCommands.globeTranslucency.backFaceCommand;

    var globeCommands = frameState.commandList;

    var frustumCommands = new FrustumCommands();
    frustumCommands.commands[Pass.GLOBE] = globeCommands;
    frustumCommands.indices[Pass.GLOBE] = globeCommands.length;

    globeTranslucency.updateAndClear(false, viewport, context, passState);
    globeTranslucency.executeGlobeCommands(
      frustumCommands,
      executeCommand,
      scene,
      passState
    );
    expect(executeCommand).toHaveBeenCalledWith(
      expectedCommand,
      scene,
      context,
      passState
    );
    expect(ClearCommand.prototype.execute).toHaveBeenCalled();
  });

  it("does not execute globe commands if there are no commands", function () {
    var globeTranslucency = scene._view.globeTranslucency;
    var frameState = scene.frameState;
    var context = frameState.context;
    var passState = new PassState(context);

    var frustumCommands = new FrustumCommands();

    var executeCommand = jasmine.createSpy("executeCommand");
    globeTranslucency.executeGlobeCommands(
      frustumCommands,
      executeCommand,
      scene,
      passState
    );

    expect(executeCommand).not.toHaveBeenCalled();
  });

  it("executes classification commands", function () {
    var globeTranslucency = scene._view.globeTranslucency;
    var globe = scene.globe;
    var tileProvider = globe._surface.tileProvider;
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);

    reset(scene);
    globe.translucencyEnabled = true;
    globe.frontFaceAlpha = 0.5;
    globe.backFaceAlpha = 1.0;
    tileProvider.frontFaceAlphaByDistance = translucentAlphaByDistance;
    tileProvider.backFaceAlphaByDistance = opaqueAlphaByDistance;

    var command = createDrawCommand(frameState.context);

    GlobeTranslucency.updateDerivedCommand(command, frameState);
    GlobeTranslucency.pushDerivedCommands(
      command,
      true,
      tileProvider,
      frameState
    );

    var expectedCommand =
      command.derivedCommands.globeTranslucency.frontFaceCommand;

    var classificationCommand = createDrawCommand(frameState.context);
    var globeCommands = frameState.commandList;
    var classificationCommands = [classificationCommand];
    var frustumCommands = new FrustumCommands();
    frustumCommands.commands[Pass.GLOBE] = globeCommands;
    frustumCommands.indices[Pass.GLOBE] = globeCommands.length;
    frustumCommands.commands[
      Pass.TERRAIN_CLASSIFICATION
    ] = classificationCommands;
    frustumCommands.indices[Pass.TERRAIN_CLASSIFICATION] =
      classificationCommands.length;

    var executeCommand = jasmine.createSpy("executeCommand");

    globeTranslucency.updateAndClear(false, viewport, context, passState);
    globeTranslucency.executeGlobeClassificationCommands(
      frustumCommands,
      executeCommand,
      scene,
      passState
    );
    expect(executeCommand).toHaveBeenCalledWith(
      expectedCommand,
      scene,
      context,
      passState
    );
    expect(executeCommand).toHaveBeenCalledWith(
      classificationCommand,
      scene,
      context,
      passState
    );
  });

  it("destroys", function () {
    var globeTranslucency = new GlobeTranslucency();
    var frameState = scene.frameState;
    var context = frameState.context;
    var viewport = new BoundingRectangle(0, 0, 100, 100);
    var passState = new PassState(context);

    globeTranslucency.updateAndClear(false, viewport, context, passState);

    spyOn(Texture.prototype, "destroy").and.callThrough();
    spyOn(Framebuffer.prototype, "destroy").and.callThrough();

    globeTranslucency.destroy();

    expect(globeTranslucency.isDestroyed()).toBe(true);
    expect(Texture.prototype.destroy).toHaveBeenCalled();
    expect(Framebuffer.prototype.destroy).toHaveBeenCalled();
  });
});
