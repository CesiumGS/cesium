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

describe(
  "Scene/Model/ClassificationModelDrawCommand",
  function () {
    const noColor = new Color(0, 0, 0, 0);
    const mockFrameState = {
      commandList: [],
    };
    const mockFrameStateWithInvertedClassification = {
      commandList: [],
      invertClassification: true,
    };

    function mockRenderResources(options) {
      return {
        model: {
          classificationType: options.classificationType,
          _enableDebugWireframe: options.debugWireframe,
          debugWireframe: options.debugWireframe,
        },
        runtimePrimitive: {
          boundingSphere: new BoundingSphere(Cartesian3.ZERO, 1.0),
          batchLengths: options.batchLengths,
          batchOffsets: options.batchOffsets,
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

    function verifyBatchedStencilAndColorCommands(
      drawCommand,
      commandList,
      expectedPass,
      expectedStencilFunction
    ) {
      const batchLengths = drawCommand.batchLengths;
      const batchOffsets = drawCommand.batchOffsets;

      const numBatches = batchLengths.length;
      expect(commandList.length).toEqual(numBatches * 2);

      for (let i = 0; i < numBatches; i++) {
        const stencilDepthCommand = commandList[i * 2];
        expect(stencilDepthCommand.count).toBe(batchLengths[i]);
        expect(stencilDepthCommand.offset).toBe(batchOffsets[i]);
        verifyStencilDepthCommand(
          stencilDepthCommand,
          expectedPass,
          expectedStencilFunction
        );

        const colorCommand = commandList[i * 2 + 1];
        verifyColorCommand(colorCommand, expectedPass);
        expect(colorCommand.count).toBe(batchLengths[i]);
        expect(colorCommand.offset).toBe(batchOffsets[i]);
      }
    }

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
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.TERRAIN,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      expect(drawCommand.command).toBe(command);
      expect(drawCommand.runtimePrimitive).toBe(
        renderResources.runtimePrimitive
      );
      expect(drawCommand.model).toBe(renderResources.model);

      expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
      expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

      expect(drawCommand.classificationType).toBe(ClassificationType.TERRAIN);
      expect(drawCommand._classifiesTerrain).toBe(true);
      expect(drawCommand._classifies3DTiles).toBe(false);

      const commandList = drawCommand._commandListTerrain;
      const expectedPass = Pass.TERRAIN_CLASSIFICATION;
      const expectedStencilFunction = StencilFunction.ALWAYS;

      verifyBatchedStencilAndColorCommands(
        drawCommand,
        commandList,
        expectedPass,
        expectedStencilFunction
      );

      expect(drawCommand._commandList3DTiles.length).toBe(0);
      expect(drawCommand._commandListIgnoreShow.length).toBe(0);
      expect(drawCommand._commandListDebugWireframe.length).toBe(0);
    });

    it("constructs for 3D Tiles classification", function () {
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.CESIUM_3D_TILE,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      expect(drawCommand.command).toBe(command);
      expect(drawCommand.runtimePrimitive).toBe(
        renderResources.runtimePrimitive
      );
      expect(drawCommand.model).toBe(renderResources.model);

      expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
      expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

      expect(drawCommand.classificationType).toBe(
        ClassificationType.CESIUM_3D_TILE
      );
      expect(drawCommand._classifiesTerrain).toBe(false);
      expect(drawCommand._classifies3DTiles).toBe(true);

      const commandList = drawCommand._commandList3DTiles;
      const expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
      const expectedStencilFunction = StencilFunction.EQUAL;

      verifyBatchedStencilAndColorCommands(
        drawCommand,
        commandList,
        expectedPass,
        expectedStencilFunction
      );

      expect(drawCommand._commandListTerrain.length).toBe(0);
      expect(drawCommand._commandListIgnoreShow.length).toBe(0);
      expect(drawCommand._commandListDebugWireframe.length).toBe(0);
    });

    it("constructs for both classifications", function () {
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.BOTH,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      expect(drawCommand.command).toBe(command);
      expect(drawCommand.runtimePrimitive).toBe(
        renderResources.runtimePrimitive
      );
      expect(drawCommand.model).toBe(renderResources.model);

      expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
      expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

      expect(drawCommand.classificationType).toBe(ClassificationType.BOTH);
      expect(drawCommand._classifiesTerrain).toBe(true);
      expect(drawCommand._classifies3DTiles).toBe(true);

      let commandList = drawCommand._commandListTerrain;
      let expectedPass = Pass.TERRAIN_CLASSIFICATION;
      let expectedStencilFunction = StencilFunction.ALWAYS;

      verifyBatchedStencilAndColorCommands(
        drawCommand,
        commandList,
        expectedPass,
        expectedStencilFunction
      );

      commandList = drawCommand._commandList3DTiles;
      expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
      expectedStencilFunction = StencilFunction.EQUAL;

      verifyBatchedStencilAndColorCommands(
        drawCommand,
        commandList,
        expectedPass,
        expectedStencilFunction
      );

      expect(drawCommand._commandListIgnoreShow.length).toBe(0);
      expect(drawCommand._commandListDebugWireframe.length).toBe(0);
    });

    it("constructs for debug wireframe", function () {
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.BOTH,
        debugWireframe: true,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      expect(drawCommand.command).toBe(command);
      expect(drawCommand.runtimePrimitive).toBe(
        renderResources.runtimePrimitive
      );
      expect(drawCommand.model).toBe(renderResources.model);

      expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
      expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

      expect(drawCommand.classificationType).toBe(ClassificationType.BOTH);
      expect(drawCommand._classifiesTerrain).toBe(true);
      expect(drawCommand._classifies3DTiles).toBe(true);

      expect(drawCommand._useDebugWireframe).toBe(true);

      const batchLengths = drawCommand.batchLengths;
      const batchOffsets = drawCommand.batchOffsets;
      const numBatches = batchLengths.length;

      const commandList = drawCommand._commandListDebugWireframe;
      expect(commandList.length).toEqual(numBatches);

      for (let i = 0; i < numBatches; i++) {
        const wireframeCommand = commandList[i];
        expect(wireframeCommand.count).toBe(batchLengths[i] * 2);
        expect(wireframeCommand.offset).toBe(batchOffsets[i] * 2);
        expect(wireframeCommand.pass).toBe(Pass.OPAQUE);
      }

      expect(drawCommand._commandListTerrain.length).toBe(0);
      expect(drawCommand._commandList3DTiles.length).toBe(0);
      expect(drawCommand._commandListIgnoreShow.length).toBe(0);
    });

    it("pushCommands works", function () {
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.BOTH,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      const commandList = mockFrameState.commandList;
      drawCommand.pushCommands(mockFrameState, commandList);
      expect(commandList.length).toEqual(12);

      const commandListTerrain = commandList.slice(0, 6);
      let expectedPass = Pass.TERRAIN_CLASSIFICATION;
      let expectedStencilFunction = StencilFunction.ALWAYS;

      verifyBatchedStencilAndColorCommands(
        drawCommand,
        commandListTerrain,
        expectedPass,
        expectedStencilFunction
      );

      const commandList3DTiles = commandList.slice(6, 12);
      expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
      expectedStencilFunction = StencilFunction.EQUAL;

      verifyBatchedStencilAndColorCommands(
        drawCommand,
        commandList3DTiles,
        expectedPass,
        expectedStencilFunction
      );
    });

    it("pushCommands derives ignore show commands for 3D Tiles", function () {
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.CESIUM_3D_TILE,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      const commandListIgnoreShow = drawCommand._commandListIgnoreShow;
      expect(commandListIgnoreShow.length).toBe(0);

      const commandList = mockFrameStateWithInvertedClassification.commandList;
      drawCommand.pushCommands(
        mockFrameStateWithInvertedClassification,
        commandList
      );
      expect(commandList.length).toBe(9);

      const commandList3DTiles = commandList.slice(0, 6);
      let expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION;
      const expectedStencilFunction = StencilFunction.EQUAL;

      verifyBatchedStencilAndColorCommands(
        drawCommand,
        commandList3DTiles,
        expectedPass,
        expectedStencilFunction
      );

      const length = commandListIgnoreShow.length;
      expect(length).toBe(3);

      expectedPass = Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW;
      const indexOffset = 6;
      for (let i = 0; i < length; i++) {
        const ignoreShowCommand = commandListIgnoreShow[i];
        expect(commandList[indexOffset + i]).toBe(ignoreShowCommand);

        verifyStencilDepthCommand(
          ignoreShowCommand,
          expectedPass,
          expectedStencilFunction
        );
      }
    });

    it("pushCommands doesn't derive ignore show command for terrain", function () {
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.TERRAIN,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      const commandListIgnoreShow = drawCommand._commandListIgnoreShow;
      expect(commandListIgnoreShow.length).toBe(0);

      const commandList = mockFrameStateWithInvertedClassification.commandList;
      drawCommand.pushCommands(
        mockFrameStateWithInvertedClassification,
        commandList
      );

      expect(commandList.length).toBe(6);
      expect(commandListIgnoreShow.length).toBe(0);
    });

    it("updates model matrix", function () {
      const renderResources = mockRenderResources({
        classificationType: ClassificationType.BOTH,
        batchLengths: [6, 6, 3],
        batchOffsets: [0, 6, 12],
      });
      const command = createDrawCommand();
      const drawCommand = new ClassificationModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      expect(drawCommand.modelMatrix).toBe(command.modelMatrix);

      const commandList = [];
      commandList.push.apply(commandList, drawCommand._commandListTerrain);
      commandList.push.apply(commandList, drawCommand._commandList3DTiles);

      const length = commandList.length;
      expect(length).toEqual(12);
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
  },
  "WebGL"
);
