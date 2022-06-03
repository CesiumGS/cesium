import {
  BlendingState,
  BoundingSphere,
  Cartesian3,
  clone,
  Color,
  CullFace,
  DrawCommand,
  defaultValue,
  GeographicProjection,
  Math as CesiumMath,
  Matrix4,
  ModelExperimentalDrawCommand,
  Pass,
  RenderState,
  SceneMode,
  ShadowMode,
  StyleCommandsNeeded,
  Transforms,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalDrawCommand", function () {
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
    const resources = {
      model: {
        shadows: ShadowMode.ENABLED,
        sceneGraph: {
          _boundingSphere2D: new BoundingSphere(Cartesian3.ZERO, 1.0),
        },
        _projectTo2D: false,
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

  // Creates a ModelExperimentalDrawCommand with all possible derived
  // draw commands.
  function createDrawCommandWithAllDerivedCommands() {
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
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    // Derive the 2D commands
    drawCommand.getCommands(mockFrameState2D);

    return drawCommand;
  }

  it("throws for undefined command", function () {
    expect(function () {
      return new ModelExperimentalDrawCommand({
        command: undefined,
        primitiveRenderResources: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined primitiveRenderResources", function () {
    expect(function () {
      return new ModelExperimentalDrawCommand({
        command: new DrawCommand(),
        primitiveRenderResources: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs", function () {
    const renderResources = mockRenderResources();
    const command = createDrawCommand();
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.command).toBe(command);
    expect(drawCommand.runtimePrimitive).toBe(renderResources.runtimePrimitive);
    expect(drawCommand.model).toBe(renderResources.model);

    expect(drawCommand.modelMatrix).toEqual(command.modelMatrix);
    expect(drawCommand.modelMatrix).not.toBe(command.modelMatrix);

    expect(drawCommand._commandList.length).toEqual(1);
    expect(drawCommand._commandList2D.length).toEqual(0);
  });

  it("uses opaque command only", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.ALL_OPAQUE,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);
    expect(drawCommand._commandList[0]).toBe(command);
  });

  it("derives translucent command, draws translucent only", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.ALL_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);

    const translucentCommand = drawCommand._commandList[0];
    expect(translucentCommand).not.toBe(command);
    expect(translucentCommand.pass).toEqual(Pass.TRANSLUCENT);

    const renderState = translucentCommand.renderState;

    expect(renderState.cull.enabled).toBe(false);
    expect(renderState.depthTest.enabled).toBe(true);
    expect(renderState.depthMask).toBe(false);

    // The RenderState constructor adds an additional default value
    // that is not in BlendingState.ALPHA_BLEND.
    const expectedBlending = clone(BlendingState.ALPHA_BLEND, true);
    expectedBlending.color = new Color(0, 0, 0, 0);
    expect(renderState.blending).toEqual(expectedBlending);

    expect(drawCommand._commandList2D.length).toEqual(0);
  });

  it("derives translucent command, draws opaque and translucent", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._commandList[0]).toBe(command);

    const translucentCommand = drawCommand._commandList[1];
    expect(translucentCommand).not.toBe(command);
    expect(translucentCommand.pass).toEqual(Pass.TRANSLUCENT);

    const renderState = translucentCommand.renderState;
    expect(renderState.cull.enabled).toBe(false);
    expect(renderState.depthTest.enabled).toBe(true);
    expect(renderState.depthMask).toBe(false);

    // The RenderState constructor adds an additional default value
    // that is not in BlendingState.ALPHA_BLEND.
    const expectedBlending = clone(BlendingState.ALPHA_BLEND, true);
    expectedBlending.color = new Color(0, 0, 0, 0);
    expect(renderState.blending).toEqual(expectedBlending);

    expect(drawCommand._commandList2D.length).toEqual(0);
  });

  it("doesn't derive translucent command if original command is translucent", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.ALL_OPAQUE,
    });
    const command = createDrawCommand({
      pass: Pass.TRANSLUCENT,
    });
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);
    expect(drawCommand._commandList[0]).toBe(command);

    expect(drawCommand._commandList2D.length).toEqual(0);
  });

  it("getCommands works for original command", function () {
    const renderResources = mockRenderResources();
    const command = createDrawCommand();
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(1);
    expect(drawCommand._commandList[0]).toBe(command);

    const result = drawCommand.getCommands(mockFrameState);
    expect(result.length).toEqual(1);
    expect(result[0]).toBe(command);
  });

  it("getCommands works for multiple commands", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelExperimentalDrawCommand({
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
    const drawCommand = new ModelExperimentalDrawCommand({
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
    const drawCommand = new ModelExperimentalDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand._commandList.length).toEqual(2);
    expect(drawCommand._commandList2D.length).toEqual(0);

    const result = drawCommand.getCommands(mockFrameState2D);
    expect(result.length).toEqual(2);
    expect(drawCommand._commandList2D.length).toEqual(0);
  });

  it("getCommands updates model matrix for 2D commands", function () {
    const drawCommand = createDrawCommandWithAllDerivedCommands();
    const modelMatrix2D = drawCommand.modelMatrix;

    const translation = Matrix4.getTranslation(
      modelMatrix2D,
      scratchTranslation
    );

    const commandList = drawCommand._commandList;
    const commandList2D = drawCommand._commandList2D;
    expect(commandList.length).toEqual(2);
    expect(commandList2D.length).toEqual(2);

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
  });

  it("updates model matrix", function () {
    const renderResources = mockRenderResources({
      styleCommandsNeeded: StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT,
    });
    const command = createDrawCommand();
    const drawCommand = new ModelExperimentalDrawCommand({
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
    const drawCommand = createDrawCommandWithAllDerivedCommands();

    const commandList = drawCommand._commandList;
    const length = commandList.length;
    expect(length).toEqual(2);

    // Derive the 2D commands
    drawCommand.getCommands(mockFrameState2D);

    const commandList2D = drawCommand._commandList2D;
    const length2D = commandList2D.length;
    expect(length2D).toEqual(2);

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

    for (let i = 0; i < length; i++) {
      const command = commandList[i];
      expect(command.modelMatrix).toEqual(modelMatrix2D);
      expect(command.boundingVolume.center).toEqual(translation);
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

    for (let i = 0; i < length2D; i++) {
      const command = commandList2D[i];
      expect(command.modelMatrix).toEqual(expectedModelMatrix);
      expect(command.boundingVolume.center).toEqual(expectedTranslation);
    }
  });

  it("updates shadows", function () {
    const drawCommand = createDrawCommandWithAllDerivedCommands();
    let result = drawCommand.getCommands(mockFrameState2D);
    const length = result.length;
    expect(length).toEqual(4);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.castShadows).toBe(false);
      expect(command.receiveShadows).toBe(false);
    }

    drawCommand.shadows = ShadowMode.ENABLED;
    result = drawCommand.getCommands(mockFrameState2D);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.castShadows).toBe(true);
      expect(command.receiveShadows).toBe(true);
    }
  });

  it("updates back face culling", function () {
    const drawCommand = createDrawCommandWithAllDerivedCommands();
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

  it("updates cull face", function () {
    const drawCommand = createDrawCommandWithAllDerivedCommands();
    let result = drawCommand.getCommands(mockFrameState2D);
    const length = result.length;
    expect(length).toEqual(4);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.renderState.cull.face).toBe(CullFace.BACK);
    }

    drawCommand.cullFace = CullFace.FRONT;
    result = drawCommand.getCommands(mockFrameState2D);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.renderState.cull.face).toBe(CullFace.FRONT);
    }
  });

  it("updates debugShowBoundingVolume", function () {
    const drawCommand = createDrawCommandWithAllDerivedCommands();
    let result = drawCommand.getCommands(mockFrameState2D);
    const length = result.length;
    expect(length).toEqual(4);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.debugShowBoundingVolume).toBe(false);
    }

    drawCommand.debugShowBoundingVolume = true;
    result = drawCommand.getCommands(mockFrameState2D);

    for (let i = 0; i < length; i++) {
      const command = result[i];
      expect(command.debugShowBoundingVolume).toBe(true);
    }
  });
});
