import {
  BlendingState,
  BoundingSphere,
  Cartesian3,
  ClassificationModelDrawCommand,
  ClassificationType,
  clone,
  Color,
  defaultValue,
  DepthFunction,
  DrawCommand,
  Matrix4,
  Pass,
  RenderState,
  StencilConstants,
  StencilFunction,
  StencilOperation,
} from "../../../Source/Cesium.js";

describe("Scene/Model/ClassificationModelDrawCommand", function () {
  const noColor = new Color(0, 0, 0, 0);
  const mockFrameState = {
    commandList: [],
  };
  const mockFrameStateWithInvertedClassification = {
    commandList: [],
    invertClassification: true,
  };

  function mockRenderResources(classificationType) {
    return {
      model: {
        classificationType: classificationType,
      },
      runtimePrimitive: {
        boundingSphere: new BoundingSphere(Cartesian3.ZERO, 1.0),
      },
    };
  }

  function createDrawCommand(options) {
    options = defaultValue(options, {});
    options.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

    const boundingSphere = new BoundingSphere(Cartesian3.ZERO, 1.0);
    options.boundingVolume = BoundingSphere.transform(
      boundingSphere,
      options.modelMatrix,
      boundingSphere
    );

    options.renderState = defaultValue(
      options.renderState,
      RenderState.fromCache()
    );

    options.pass = Pass.OPAQUE;
    options.uniformMap = {};

    return new DrawCommand(options);
  }

  function verifyStencilDepthCommand(
    command,
    expectedPass,
    expectedStencilFunction
  ) {
    expect(command.cull).toBe(false);
    expect(command.pass).toBe(expectedPass);

    const renderState = command.renderState;
    expect(renderState.colorMask).toEqual({
      red: false,
      green: false,
      blue: false,
      alpha: false,
    });

    const expectedStencilTest = {
      enabled: true,
      frontFunction: expectedStencilFunction,
      frontOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.DECREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      backFunction: expectedStencilFunction,
      backOperation: {
        fail: StencilOperation.KEEP,
        zFail: StencilOperation.INCREMENT_WRAP,
        zPass: StencilOperation.KEEP,
      },
      reference: StencilConstants.CESIUM_3D_TILE_MASK,
      mask: StencilConstants.CESIUM_3D_TILE_MASK,
    };
    expect(renderState.stencilTest).toEqual(expectedStencilTest);
    expect(renderState.stencilMask).toEqual(
      StencilConstants.CLASSIFICATION_MASK
    );

    expect(renderState.depthTest).toEqual({
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    });
    expect(renderState.depthMask).toEqual(false);
  }

  // The RenderState constructor adds an additional default value
  // that is not in BlendingState.PRE_MULTIPLIED_ALPHA_BLEND.
  const expectedColorCommandBlending = clone(
    BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
    true
  );
  expectedColorCommandBlending.color = noColor;

  function verifyColorCommand(command, expectedPass) {
    expect(command.cull).toBe(false);
    expect(command.pass).toBe(expectedPass);

    const renderState = command.renderState;
    const expectedStencilTest = {
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
    };

    expect(renderState.stencilTest).toEqual(expectedStencilTest);
    expect(renderState.stencilMask).toEqual(
      StencilConstants.CLASSIFICATION_MASK
    );
    expect(renderState.depthTest.enabled).toEqual(false);
    expect(renderState.depthMask).toEqual(false);

    expect(renderState.blending).toEqual(expectedColorCommandBlending);
  }

  beforeEach(function () {
    mockFrameState.commandList.length = 0;
    mockFrameStateWithInvertedClassification.commandList.length = 0;
  });

  it("throws for undefined command", function () {
    expect(function () {
      return new ClassificationModelDrawCommand({
        command: undefined,
        primitiveRenderResources: {},
      });
    }).toThrowDeveloperError();
  });

  it("throws for undefined primitiveRenderResources", function () {
    expect(function () {
      return new ClassificationModelDrawCommand({
        command: new DrawCommand(),
        primitiveRenderResources: undefined,
      });
    }).toThrowDeveloperError();
  });

  it("constructs for terrain classification", function () {
    const renderResources = mockRenderResources(ClassificationType.TERRAIN);
    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.command).toBe(command);
    expect(drawCommand.runtimePrimitive).toBe(renderResources.runtimePrimitive);
    expect(drawCommand.model).toBe(renderResources.model);

    expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
    expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

    expect(drawCommand.classificationType).toBe(ClassificationType.TERRAIN);
    expect(drawCommand._classifiesTerrain).toBe(true);
    expect(drawCommand._classifies3DTiles).toBe(false);

    const commandList = drawCommand._commandList;
    expect(commandList.length).toEqual(2);

    const expectedPass = Pass.TERRAIN_CLASSIFICATION;
    const expectedStencilFunction = StencilFunction.ALWAYS;

    const stencilDepthCommand = commandList[0];
    verifyStencilDepthCommand(
      stencilDepthCommand,
      expectedPass,
      expectedStencilFunction
    );
    const colorCommand = commandList[1];
    verifyColorCommand(colorCommand, expectedPass);

    expect(drawCommand._ignoreShowCommand).toBeUndefined();
  });

  it("constructs for 3D Tiles classification", function () {
    const renderResources = mockRenderResources(
      ClassificationType.CESIUM_3D_TILE
    );
    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.command).toBe(command);
    expect(drawCommand.runtimePrimitive).toBe(renderResources.runtimePrimitive);
    expect(drawCommand.model).toBe(renderResources.model);

    expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
    expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

    expect(drawCommand.classificationType).toBe(
      ClassificationType.CESIUM_3D_TILE
    );
    expect(drawCommand._classifiesTerrain).toBe(false);
    expect(drawCommand._classifies3DTiles).toBe(true);

    const commandList = drawCommand._commandList;
    expect(commandList.length).toEqual(2);

    const expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    const expectedStencilFunction = StencilFunction.EQUAL;

    const stencilDepthCommand = commandList[0];
    verifyStencilDepthCommand(
      stencilDepthCommand,
      expectedPass,
      expectedStencilFunction
    );
    const colorCommand = commandList[1];
    verifyColorCommand(colorCommand, expectedPass);

    expect(drawCommand._ignoreShowCommand).toBeUndefined();
  });

  it("constructs for both classifications", function () {
    const renderResources = mockRenderResources(ClassificationType.BOTH);
    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.command).toBe(command);
    expect(drawCommand.runtimePrimitive).toBe(renderResources.runtimePrimitive);
    expect(drawCommand.model).toBe(renderResources.model);

    expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
    expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

    expect(drawCommand.classificationType).toBe(ClassificationType.BOTH);
    expect(drawCommand._classifiesTerrain).toBe(true);
    expect(drawCommand._classifies3DTiles).toBe(true);

    const commandList = drawCommand._commandList;
    expect(commandList.length).toEqual(4);

    let expectedPass = Pass.TERRAIN_CLASSIFICATION;
    let expectedStencilFunction = StencilFunction.ALWAYS;

    let stencilDepthCommand = commandList[0];
    verifyStencilDepthCommand(
      stencilDepthCommand,
      expectedPass,
      expectedStencilFunction
    );
    let colorCommand = commandList[1];
    verifyColorCommand(colorCommand, expectedPass);

    expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    expectedStencilFunction = StencilFunction.EQUAL;

    stencilDepthCommand = commandList[2];
    verifyStencilDepthCommand(
      stencilDepthCommand,
      expectedPass,
      expectedStencilFunction
    );
    colorCommand = commandList[3];
    verifyColorCommand(colorCommand, expectedPass);

    expect(drawCommand._ignoreShowCommand).toBeUndefined();
  });

  it("constructs for debug wireframe", function () {
    const renderResources = mockRenderResources(ClassificationType.BOTH);
    renderResources.model._enableDebugWireframe = true;
    renderResources.model.debugWireframe = true;

    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.command).toBe(command);
    expect(drawCommand.runtimePrimitive).toBe(renderResources.runtimePrimitive);
    expect(drawCommand.model).toBe(renderResources.model);

    expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
    expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

    expect(drawCommand.classificationType).toBe(ClassificationType.BOTH);
    expect(drawCommand._classifiesTerrain).toBe(true);
    expect(drawCommand._classifies3DTiles).toBe(true);

    const commandList = drawCommand._commandList;
    expect(commandList.length).toEqual(1);

    const wireframeCommand = commandList[0];
    expect(wireframeCommand).toBe(command);
    expect(wireframeCommand.pass).toBe(Pass.OPAQUE);

    expect(drawCommand._ignoreShowCommand).toBeUndefined();
  });

  it("pushCommands works", function () {
    const renderResources = mockRenderResources(ClassificationType.BOTH);
    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    const commandList = mockFrameState.commandList;
    drawCommand.pushCommands(mockFrameState, commandList);
    expect(commandList.length).toEqual(4);

    let expectedPass = Pass.TERRAIN_CLASSIFICATION;
    let expectedStencilFunction = StencilFunction.ALWAYS;

    let stencilDepthCommand = commandList[0];
    verifyStencilDepthCommand(
      stencilDepthCommand,
      expectedPass,
      expectedStencilFunction
    );
    let colorCommand = commandList[1];
    verifyColorCommand(colorCommand, expectedPass);

    expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    expectedStencilFunction = StencilFunction.EQUAL;

    stencilDepthCommand = commandList[2];
    verifyStencilDepthCommand(
      stencilDepthCommand,
      expectedPass,
      expectedStencilFunction
    );
    colorCommand = commandList[3];
    verifyColorCommand(colorCommand, expectedPass);
  });

  it("pushCommands derives ignore show command for 3D Tiles", function () {
    const renderResources = mockRenderResources(
      ClassificationType.CESIUM_3D_TILE
    );
    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    const commandList = mockFrameStateWithInvertedClassification.commandList;
    drawCommand.pushCommands(
      mockFrameStateWithInvertedClassification,
      commandList
    );
    expect(drawCommand._ignoreShowCommand).toBeDefined();
    expect(commandList.length).toEqual(3);

    let expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
    const expectedStencilFunction = StencilFunction.EQUAL;

    const stencilDepthCommand = commandList[0];
    verifyStencilDepthCommand(
      stencilDepthCommand,
      expectedPass,
      expectedStencilFunction
    );
    const colorCommand = commandList[1];
    verifyColorCommand(colorCommand, expectedPass);

    expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW;
    const ignoreShowCommand = commandList[2];
    verifyStencilDepthCommand(
      ignoreShowCommand,
      expectedPass,
      expectedStencilFunction
    );
  });

  it("pushCommands doesn't derive ignore show command for terrain", function () {
    const renderResources = mockRenderResources(ClassificationType.TERRAIN);
    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    const commandList = mockFrameStateWithInvertedClassification.commandList;
    drawCommand.pushCommands(
      mockFrameStateWithInvertedClassification,
      commandList
    );
    expect(drawCommand._ignoreShowCommand).toBeUndefined();
    expect(commandList.length).toEqual(2);
  });

  it("updates model matrix", function () {
    const renderResources = mockRenderResources(ClassificationType.BOTH);
    const command = createDrawCommand();
    const drawCommand = new ClassificationModelDrawCommand({
      primitiveRenderResources: renderResources,
      command: command,
    });

    expect(drawCommand.modelMatrix).toBe(command.modelMatrix);

    const commandList = drawCommand._commandList;
    const length = commandList.length;
    expect(length).toEqual(4);
    for (let i = 0; i < length; i++) {
      const command = commandList[i];
      expect(command.modelMatrix).toEqual(Matrix4.IDENTITY);
      expect(command.boundingVolume.center).toEqual(Cartesian3.ZERO);
    }

    const translation = Cartesian3.fromDegrees(100, 25);
    const modelMatrix = Matrix4.fromTranslation(translation, new Matrix4());

    drawCommand.modelMatrix = modelMatrix;
    expect(drawCommand.modelMatrix).toEqual(modelMatrix);
    for (let i = 0; i < length; i++) {
      const command = commandList[i];
      expect(command.modelMatrix).toEqual(modelMatrix);
      expect(command.boundingVolume.center).toEqual(translation);
    }
  });
});
