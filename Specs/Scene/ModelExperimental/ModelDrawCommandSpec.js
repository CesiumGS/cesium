import {
  BlendingState,
  BoundingSphere,
  Cartesian3,
  clone,
  Color,
  CullFace,
  DrawCommand,
  defaultValue,
  defined,
  GeographicProjection,
  Math as CesiumMath,
  Matrix4,
  ModelDrawCommand,
  Pass,
  RenderState,
  SceneMode,
  ShadowMode,
  StyleCommandsNeeded,
  Transforms,
  WebGLConstants,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelDrawCommand", function () {
  const noColor = new Color(0, 0, 0, 0);
  const scratchModelMatrix = new Matrix4();
  const scratchExpectedMatrix = new Matrix4();

  const scratchTranslation = new Cartesian3();
  const scratchExpectedTranslation = new Cartesian3();

  const scratchProjection = new GeographicProjection();

  const mockFrameState = {
    mode: SceneMode.SCENE3D,
    mapProjection: scratchProjection,
  };

  const mockFrameState2D = {
    mode: SceneMode.SCENE2D,
    mapProjection: scratchProjection,
  };

  function mockRenderResources(options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);

    const modelColor = defaultValue(options.color, Color.WHITE);
    const silhouetteColor = defaultValue(options.silhouetteColor, Color.RED);
    const silhouetteSize = defaultValue(options.silhouetteSize, 0.0);

    const resources = {
      model: {
        shadows: ShadowMode.ENABLED,
        sceneGraph: {
          _boundingSphere2D: new BoundingSphere(Cartesian3.ZERO, 1.0),
        },
        _projectTo2D: false,
        color: modelColor,
        isTranslucent: function () {
          return modelColor.alpha > 0.0 && modelColor.alpha < 1.0;
        },
        isInvisible: function () {
          return modelColor.alpha === 0.0;
        },
        silhouetteSize: silhouetteSize,
        silhouetteColor: silhouetteColor,
        _silhouetteId: 1,
      },
      runtimePrimitive: {
        primitive: {
          material: {
            doubleSided: false,
          },
        },
        boundingSphere: new BoundingSphere(Cartesian3.ZERO, 1.0),
      },
      styleCommandsNeeded: options.styleCommandsNeeded,
    };

    const boundingSphere2DTransform = defaultValue(
      options.boundingSphere2DTransform,
      Matrix4.IDENTITY
    );

    const sceneGraph = resources.model.sceneGraph;
    sceneGraph._boundingSphere2D = BoundingSphere.transform(
      sceneGraph._boundingSphere2D,
      boundingSphere2DTransform,
      sceneGraph._boundingSphere2D
    );

    return resources;
  }

  function createDrawCommand(options) {
    options = defaultValue(options, {});
    options.modelMatrix = defaultValue(
      options.modelMatrix,
      Matrix4.clone(Matrix4.IDENTITY)
    );

    const boundingSphere = new BoundingSphere(Cartesian3.ZERO, 1.0);
    options.boundingVolume = BoundingSphere.transform(
      boundingSphere,
      options.modelMatrix,
      boundingSphere
    );

    options.renderState = defaultValue(
      options.renderState,
      RenderState.fromCache(new RenderState())
    );

    options.pass = defaultValue(options.pass, Pass.OPAQUE);
    options.uniformMap = {};

    return new DrawCommand(options);
  }

  function computeExpected2DMatrix(modelMatrix, frameState) {
    const result = Matrix4.clone(modelMatrix, scratchExpectedMatrix);

    // Change the translation's y-component so it appears on the opposite side
    // of the map.
    result[13] -=
      CesiumMath.sign(modelMatrix[13]) *
      2.0 *
      CesiumMath.PI *
      frameState.mapProjection.ellipsoid.maximumRadius;

    return result;
  }

  // Creates a ModelDrawCommand with the specified
  // derived commands.
  function createModelDrawCommand(options) {
    const deriveTranslucent = options.deriveTranslucent;
    const derive2D = options.derive2D;
    const deriveSilhouette = options.deriveSilhouette;

    const modelMatrix = Matrix4.fromTranslation(
      Cartesian3.fromDegrees(180, 0),
      scratchModelMatrix
    );
    const modelMatrix2D = Transforms.basisTo2D(
      mockFrameState2D.mapProjection,
      modelMatrix,
      modelMatrix
    );

    const style = deriveTranslucent
      ? StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT
      : StyleCommandsNeeded.OPAQUE;
    const renderResources = mockRenderResources({
      styleCommandsNeeded: style,
      boundingSphere2DTransform: derive2D ? modelMatrix2D : Matrix4.IDENTITY,
    });
    const command = createDrawCommand({
      modelMatrix: derive2D ? modelMatrix2D : Matrix4.IDENTITY,
    });
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: deriveSilhouette,
    });

    // Derive the 2D commands
    if (derive2D) {
      drawCommand.getCommands(mockFrameState2D);
    }

    return drawCommand;
  }

  function verifySilhouetteModelCommand(
    command,
    stencilReference,
    modelIsInvisible
  ) {
    const renderState = command.renderState;

    // Write the reference value into the stencil buffer.
    const expectedStencilTest = {
      enabled: true,
      frontFunction: WebGLConstants.ALWAYS,
      backFunction: WebGLConstants.ALWAYS,
      reference: stencilReference,
      mask: ~0,
      frontOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.REPLACE,
      },
      backOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.REPLACE,
      },
    };

    expect(renderState.stencilTest).toEqual(expectedStencilTest);

    if (modelIsInvisible) {
      const expectedColorMask = {
        red: false,
        green: false,
        blue: false,
        alpha: false,
      };

      expect(renderState.colorMask).toEqual(expectedColorMask);
      expect(renderState.depthMask).toBe(false);
    }
  }

  function verifySilhouetteColorCommand(
    command,
    stencilReference,
    silhouetteIsTranslucent
  ) {
    const renderState = command.renderState;
    expect(renderState.depthTest.enabled).toBe(true);
    expect(renderState.cull.enabled).toBe(false);

    if (silhouetteIsTranslucent) {
      expect(command.pass).toBe(Pass.TRANSLUCENT);
      expect(renderState.depthMask).toBe(false);
      // The RenderState constructor adds an additional default value
      // that is not in BlendingState.ALPHA_BLEND.
      const expectedBlending = clone(BlendingState.ALPHA_BLEND, true);
      expectedBlending.color = noColor;
      expect(renderState.blending).toEqual(expectedBlending);
    }

    // Write the reference value into the stencil buffer.
    const expectedStencilTest = {
      enabled: true,
      frontFunction: WebGLConstants.NOTEQUAL,
      backFunction: WebGLConstants.NOTEQUAL,
      reference: stencilReference,
      mask: ~0,
      frontOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.KEEP,
      },
      backOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.KEEP,
      },
    };

    expect(renderState.stencilTest).toEqual(expectedStencilTest);
    expect(command.uniformMap.model_silhouettePass()).toBe(true);
    expect(command.castShadows).toBe(false);
    expect(command.receiveShadows).toBe(false);
  }

  it("throws for undefined command", function () {
    expect(function () {
      return new ModelDrawCommand({
        command: undefined,
        primitiveRenderResources: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined primitiveRenderResources", function () {
    expect(function () {
      return new ModelDrawCommand({
        command: new DrawCommand(),
        primitiveRenderResources: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const renderResources = mockRenderResources();
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.command).toBe(command);
    expect(drawCommand.runtimePrimitive).toBe(renderResources.runtimePrimitive);
    expect(drawCommand.model).toBe(renderResources.model);

    expect(drawCommand.modelMatrix).toEqual(command.modelMatrix);
    expect(drawCommand.modelMatrix).not.toBe(command.modelMatrix);

    expect(drawCommand._commandList.length).toEqual(1);

    // No other commands should be derived.
    expect(drawCommand._translucentCommand).toBeUndefined();
    expect(drawCommand._useSilhouetteCommands).toBe(false);

    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);
  });

  it("constructs with silhouette commands", function () {
    const renderResources = mockRenderResources();
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: true,
    });

    expect(drawCommand.command).toBe(command);
    expect(drawCommand.runtimePrimitive).toBe(renderResources.runtimePrimitive);
    expect(drawCommand.model).toBe(renderResources.model);

    expect(drawCommand.modelMatrix).toEqual(command.modelMatrix);
    expect(drawCommand.modelMatrix).not.toBe(command.modelMatrix);

    expect(drawCommand._useSilhouetteCommands).toBe(true);

    const commands = drawCommand._commandList;
    const silhouetteCommands = drawCommand._silhouetteCommandList;
    expect(commands.length).toEqual(1);
    expect(silhouetteCommands.length).toEqual(1);

    const silhouetteModelCommand = commands[0];
    expect(silhouetteModelCommand).not.toBe(command);

    const stencilReference = 1;
    const modelIsInvisible = false;
    verifySilhouetteModelCommand(
      silhouetteModelCommand,
      stencilReference,
      modelIsInvisible
    );

    const silhouetteColorCommand = silhouetteCommands[0];
    const silhouetteIsTranslucent = false;
    verifySilhouetteColorCommand(
      silhouetteColorCommand,
      stencilReference,
      silhouetteIsTranslucent
    );

    // No other commands should be derived.
    expect(drawCommand._translucentCommand).toBeUndefined();
    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);
  });

  it("constructs silhouette commands correctly for translucent model", function () {
    const renderResources = mockRenderResources();
    const command = createDrawCommand({
      pass: Pass.TRANSLUCENT,
    });
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: true,
    });

    // Model is already translucent, so no translucent command should be derived
    expect(drawCommand._translucentCommand).toBeUndefined();
    expect(drawCommand._useSilhouetteCommands).toBe(true);

    const commands = drawCommand._commandList;
    const silhouetteCommands = drawCommand._silhouetteCommandList;
    expect(commands.length).toEqual(1);
    expect(silhouetteCommands.length).toEqual(1);

    const silhouetteModelCommand = commands[0];
    expect(silhouetteModelCommand).not.toBe(command);

    const stencilReference = 1;
    const modelIsInvisible = false;
    verifySilhouetteModelCommand(
      silhouetteModelCommand,
      stencilReference,
      modelIsInvisible
    );

    const silhouetteColorCommand = silhouetteCommands[0];
    const silhouetteIsTranslucent = true;
    verifySilhouetteColorCommand(
      silhouetteColorCommand,
      stencilReference,
      silhouetteIsTranslucent
    );
  });

  it("constructs silhouette commands correctly for invisible model", function () {
    const renderResources = mockRenderResources({
      color: new Color(1.0, 1.0, 1.0, 0.0),
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: true,
    });

    expect(drawCommand._useSilhouetteCommands).toBe(true);

    const commands = drawCommand._commandList;
    const silhouetteCommands = drawCommand._silhouetteCommandList;
    expect(commands.length).toEqual(1);
    expect(silhouetteCommands.length).toEqual(1);

    const silhouetteModelCommand = commands[0];
    expect(silhouetteModelCommand).not.toBe(command);

    const stencilReference = 1;
    const modelIsInvisible = true;
    verifySilhouetteModelCommand(
      silhouetteModelCommand,
      stencilReference,
      modelIsInvisible
    );

    const silhouetteColorCommand = silhouetteCommands[0];
    const silhouetteIsTranslucent = false;
    verifySilhouetteColorCommand(
      silhouetteColorCommand,
      stencilReference,
      silhouetteIsTranslucent
    );
  });

  it("constructs silhouette commands correctly for translucent silhouette color", function () {
    const renderResources = mockRenderResources({
      color: new Color(1.0, 1.0, 1.0, 1.0),
      silhouetteColor: new Color(1.0, 1.0, 1.0, 0.5),
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: true,
    });

    expect(drawCommand._useSilhouetteCommands).toBe(true);

    const commands = drawCommand._commandList;
    const silhouetteCommands = drawCommand._silhouetteCommandList;
    expect(commands.length).toEqual(1);
    expect(silhouetteCommands.length).toEqual(1);

    const silhouetteModelCommand = commands[0];
    expect(silhouetteModelCommand).not.toBe(command);

    const stencilReference = 1;
    const modelIsInvisible = false;
    verifySilhouetteModelCommand(
      silhouetteModelCommand,
      stencilReference,
      modelIsInvisible
    );

    const silhouetteColorCommand = silhouetteCommands[0];
    const silhouetteIsTranslucent = true;
    verifySilhouetteColorCommand(
      silhouetteColorCommand,
      stencilReference,
      silhouetteIsTranslucent
    );
  });

  it("uses opaque command only", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.ALL_OPAQUE,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);
    expect(drawCommand._commandList[0]).toBe(command);
    expect(drawCommand._translucentCommand).toBeUndefined();

    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);
  });

  it("derives translucent command, draws translucent only", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.ALL_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);

    const translucentCommand = drawCommand._translucentCommand;
    expect(translucentCommand).toBeDefined();
    expect(translucentCommand).not.toBe(command);
    expect(translucentCommand.pass).toEqual(Pass.TRANSLUCENT);

    expect(drawCommand._commandList[0]).toBe(translucentCommand);

    const renderState = translucentCommand.renderState;

    expect(renderState.cull.enabled).toBe(false);
    expect(renderState.depthTest.enabled).toBe(true);
    expect(renderState.depthMask).toBe(false);

    // The RenderState constructor adds an additional default value
    // that is not in BlendingState.ALPHA_BLEND.
    const expectedBlending = clone(BlendingState.ALPHA_BLEND, true);
    expectedBlending.color = noColor;
    expect(renderState.blending).toEqual(expectedBlending);

    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);
  });

  it("derives translucent command, draws opaque and translucent", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._commandList[0]).toBe(command);

    const translucentCommand = drawCommand._translucentCommand;
    expect(translucentCommand).toBeDefined();
    expect(translucentCommand).not.toBe(command);
    expect(translucentCommand.pass).toEqual(Pass.TRANSLUCENT);

    expect(drawCommand._commandList[1]).toBe(translucentCommand);

    const renderState = translucentCommand.renderState;
    expect(renderState.cull.enabled).toBe(false);
    expect(renderState.depthTest.enabled).toBe(true);
    expect(renderState.depthMask).toBe(false);

    // The RenderState constructor adds an additional default value
    // that is not in BlendingState.ALPHA_BLEND.
    const expectedBlending = clone(BlendingState.ALPHA_BLEND, true);
    expectedBlending.color = noColor;
    expect(renderState.blending).toEqual(expectedBlending);

    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);
  });

  it("doesn't derive translucent command if original command is translucent", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.ALL_TRANSLUCENT,
    });
    const command = createDrawCommand({
      pass: Pass.TRANSLUCENT,
    });
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);
    expect(drawCommand._commandList[0]).toBe(command);

    expect(drawCommand._translucentCommand).toBeUndefined();
    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);
  });

  it("getCommands works for original command", function () {
    const renderResources = mockRenderResources();
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);
    expect(drawCommand._commandList[0]).toBe(command);
    expect(drawCommand._translucentCommand).toBeUndefined();

    const result = drawCommand.getCommands(mockFrameState);
    expect(result.length).toEqual(1);
    expect(result[0]).toBe(command);
  });

  it("getCommands works for multiple commands", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(2);

    const translucentCommand = drawCommand._commandList[1];
    expect(translucentCommand.pass).toBe(Pass.TRANSLUCENT);

    const result = drawCommand.getCommands(mockFrameState);
    expect(result.length).toEqual(2);
    expect(result[0]).toBe(command);
    expect(result[1]).toBe(translucentCommand);
  });

  it("getCommands doesn't return silhouette commands", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: true,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList.length).toEqual(2);

    const result = drawCommand.getCommands(mockFrameState);
    expect(result.length).toEqual(2);

    const stencilReference = 1;
    const modelIsInvisible = false;
    verifySilhouetteModelCommand(result[0], stencilReference, modelIsInvisible);
    verifySilhouetteModelCommand(result[1], stencilReference, modelIsInvisible);
  });

  it("getCommands derives 2D commands if primitive is near IDL", function () {
    const modelMatrix = Matrix4.fromTranslation(
      Cartesian3.fromDegrees(180, 0),
      scratchModelMatrix
    );
    const modelMatrix2D = Transforms.basisTo2D(
      mockFrameState2D.mapProjection,
      modelMatrix,
      modelMatrix
    );
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
      boundingSphere2DTransform: modelMatrix2D,
    });
    const command = createDrawCommand({
      modelMatrix: modelMatrix2D,
    });
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    // 2D commands aren't derived until getCommands is called
    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._commandList2D.length).toEqual(0);

    const result = drawCommand.getCommands(mockFrameState2D);
    expect(result.length).toEqual(4);
    expect(drawCommand._commandList2D.length).toEqual(2);
  });

  it("getCommands derives 2D commands for silhouettes if primitive is near IDL", function () {
    const modelMatrix = Matrix4.fromTranslation(
      Cartesian3.fromDegrees(180, 0),
      scratchModelMatrix
    );
    const modelMatrix2D = Transforms.basisTo2D(
      mockFrameState2D.mapProjection,
      modelMatrix,
      modelMatrix
    );
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
      boundingSphere2DTransform: modelMatrix2D,
    });
    const command = createDrawCommand({
      modelMatrix: modelMatrix2D,
    });
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: true,
    });

    // 2D commands aren't derived until getCommands is called
    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList.length).toEqual(2);
    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);

    // Silhouette commands are generated for 2D, but only the
    // non-silhouette commands are retrieved.
    const result = drawCommand.getCommands(mockFrameState2D);
    expect(result.length).toEqual(4);

    expect(drawCommand._commandList2D.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(2);
  });

  it("getCommands doesn't derive 2D commands if primitive is not near IDL", function () {
    const modelMatrix = Matrix4.fromTranslation(
      Cartesian3.fromDegrees(100, 250),
      scratchModelMatrix
    );
    const modelMatrix2D = Transforms.basisTo2D(
      mockFrameState2D.mapProjection,
      modelMatrix,
      modelMatrix
    );
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
      boundingSphere2DTransform: modelMatrix2D,
    });
    const command = createDrawCommand({
      modelMatrix: modelMatrix2D,
    });
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
      useSilhouetteCommands: true,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);

    const result = drawCommand.getCommands(mockFrameState2D);
    expect(result.length).toEqual(2);
    expect(drawCommand._commandList2D.length).toEqual(0);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(0);
  });

  it("getCommands updates model matrix for 2D commands", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
      deriveSilhouette: true,
    });

    const modelMatrix2D = drawCommand.modelMatrix;
    const translation = Matrix4.getTranslation(
      modelMatrix2D,
      scratchTranslation
    );

    const commandList = drawCommand._commandList;
    const commandList2D = drawCommand._commandList2D;
    const silhouetteCommandList = drawCommand._silhouetteCommandList;
    const silhouetteCommandList2D = drawCommand._silhouetteCommandList2D;
    expect(commandList.length).toEqual(2);
    expect(commandList2D.length).toEqual(2);
    expect(silhouetteCommandList.length).toEqual(2);
    expect(silhouetteCommandList2D.length).toEqual(2);

    const result = drawCommand.getCommands(mockFrameState2D);
    expect(result.length).toEqual(4);

    const expectedModelMatrix = computeExpected2DMatrix(
      modelMatrix2D,
      mockFrameState2D
    );

    const expectedTranslation = Matrix4.getTranslation(
      expectedModelMatrix,
      scratchExpectedTranslation
    );

    // The first two commands should be drawn with the given model matrix
    for (let i = 0; i < 2; i++) {
      const command = result[i];
      expect(command.modelMatrix).toEqual(modelMatrix2D);
      expect(command.boundingVolume.center).toEqual(translation);
    }

    // The last two commands are the 2D commands derived from the original ones
    for (let i = 2; i < 4; i++) {
      const command2D = result[i];
      expect(command2D.modelMatrix).toEqual(expectedModelMatrix);
      expect(command2D.boundingVolume.center).toEqual(expectedTranslation);
    }

    // The silhouette commands should be affected in the same way.
    for (let i = 0; i < 2; i++) {
      const command = silhouetteCommandList[i];
      expect(command.modelMatrix).toEqual(modelMatrix2D);
      expect(command.boundingVolume.center).toEqual(translation);

      const command2D = silhouetteCommandList2D[i];
      expect(command2D.modelMatrix).toEqual(expectedModelMatrix);
      expect(command2D.boundingVolume.center).toEqual(expectedTranslation);
    }
  });

  it("getSilhouetteCommands returns silhouette-pass commands", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      deriveSilhouette: true,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList.length).toEqual(2);

    const result = drawCommand.getCommands(mockFrameState);
    expect(result.length).toEqual(2);

    const silhouetteResult = drawCommand.getSilhouetteCommands(mockFrameState);
    expect(silhouetteResult.length).toEqual(2);

    expect(silhouetteResult[0]).not.toEqual(result[0]);
    expect(silhouetteResult[1]).not.toEqual(result[1]);

    const stencilReference = 1;
    const silhouetteIsTranslucent = false;
    verifySilhouetteColorCommand(
      silhouetteResult[0],
      stencilReference,
      silhouetteIsTranslucent
    );
    verifySilhouetteColorCommand(
      silhouetteResult[1],
      stencilReference,
      silhouetteIsTranslucent
    );
  });

  it("getSilhouetteCommands returns 2D silhouette-pass commands", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
      deriveSilhouette: true,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._commandList2D.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList2D.length).toEqual(2);

    const result = drawCommand.getCommands(mockFrameState2D);
    expect(result.length).toEqual(4);

    const silhouetteResult = drawCommand.getSilhouetteCommands(
      mockFrameState2D
    );
    expect(silhouetteResult.length).toEqual(4);

    const stencilReference = 1;
    const silhouetteIsTranslucent = false;

    const length = silhouetteResult.length;
    for (let i = 0; i < length; i++) {
      expect(silhouetteResult[i]).not.toEqual(result[i]);
      verifySilhouetteColorCommand(
        silhouetteResult[i],
        stencilReference,
        silhouetteIsTranslucent
      );
    }
  });

  it("getSilhouetteCommands returns empty if model doesn't have silhouette", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._silhouetteCommandList.length).toEqual(0);

    const result = drawCommand.getCommands(mockFrameState);
    expect(result.length).toEqual(2);

    const silhouetteResult = drawCommand.getSilhouetteCommands(mockFrameState);
    expect(silhouetteResult.length).toEqual(0);
  });

  it("updates model matrix", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.modelMatrix).toEqual(Matrix4.IDENTITY);
    expect(drawCommand.modelMatrix).not.toBe(command.modelMatrix);

    const commandList = drawCommand._commandList;
    const length = commandList.length;
    expect(length).toEqual(2);
    for (let i = 0; i < length; i++) {
      const command = commandList[i];
      expect(command.modelMatrix).toEqual(Matrix4.IDENTITY);
      expect(command.boundingVolume.center).toEqual(Cartesian3.ZERO);
    }

    const translation = Cartesian3.fromDegrees(100, 25);
    const modelMatrix = Matrix4.fromTranslation(
      translation,
      scratchModelMatrix
    );

    drawCommand.modelMatrix = modelMatrix;
    expect(drawCommand.modelMatrix).toEqual(modelMatrix);
    for (let i = 0; i < length; i++) {
      const command = commandList[i];
      expect(command.modelMatrix).toEqual(modelMatrix);
      expect(command.boundingVolume.center).toEqual(translation);
    }

    expect(drawCommand._commandList2D.length).toEqual(0);
  });

  it("updates model matrix for 2D commands", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
      deriveSilhouette: true,
    });

    const commandList = drawCommand._commandList;
    const silhouetteCommandList = drawCommand._silhouetteCommandList;
    expect(commandList.length).toEqual(2);
    expect(silhouetteCommandList.length).toEqual(2);

    // Derive the 2D commands
    drawCommand.getCommands(mockFrameState2D);

    const commandList2D = drawCommand._commandList2D;
    const silhouetteCommandList2D = drawCommand._silhouetteCommandList2D;
    expect(commandList2D.length).toEqual(2);
    expect(silhouetteCommandList2D.length).toEqual(2);

    let modelMatrix2D = Matrix4.fromTranslation(
      Cartesian3.fromDegrees(100, 25),
      scratchModelMatrix
    );
    modelMatrix2D = Transforms.basisTo2D(
      mockFrameState2D.mapProjection,
      modelMatrix2D,
      modelMatrix2D
    );

    const translation = Matrix4.getTranslation(
      modelMatrix2D,
      scratchTranslation
    );

    drawCommand.modelMatrix = modelMatrix2D;
    expect(drawCommand.modelMatrix).toEqual(modelMatrix2D);

    const length = commandList.length;
    for (let i = 0; i < length; i++) {
      const command = commandList[i];
      expect(command.modelMatrix).toEqual(modelMatrix2D);
      expect(command.boundingVolume.center).toEqual(translation);

      const silhouetteCommand = silhouetteCommandList[i];
      expect(silhouetteCommand.modelMatrix).toEqual(modelMatrix2D);
      expect(silhouetteCommand.boundingVolume.center).toEqual(translation);
    }

    // Update the model matrix for the 2D commands
    drawCommand.getCommands(mockFrameState2D);

    const expectedModelMatrix = computeExpected2DMatrix(
      modelMatrix2D,
      mockFrameState2D
    );
    const expectedTranslation = Matrix4.getTranslation(
      expectedModelMatrix,
      scratchExpectedTranslation
    );

    const length2D = commandList2D.length;
    for (let i = 0; i < length2D; i++) {
      const command = commandList2D[i];
      expect(command.modelMatrix).toEqual(expectedModelMatrix);
      expect(command.boundingVolume.center).toEqual(expectedTranslation);

      const silhouetteCommand = silhouetteCommandList2D[i];
      expect(silhouetteCommand.modelMatrix).toEqual(expectedModelMatrix);
      expect(silhouetteCommand.boundingVolume.center).toEqual(
        expectedTranslation
      );
    }
  });

  it("updates shadows", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
      deriveSilhouette: true,
    });

    let result = drawCommand.getAllCommands();
    const length = result.length;
    expect(length).toEqual(8);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.castShadows).toBe(false);
      expect(command.receiveShadows).toBe(false);
    }

    drawCommand.shadows = ShadowMode.ENABLED;
    result = drawCommand.getAllCommands();

    for (let i = 0; i < length; i++) {
      const command = result[i];
      const uniformMap = command.uniformMap;
      // Shadows should not be enabled for the silhouette color command.
      if (
        defined(uniformMap.model_silhouettePass) &&
        uniformMap.model_silhouettePass()
      ) {
        expect(command.castShadows).toBe(false);
        expect(command.receiveShadows).toBe(false);
      } else {
        expect(command.castShadows).toBe(true);
        expect(command.receiveShadows).toBe(true);
      }
    }
  });

  it("updates back face culling for command without silhouettes", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
    });

    let result = drawCommand.getCommands(mockFrameState2D);
    const length = result.length;
    expect(length).toEqual(4);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.renderState.cull.enabled).toBe(false);
    }

    drawCommand.backFaceCulling = true;
    result = drawCommand.getCommands(mockFrameState2D);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      if (command.pass === Pass.TRANSLUCENT) {
        expect(command.renderState.cull.enabled).toBe(false);
      } else {
        expect(command.renderState.cull.enabled).toBe(true);
      }
    }
  });

  it("doesn't update back face culling for command with silhouettes", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
      deriveSilhouette: true,
    });

    let result = drawCommand.getAllCommands();
    const length = result.length;
    expect(length).toEqual(8);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.renderState.cull.enabled).toBe(false);
    }

    drawCommand.backFaceCulling = true;
    result = drawCommand.getAllCommands();

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.renderState.cull.enabled).toBe(false);
    }
  });

  it("updates cull face", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
      deriveSilhouette: true,
    });

    let result = drawCommand.getAllCommands();
    const length = result.length;
    expect(length).toEqual(8);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.renderState.cull.face).toBe(CullFace.BACK);
    }

    drawCommand.cullFace = CullFace.FRONT;
    result = drawCommand.getAllCommands();

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.renderState.cull.face).toBe(CullFace.FRONT);
    }
  });

  it("updates debugShowBoundingVolume", function () {
    const drawCommand = createModelDrawCommand({
      deriveTranslucent: true,
      derive2D: true,
      deriveSilhouette: true,
    });

    let result = drawCommand.getAllCommands();
    const length = result.length;
    expect(length).toEqual(8);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.debugShowBoundingVolume).toBe(false);
    }

    drawCommand.debugShowBoundingVolume = true;
    result = drawCommand.getAllCommands();

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.debugShowBoundingVolume).toBe(true);
    }
  });
});
