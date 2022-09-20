import {
  BlendingState,
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  clone,
  Color,
  CullFace,
  DepthFunction,
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
  StencilConstants,
  StencilFunction,
  StencilOperation,
  StyleCommandsNeeded,
  Transforms,
  WebGLConstants,
} from "../../index.js";;

describe(
  "Scene/Model/ModelDrawCommand",
  function () {
    const noColor = new Color(0, 0, 0, 0);
    const scratchModelMatrix = new Matrix4();
    const scratchExpectedMatrix = new Matrix4();

    const scratchTranslation = new Cartesian3();
    const scratchExpectedTranslation = new Cartesian3();

    const scratchProjection = new GeographicProjection();

    const mockContext = {
      stencilBuffer: true,
    };

    const mockFrameState = {
      commandList: [],
      mode: SceneMode.SCENE3D,
      mapProjection: scratchProjection,
      context: mockContext,
    };

    const mockFrameState2D = {
      commandList: [],
      mode: SceneMode.SCENE2D,
      mapProjection: scratchProjection,
      context: mockContext,
    };

    function mockModel(options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);

      const modelColor = defaultValue(options.color, Color.WHITE);
      const silhouetteColor = defaultValue(options.silhouetteColor, Color.RED);
      const silhouetteSize = defaultValue(options.silhouetteSize, 0.0);
      const skipLevelOfDetail = defaultValue(options.skipLevelOfDetail, false);

      return {
        sceneGraph: {
          _boundingSphere2D: new BoundingSphere(Cartesian3.ZERO, 1.0),
        },
        color: modelColor,
        silhouetteSize: silhouetteSize,
        silhouetteColor: silhouetteColor,
        _silhouetteId: 1,
        isTranslucent: function () {
          return modelColor.alpha > 0.0 && modelColor.alpha < 1.0;
        },
        isInvisible: function () {
          return modelColor.alpha === 0.0;
        },
        hasSilhouette: function () {
          return silhouetteSize > 0.0;
        },
        hasSkipLevelOfDetail: function () {
          return skipLevelOfDetail;
        },
        shadows: ShadowMode.ENABLED,
        _projectTo2D: false,
        content: {
          tileset: {
            _hasMixedContent: true,
            _backfaceCommands: [],
          },
          tile: {
            _finalResolution: false,
            _selectionDepth: 0,
          },
        },
      };
    }

    function mockRenderResources(options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);

      const model = mockModel(options.modelOptions);
      const resources = {
        model: model,
        runtimePrimitive: {
          primitive: {
            material: {
              doubleSided: false,
            },
          },
          boundingSphere: new BoundingSphere(Cartesian3.ZERO, 1.0),
        },
        hasSilhouette: model.hasSilhouette(),
        hasSkipLevelOfDetail: model.hasSkipLevelOfDetail(),
      };

      const boundingSphereTransform2D = defaultValue(
        options.boundingSphereTransform2D,
        Matrix4.IDENTITY
      );

      const sceneGraph = resources.model.sceneGraph;
      sceneGraph._boundingSphere2D = BoundingSphere.transform(
        sceneGraph._boundingSphere2D,
        boundingSphereTransform2D,
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
        RenderState.fromCache({
          depthTest: {
            enabled: true,
            func: DepthFunction.LESS_OR_EQUAL,
          },
        })
      );

      options.pass = defaultValue(options.pass, Pass.OPAQUE);
      options.uniformMap = {};

      return new DrawCommand(options);
    }

    const idlMatrix = Matrix4.fromTranslation(
      Cartesian3.fromDegrees(180, 0),
      new Matrix4()
    );

    const idlMatrix2D = Transforms.basisTo2D(
      mockFrameState2D.mapProjection,
      idlMatrix,
      idlMatrix
    );

    // Creates a ModelDrawCommand with the specified derived commands.
    function createModelDrawCommand(options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);

      const deriveSilhouette = options.deriveSilhouette;
      const derive2D = options.derive2D;
      const deriveSkipLevelOfDetail = options.deriveSkipLevelOfDetail;

      const modelOptions = {
        silhouetteSize: deriveSilhouette ? 1.0 : 0.0,
        skipLevelOfDetail: deriveSkipLevelOfDetail,
      };

      const transform2D = derive2D ? idlMatrix2D : Matrix4.IDENTITY;

      const renderResources = mockRenderResources({
        modelOptions: modelOptions,
        boundingSphereTransform2D: transform2D,
      });

      const command = createDrawCommand({
        modelMatrix: transform2D,
        pass: Pass.OPAQUE,
      });

      const drawCommand = new ModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      // Derive the 2D commands
      if (derive2D) {
        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );
        mockFrameState2D.commandList.length = 0;
      }

      return drawCommand;
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

    function verifyDerivedCommandsDefined(drawCommand, expected) {
      // Verify if the translucent command is defined / undefined.
      const translucentDefined = defaultValue(expected.translucent, false);
      const translucentCommand = drawCommand._translucentCommand;
      expect(defined(translucentCommand)).toBe(translucentDefined);

      // Verify if the skip level of detail commands are defined / undefined.
      const skipLevelOfDetailDefined = defaultValue(
        expected.skipLevelOfDetail,
        false
      );
      const skipLodBackfaceCommand = drawCommand._skipLodBackfaceCommand;
      const skipLodStencilCommand = drawCommand._skipLodStencilCommand;
      expect(defined(skipLodBackfaceCommand)).toBe(skipLevelOfDetailDefined);
      expect(defined(skipLodStencilCommand)).toBe(skipLevelOfDetailDefined);

      // Verify if the silhouette commands are defined / undefined.
      const silhouetteDefined = defaultValue(expected.silhouette, false);
      const silhouetteModelCommand = drawCommand._silhouetteModelCommand;
      const silhouetteColorCommand = drawCommand._silhouetteColorCommand;
      expect(defined(silhouetteModelCommand)).toBe(silhouetteDefined);
      expect(defined(silhouetteColorCommand)).toBe(silhouetteDefined);
    }

    function verifyDerivedCommandUpdateFlags(derivedCommand, expected) {
      expect(derivedCommand.updateShadows).toEqual(expected.updateShadows);
      expect(derivedCommand.updateBackFaceCulling).toEqual(
        expected.updateBackFaceCulling
      );
      expect(derivedCommand.updateCullFace).toEqual(expected.updateCullFace);
      expect(derivedCommand.updateDebugShowBoundingVolume).toEqual(
        expected.updateDebugShowBoundingVolume
      );
    }

    beforeEach(function () {
      mockFrameState.commandList.length = 0;
      mockFrameState2D.commandList.length = 0;
    });

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
      expect(drawCommand.runtimePrimitive).toBe(
        renderResources.runtimePrimitive
      );
      expect(drawCommand.model).toBe(renderResources.model);

      expect(drawCommand.modelMatrix).toBe(command.modelMatrix);
      expect(drawCommand.boundingVolume).toBe(command.boundingVolume);

      const originalCommand = drawCommand._originalCommand;
      expect(originalCommand).toBeDefined();
      expect(originalCommand.command).toBe(command);
      expect(originalCommand.is2D).toBe(false);
      verifyDerivedCommandUpdateFlags(originalCommand, {
        updateShadows: true,
        updateBackFaceCulling: true,
        updateCullFace: true,
        updateDebugShowBoundingVolume: true,
      });

      const derivedCommands = drawCommand._derivedCommands;
      expect(derivedCommands.length).toEqual(2);
      expect(derivedCommands[0]).toBe(originalCommand);

      // The translucent command is derived by default.
      verifyDerivedCommandsDefined(drawCommand, {
        translucent: true,
        skipLevelOfDetail: false,
        silhouette: false,
      });

      const translucentCommand = drawCommand._translucentCommand;
      expect(derivedCommands[1]).toBe(translucentCommand);
      expect(translucentCommand.is2D).toBe(false);

      verifyDerivedCommandUpdateFlags(translucentCommand, {
        updateShadows: true,
        updateBackFaceCulling: false,
        updateCullFace: false,
        updateDebugShowBoundingVolume: true,
      });

      const innerCommand = translucentCommand.command;
      expect(innerCommand).not.toEqual(command);
      expect(innerCommand.pass).toEqual(Pass.TRANSLUCENT);

      const renderState = innerCommand.renderState;
      expect(renderState.cull.enabled).toBe(false);
      expect(renderState.depthTest.enabled).toBe(true);
      expect(renderState.depthMask).toBe(false);

      // The RenderState constructor adds an additional default value
      // that is not in BlendingState.ALPHA_BLEND.
      const expectedBlending = clone(BlendingState.ALPHA_BLEND);
      expectedBlending.color = noColor;
      expect(renderState.blending).toEqual(expectedBlending);
    });

    it("doesn't derive translucent command if original command is translucent", function () {
      const renderResources = mockRenderResources();
      const command = createDrawCommand({
        pass: Pass.TRANSLUCENT,
      });
      const drawCommand = new ModelDrawCommand({
        primitiveRenderResources: renderResources,
        command: command,
      });

      const originalCommand = drawCommand._originalCommand;
      expect(originalCommand).toBeDefined();
      expect(originalCommand.command.pass).toBe(Pass.TRANSLUCENT);

      const derivedCommands = drawCommand._derivedCommands;
      expect(derivedCommands.length).toEqual(1);
      expect(derivedCommands[0]).toBe(originalCommand);

      expect(drawCommand._translucentCommand).toBeUndefined();
    });

    describe("silhouette commands", function () {
      function verifySilhouetteModelDerivedCommand(
        derivedCommand,
        stencilReference,
        modelIsInvisible
      ) {
        const command = derivedCommand.command;
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
        }
      }

      function verifySilhouetteColorDerivedCommand(
        derivedCommand,
        stencilReference,
        silhouetteIsTranslucent
      ) {
        const command = derivedCommand.command;
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

      function verifySilhouetteCommands(
        drawCommand,
        modelIsTranslucent,
        modelIsInvisible,
        silhouetteIsTranslucent
      ) {
        const command = drawCommand.command;
        const derivedCommands = drawCommand._derivedCommands;
        expect(derivedCommands.length).toEqual(3);

        const originalCommand = drawCommand._originalCommand;
        expect(derivedCommands[0]).toBe(originalCommand);
        expect(originalCommand.is2D).toBe(false);

        verifyDerivedCommandsDefined(drawCommand, {
          translucent: false,
          skipLevelOfDetail: false,
          silhouette: true,
        });

        const stencilReference = 1;

        const silhouetteModelCommand = derivedCommands[1];
        expect(silhouetteModelCommand.command).not.toEqual(command);
        expect(silhouetteModelCommand.is2D).toBe(false);

        verifyDerivedCommandUpdateFlags(silhouetteModelCommand, {
          updateShadows: true,
          updateBackFaceCulling: !modelIsTranslucent,
          updateCullFace: !modelIsTranslucent,
          updateDebugShowBoundingVolume: true,
        });

        verifySilhouetteModelDerivedCommand(
          silhouetteModelCommand,
          stencilReference,
          modelIsInvisible
        );

        const silhouetteColorCommand = derivedCommands[2];
        expect(silhouetteColorCommand.command).not.toEqual(command);
        expect(silhouetteColorCommand.is2D).toBe(false);

        verifyDerivedCommandUpdateFlags(silhouetteColorCommand, {
          updateShadows: false,
          updateBackFaceCulling: false,
          updateCullFace: false,
          updateDebugShowBoundingVolume: false,
        });

        verifySilhouetteColorDerivedCommand(
          silhouetteColorCommand,
          stencilReference,
          silhouetteIsTranslucent
        );
      }

      it("derives silhouette commands for opaque model", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            silhouetteSize: 1.0,
          },
        });
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const modelIsTranslucent = false;
        const modelIsInvisible = false;
        const silhouetteIsTranslucent = false;

        verifySilhouetteCommands(
          drawCommand,
          modelIsTranslucent,
          modelIsInvisible,
          silhouetteIsTranslucent
        );
      });

      it("derives silhouette commands for translucent model", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            color: new Color(1.0, 1.0, 1.0, 0.5),
            silhouetteSize: 1.0,
          },
        });
        const command = createDrawCommand({
          pass: Pass.TRANSLUCENT,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const modelIsTranslucent = true;
        const modelIsInvisible = false;
        const silhouetteIsTranslucent = false;

        verifySilhouetteCommands(
          drawCommand,
          modelIsTranslucent,
          modelIsInvisible,
          silhouetteIsTranslucent
        );
      });

      it("derives silhouette commands for invisible model", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            color: new Color(1.0, 1.0, 1.0, 0.0),
            silhouetteSize: 1.0,
          },
        });
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const modelIsTranslucent = false;
        const modelIsInvisible = true;
        const silhouetteIsTranslucent = false;

        verifySilhouetteCommands(
          drawCommand,
          modelIsTranslucent,
          modelIsInvisible,
          silhouetteIsTranslucent
        );
      });

      it("derives silhouette commands for translucent silhouette color", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            color: new Color(1.0, 1.0, 1.0, 1.0),
            silhouetteColor: new Color(1.0, 1.0, 1.0, 0.5),
            silhouetteSize: 1.0,
          },
        });
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const modelIsTranslucent = false;
        const modelIsInvisible = false;
        const silhouetteIsTranslucent = true;

        verifySilhouetteCommands(
          drawCommand,
          modelIsTranslucent,
          modelIsInvisible,
          silhouetteIsTranslucent
        );
      });
    });

    describe("skipLeveOfDetail commands", function () {
      const expectedColorMask = {
        red: false,
        green: false,
        blue: false,
        alpha: false,
      };

      const expectedPolygonOffset = {
        enabled: true,
        factor: 5.0,
        units: 5.0,
      };

      function verifySkipLodBackfaceCommand(command) {
        const renderState = command.renderState;
        expect(renderState.cull.enabled).toBe(true);
        expect(renderState.cull.face).toBe(CullFace.FRONT);
        expect(renderState.colorMask).toEqual(expectedColorMask);
        expect(renderState.polygonOffset).toEqual(expectedPolygonOffset);

        const uniformMap = command.uniformMap;
        expect(uniformMap.u_polygonOffset()).toEqual(new Cartesian2(5.0, 5.0));

        expect(command.castShadows).toBe(false);
        expect(command.receiveShadows).toBe(false);
      }

      function verifySkipLodStencilCommand(command) {
        const renderState = command.renderState;
        const stencilTest = renderState.stencilTest;
        expect(stencilTest.enabled).toBe(true);
        expect(stencilTest.mask).toEqual(StencilConstants.SKIP_LOD_MASK);
        expect(stencilTest.reference).toEqual(
          StencilConstants.CESIUM_3D_TILE_MASK
        );
        expect(stencilTest.frontFunction).toEqual(
          StencilFunction.GREATER_OR_EQUAL
        );
        expect(stencilTest.frontOperation.zPass).toEqual(
          StencilOperation.REPLACE
        );
        expect(stencilTest.backFunction).toEqual(
          StencilFunction.GREATER_OR_EQUAL
        );
        expect(stencilTest.backOperation.zPass).toEqual(
          StencilOperation.REPLACE
        );

        const expectedStencilMask =
          StencilConstants.CESIUM_3D_TILE_MASK | StencilConstants.SKIP_LOD_MASK;
        expect(renderState.stencilMask).toEqual(expectedStencilMask);
      }

      it("constructs skipLevelOfDetail commands", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            skipLevelOfDetail: true,
          },
        });
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const derivedCommands = drawCommand._derivedCommands;
        expect(derivedCommands.length).toEqual(4);

        const originalCommand = drawCommand._originalCommand;
        expect(derivedCommands[0]).toBe(originalCommand);
        expect(originalCommand.is2D).toBe(false);

        verifyDerivedCommandsDefined(drawCommand, {
          translucent: true,
          skipLevelOfDetail: true,
          silhouette: false,
        });

        const translucentCommand = drawCommand._translucentCommand;
        expect(derivedCommands[1]).toBe(translucentCommand);
        expect(translucentCommand.is2D).toBe(false);

        const skipLodBackfaceCommand = drawCommand._skipLodBackfaceCommand;
        expect(derivedCommands[2]).toBe(skipLodBackfaceCommand);
        expect(skipLodBackfaceCommand.is2D).toBe(false);

        verifyDerivedCommandUpdateFlags(skipLodBackfaceCommand, {
          updateShadows: false,
          updateBackFaceCulling: false,
          updateCullFace: true,
          updateDebugShowBoundingVolume: false,
        });

        const innerBackfaceCommand = skipLodBackfaceCommand.command;
        expect(innerBackfaceCommand).not.toEqual(command);
        verifySkipLodBackfaceCommand(innerBackfaceCommand);

        const skipLodStencilCommand = drawCommand._skipLodStencilCommand;
        expect(derivedCommands[3]).toBe(skipLodStencilCommand);
        expect(skipLodStencilCommand.is2D).toBe(false);

        verifyDerivedCommandUpdateFlags(skipLodStencilCommand, {
          updateShadows: true,
          updateBackFaceCulling: true,
          updateCullFace: true,
          updateDebugShowBoundingVolume: true,
        });

        const innerStencilCommand = skipLodStencilCommand.command;
        expect(innerStencilCommand).not.toEqual(command);
        verifySkipLodStencilCommand(innerStencilCommand);
      });

      it("doesn't construct skipLevelOfDetail commands if original command is translucent", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            skipLevelOfDetail: true,
          },
        });
        const command = createDrawCommand({
          pass: Pass.TRANSLUCENT,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const originalCommand = drawCommand._originalCommand;
        expect(originalCommand).toBeDefined();
        expect(originalCommand.command.pass).toBe(Pass.TRANSLUCENT);

        const derivedCommands = drawCommand._derivedCommands;
        expect(derivedCommands.length).toEqual(1);
        expect(derivedCommands[0]).toBe(originalCommand);

        // No other commands should be derived.
        verifyDerivedCommandsDefined(drawCommand, {
          translucent: false,
          skipLevelOfDetail: false,
          silhouette: false,
        });
      });
    });

    describe("pushCommands", function () {
      it("pushCommands pushes original command if styleCommandsNeeded is undefined", function () {
        const renderResources = mockRenderResources();
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(1);
        expect(commandList[0]).toBe(command);
      });

      it("pushCommands pushes original command if style is ALL_OPAQUE", function () {
        const renderResources = mockRenderResources();
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });
        const model = renderResources.model;
        model.styleCommandsNeeded = StyleCommandsNeeded.ALL_OPAQUE;

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(1);
        expect(commandList[0]).toBe(command);
      });

      it("pushCommands pushes translucent command if style is ALL_TRANSLUCENT", function () {
        const renderResources = mockRenderResources();
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });
        const model = renderResources.model;
        model.styleCommandsNeeded = StyleCommandsNeeded.ALL_TRANSLUCENT;

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(1);

        const translucentDrawCommand = drawCommand._translucentCommand.command;
        expect(commandList[0]).toBe(translucentDrawCommand);
      });

      it("pushCommands pushes both commands if style is OPAQUE_AND_TRANSLUCENT", function () {
        const renderResources = mockRenderResources();
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });
        const model = renderResources.model;
        model.styleCommandsNeeded = StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;

        const originalDrawCommand = drawCommand._originalCommand.command;
        const translucentDrawCommand = drawCommand._translucentCommand.command;

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(2);
        expect(commandList[0]).toBe(translucentDrawCommand);
        expect(commandList[1]).toBe(originalDrawCommand);
      });

      it("pushCommands pushes silhouette model command", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            silhouetteSize: 1.0,
          },
        });
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const silhouetteModelDrawCommand =
          drawCommand._silhouetteModelCommand.command;

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(1);
        expect(commandList[0]).toBe(silhouetteModelDrawCommand);
      });

      it("pushCommands pushes skipLevelOfDetail commands", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            skipLevelOfDetail: true,
          },
        });
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const skipLodBackfaceCommand = drawCommand._skipLodBackfaceCommand;
        const skipLodStencilCommand = drawCommand._skipLodStencilCommand;

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(1);
        expect(commandList[0]).toBe(skipLodStencilCommand.command);

        const tileset = drawCommand.model.content.tileset;
        const backfaceCommands = tileset._backfaceCommands;
        expect(backfaceCommands.length).toEqual(1);
        expect(backfaceCommands[0]).toBe(skipLodBackfaceCommand.command);
      });

      it("pushCommands doesn't push skipLevelOfDetail backface commmand if tile is at final resolution", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            skipLevelOfDetail: true,
          },
        });
        const command = createDrawCommand();
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const content = drawCommand.model.content;
        content.tile._finalResolution = true;

        const skipLodStencilCommand = drawCommand._skipLodStencilCommand;

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(1);
        expect(commandList[0]).toBe(skipLodStencilCommand.command);

        const backfaceCommands = content.tileset._backfaceCommands;
        expect(backfaceCommands.length).toEqual(0);
      });

      it("pushCommands derives 2D command if model is near IDL", function () {
        const renderResources = mockRenderResources({
          boundingSphereTransform2D: idlMatrix2D,
        });
        const command = createDrawCommand({
          modelMatrix: idlMatrix2D,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        // 2D commands aren't derived until pushCommands is called
        const originalCommand = drawCommand._originalCommand;
        expect(originalCommand.derivedCommand2D).toBeUndefined();

        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );

        const originalCommand2D = originalCommand.derivedCommand2D;
        expect(originalCommand2D).toBeDefined();
        expect(originalCommand2D.is2D).toBe(true);

        const originalDrawCommand = originalCommand.command;
        const originalDrawCommand2D = originalCommand2D.command;

        expect(originalDrawCommand.modelMatrix).toBe(drawCommand._modelMatrix);
        expect(originalDrawCommand2D.modelMatrix).toBe(
          drawCommand._modelMatrix2D
        );

        const commandList = mockFrameState2D.commandList;
        expect(commandList.length).toEqual(2);
        expect(commandList[0]).toBe(originalDrawCommand);
        expect(commandList[1]).toBe(originalDrawCommand2D);
      });

      it("pushCommands derives 2D translucent command", function () {
        const renderResources = mockRenderResources({
          boundingSphereTransform2D: idlMatrix2D,
        });
        const command = createDrawCommand({
          modelMatrix: idlMatrix2D,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });
        const model = renderResources.model;
        model.styleCommandsNeeded = StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;

        // 2D commands aren't derived until pushCommands is called
        const originalCommand = drawCommand._originalCommand;
        const translucentCommand = drawCommand._translucentCommand;
        expect(originalCommand.derivedCommand2D).toBeUndefined();
        expect(translucentCommand.derivedCommand2D).toBeUndefined();

        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );

        const originalCommand2D = originalCommand.derivedCommand2D;
        expect(originalCommand2D).toBeDefined();
        expect(originalCommand2D.is2D).toBe(true);

        const translucentCommand2D = translucentCommand.derivedCommand2D;
        expect(translucentCommand2D).toBeDefined();
        expect(translucentCommand2D.is2D).toBe(true);

        const originalDrawCommand = originalCommand.command;
        const originalDrawCommand2D = originalCommand2D.command;
        const translucentDrawCommand = translucentCommand.command;
        const translucentDrawCommand2D = translucentCommand2D.command;

        expect(translucentDrawCommand.modelMatrix).toBe(
          drawCommand._modelMatrix
        );
        expect(translucentDrawCommand2D.modelMatrix).toBe(
          drawCommand._modelMatrix2D
        );

        const commandList = mockFrameState2D.commandList;
        expect(commandList.length).toEqual(4);
        expect(commandList[0]).toBe(translucentDrawCommand);
        expect(commandList[1]).toBe(translucentDrawCommand2D);
        expect(commandList[2]).toBe(originalDrawCommand);
        expect(commandList[3]).toBe(originalDrawCommand2D);
      });

      it("pushCommands derives 2D silhouette commands", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            silhouetteSize: 1.0,
          },
          boundingSphereTransform2D: idlMatrix2D,
        });
        const command = createDrawCommand({
          modelMatrix: idlMatrix2D,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        // 2D commands aren't derived until pushCommands is called
        const silhouetteModelCommand = drawCommand._silhouetteModelCommand;
        const silhouetteColorCommand = drawCommand._silhouetteColorCommand;
        expect(silhouetteModelCommand.derivedCommand2D).toBeUndefined();
        expect(silhouetteColorCommand.derivedCommand2D).toBeUndefined();

        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );

        const silhouetteModelCommand2D =
          silhouetteModelCommand.derivedCommand2D;
        expect(silhouetteModelCommand2D).toBeDefined();
        expect(silhouetteModelCommand2D.is2D).toBe(true);

        const silhouetteColorCommand2D =
          silhouetteColorCommand.derivedCommand2D;
        expect(silhouetteColorCommand2D).toBeDefined();
        expect(silhouetteColorCommand2D.is2D).toBe(true);

        const modelDrawCommand = silhouetteModelCommand.command;
        const modelDrawCommand2D = silhouetteModelCommand2D.command;
        expect(modelDrawCommand.modelMatrix).toBe(drawCommand._modelMatrix);
        expect(modelDrawCommand2D.modelMatrix).toBe(drawCommand._modelMatrix2D);

        const colorDrawCommand = silhouetteColorCommand.command;
        const colorDrawCommand2D = silhouetteColorCommand2D.command;
        expect(colorDrawCommand.modelMatrix).toBe(drawCommand._modelMatrix);
        expect(colorDrawCommand2D.modelMatrix).toBe(drawCommand._modelMatrix2D);

        // Only the silhouette model commands are submitted.
        const commandList = mockFrameState2D.commandList;
        expect(commandList.length).toEqual(2);
        expect(commandList[0]).toBe(modelDrawCommand);
        expect(commandList[1]).toBe(modelDrawCommand2D);
      });

      it("pushCommands derives 2D skipLevelOfDetail commands", function () {
        const renderResources = mockRenderResources({
          modelOptions: {
            skipLevelOfDetail: true,
          },
          boundingSphereTransform2D: idlMatrix2D,
        });
        const command = createDrawCommand({
          modelMatrix: idlMatrix2D,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        // 2D commands aren't derived until pushCommands is called
        const skipLodBackfaceCommand = drawCommand._skipLodBackfaceCommand;
        const skipLodStencilCommand = drawCommand._skipLodStencilCommand;
        expect(skipLodBackfaceCommand.derivedCommand2D).toBeUndefined();
        expect(skipLodStencilCommand.derivedCommand2D).toBeUndefined();

        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );

        const skipLodBackfaceCommand2D =
          skipLodBackfaceCommand.derivedCommand2D;
        expect(skipLodBackfaceCommand2D).toBeDefined();
        expect(skipLodBackfaceCommand2D.is2D).toBe(true);

        const skipLodStencilCommand2D = skipLodStencilCommand.derivedCommand2D;
        expect(skipLodStencilCommand2D).toBeDefined();
        expect(skipLodStencilCommand2D.is2D).toBe(true);

        const backfaceDrawCommand = skipLodBackfaceCommand.command;
        const backfaceDrawCommand2D = skipLodBackfaceCommand2D.command;
        expect(backfaceDrawCommand.modelMatrix).toBe(drawCommand._modelMatrix);
        expect(backfaceDrawCommand2D.modelMatrix).toBe(
          drawCommand._modelMatrix2D
        );

        const stencilDrawCommand = skipLodStencilCommand.command;
        const stencilDrawCommand2D = skipLodStencilCommand2D.command;
        expect(stencilDrawCommand.modelMatrix).toBe(drawCommand._modelMatrix);
        expect(stencilDrawCommand2D.modelMatrix).toBe(
          drawCommand._modelMatrix2D
        );

        const commandList = mockFrameState2D.commandList;
        expect(commandList.length).toEqual(2);
        expect(commandList[0]).toBe(stencilDrawCommand);
        expect(commandList[1]).toBe(stencilDrawCommand2D);

        const tileset = drawCommand.model.content.tileset;
        const backfaceCommands = tileset._backfaceCommands;
        expect(backfaceCommands.length).toEqual(2);
        expect(backfaceCommands[0]).toBe(backfaceDrawCommand);
        expect(backfaceCommands[1]).toBe(backfaceDrawCommand2D);
      });

      it("pushCommands doesn't derive 2D commands if model is not near IDL", function () {
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
          boundingSphereTransform2D: modelMatrix2D,
        });
        const command = createDrawCommand({
          modelMatrix: modelMatrix2D,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const originalCommand = drawCommand._originalCommand;
        expect(originalCommand.derivedCommand2D).toBeUndefined();

        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );

        // The 2D command should not be derived.
        expect(originalCommand.derivedCommand2D).toBeUndefined();

        const commandList = mockFrameState2D.commandList;
        expect(commandList.length).toEqual(1);
        expect(commandList[0]).toBe(originalCommand.command);
      });

      it("pushCommands updates model matrix for 2D commands", function () {
        const renderResources = mockRenderResources({
          boundingSphereTransform2D: idlMatrix2D,
        });
        const command = createDrawCommand({
          modelMatrix: idlMatrix2D,
        });
        const drawCommand = new ModelDrawCommand({
          primitiveRenderResources: renderResources,
          command: command,
        });

        const translation = Matrix4.getTranslation(
          idlMatrix2D,
          scratchTranslation
        );

        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );

        const expectedModelMatrix = computeExpected2DMatrix(
          idlMatrix2D,
          mockFrameState2D
        );

        const expectedTranslation = Matrix4.getTranslation(
          expectedModelMatrix,
          scratchExpectedTranslation
        );

        const originalCommand = drawCommand._originalCommand;
        const originalCommand2D = originalCommand.derivedCommand2D;

        const translucentCommand = drawCommand._translucentCommand;
        const translucentCommand2D = translucentCommand.derivedCommand2D;

        const originalDrawCommand = originalCommand.command;
        const translucentDrawCommand = translucentCommand.command;

        expect(originalDrawCommand.modelMatrix).toEqual(idlMatrix2D);
        expect(translucentDrawCommand.modelMatrix).toEqual(idlMatrix2D);
        expect(originalDrawCommand.boundingVolume.center).toEqual(translation);
        expect(translucentDrawCommand.boundingVolume.center).toEqual(
          translation
        );

        const originalDrawCommand2D = originalCommand2D.command;
        const translucentDrawCommand2D = translucentCommand2D.command;

        expect(originalDrawCommand2D.modelMatrix).toEqual(expectedModelMatrix);
        expect(translucentDrawCommand2D.modelMatrix).toEqual(
          expectedModelMatrix
        );
        expect(originalDrawCommand2D.boundingVolume.center).toEqual(
          expectedTranslation
        );
        expect(translucentDrawCommand2D.boundingVolume.center).toEqual(
          expectedTranslation
        );
      });
    });

    describe("pushSilhouetteCommands", function () {
      it("pushSilhouetteCommands pushes silhouette-pass commands", function () {
        const drawCommand = createModelDrawCommand({
          deriveSilhouette: true,
        });

        const silhouetteModelCommand = drawCommand._silhouetteModelCommand;
        const silhouetteColorCommand = drawCommand._silhouetteColorCommand;

        const modelDrawCommand = silhouetteModelCommand.command;
        const colorDrawCommand = silhouetteColorCommand.command;

        const commandList = mockFrameState.commandList;
        drawCommand.pushCommands(mockFrameState, commandList);
        expect(commandList.length).toEqual(1);
        expect(commandList[0]).toBe(modelDrawCommand);

        const silhouetteCommands = [];
        drawCommand.pushSilhouetteCommands(mockFrameState, silhouetteCommands);
        expect(silhouetteCommands.length).toEqual(1);
        expect(silhouetteCommands[0]).toBe(colorDrawCommand);
      });

      it("pushSilhouetteCommands pushes 2D silhouette-pass commands", function () {
        const drawCommand = createModelDrawCommand({
          derive2D: true,
          deriveSilhouette: true,
        });

        const silhouetteModelCommand = drawCommand._silhouetteModelCommand;
        const silhouetteColorCommand = drawCommand._silhouetteColorCommand;
        const silhouetteModelCommand2D =
          silhouetteModelCommand.derivedCommand2D;
        const silhouetteColorCommand2D =
          silhouetteColorCommand.derivedCommand2D;

        const modelDrawCommand = silhouetteModelCommand.command;
        const modelDrawCommand2D = silhouetteModelCommand2D.command;
        const colorDrawCommand = silhouetteColorCommand.command;
        const colorDrawCommand2D = silhouetteColorCommand2D.command;

        const commandList = mockFrameState2D.commandList;
        drawCommand.pushCommands(mockFrameState2D, commandList);
        expect(commandList.length).toEqual(2);
        expect(commandList[0]).toBe(modelDrawCommand);
        expect(commandList[1]).toBe(modelDrawCommand2D);

        const silhouetteCommands = [];
        drawCommand.pushSilhouetteCommands(
          mockFrameState2D,
          silhouetteCommands
        );
        expect(silhouetteCommands.length).toEqual(2);
        expect(silhouetteCommands[0]).toBe(colorDrawCommand);
        expect(silhouetteCommands[1]).toBe(colorDrawCommand2D);
      });
    });

    describe("model matrix", function () {
      it("updates model matrix", function () {
        const drawCommand = createModelDrawCommand();
        expect(drawCommand.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(drawCommand.boundingVolume.center).toEqual(Cartesian3.ZERO);

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(2);
        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
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
        expect(drawCommand.boundingVolume.center).toEqual(translation);
        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.modelMatrix).toEqual(modelMatrix);
          expect(command.boundingVolume.center).toEqual(translation);
        }
      });

      it("updates model matrix for 2D commands", function () {
        const drawCommand = createModelDrawCommand({
          derive2D: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        expect(derivedCommands.length).toEqual(4);

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
        expect(drawCommand.boundingVolume.center).toEqual(translation);

        // The first half of the derived command list contains regular commands.
        for (let i = 0; i < 2; i++) {
          const command = derivedCommands[i].command;
          expect(command.modelMatrix).toEqual(modelMatrix2D);
          expect(command.boundingVolume.center).toEqual(translation);
        }

        // Update the model matrix for the 2D commands
        drawCommand.pushCommands(
          mockFrameState2D,
          mockFrameState2D.commandList
        );

        const expectedModelMatrix = computeExpected2DMatrix(
          modelMatrix2D,
          mockFrameState2D
        );
        const expectedTranslation = Matrix4.getTranslation(
          expectedModelMatrix,
          scratchExpectedTranslation
        );

        // The second half of the derived command list contains 2D commands.
        for (let i = 2; i < 4; i++) {
          const command = derivedCommands[i].command;
          expect(command.modelMatrix).toEqual(expectedModelMatrix);
          expect(command.boundingVolume.center).toEqual(expectedTranslation);
        }
      });
    });

    describe("shadows", function () {
      it("updates shadows", function () {
        const drawCommand = createModelDrawCommand();

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(2);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.castShadows).toBe(false);
          expect(command.receiveShadows).toBe(false);
        }

        drawCommand.shadows = ShadowMode.ENABLED;
        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.castShadows).toBe(true);
          expect(command.receiveShadows).toBe(true);
        }
      });

      it("doesn't update shadows for silhouette color command", function () {
        const drawCommand = createModelDrawCommand({
          deriveSilhouette: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(3);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.castShadows).toBe(false);
          expect(command.receiveShadows).toBe(false);
        }

        drawCommand.shadows = ShadowMode.ENABLED;
        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          // Expect shadow updates to be disabled for the
          // silhouette color command.
          const updateShadows = derivedCommand.updateShadows;
          if (!updateShadows) {
            expect(derivedCommand).toBe(drawCommand._silhouetteColorCommand);
          }

          expect(command.castShadows).toBe(updateShadows);
          expect(command.receiveShadows).toBe(updateShadows);
        }
      });

      it("doesn't update shadows for skipLevelOfDetail backface command", function () {
        const drawCommand = createModelDrawCommand({
          deriveSkipLevelOfDetail: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(4);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.castShadows).toBe(false);
          expect(command.receiveShadows).toBe(false);
        }

        drawCommand.shadows = ShadowMode.ENABLED;
        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          // Expect shadow updates to be disabled for the
          // skipLevelOfDetail backface command.
          const updateShadows = derivedCommand.updateShadows;
          if (!updateShadows) {
            expect(derivedCommand).toBe(drawCommand._skipLodBackfaceCommand);
          }

          expect(command.castShadows).toBe(updateShadows);
          expect(command.receiveShadows).toBe(updateShadows);
        }
      });

      it("doesn't update shadows for 2D commands", function () {
        const drawCommand = createModelDrawCommand({
          derive2D: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(4);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.castShadows).toBe(false);
          expect(command.receiveShadows).toBe(false);
        }

        drawCommand.shadows = ShadowMode.ENABLED;
        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          // Expect shadow updates to be disabled for 2D commands.
          const updateShadows = derivedCommand.updateShadows;
          if (!updateShadows) {
            expect(derivedCommand.is2D).toBe(true);
          }

          expect(command.castShadows).toBe(updateShadows);
          expect(command.receiveShadows).toBe(updateShadows);
        }
      });
    });

    describe("back face culling", function () {
      it("updates back face culling for opaque command", function () {
        const drawCommand = createModelDrawCommand();

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(2);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.renderState.cull.enabled).toBe(false);
        }

        drawCommand.backFaceCulling = true;
        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          const updateBackFaceCulling = derivedCommand.updateBackFaceCulling;
          if (!updateBackFaceCulling) {
            expect(derivedCommand).toBe(drawCommand._translucentCommand);
          }

          expect(command.renderState.cull.enabled).toBe(updateBackFaceCulling);
        }
      });

      it("doesn't update back face culling for silhouette-pass command", function () {
        const drawCommand = createModelDrawCommand({
          deriveSilhouette: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(3);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.renderState.cull.enabled).toBe(false);
        }

        drawCommand.backFaceCulling = true;
        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          const updateBackFaceCulling = derivedCommand.updateBackFaceCulling;
          if (!updateBackFaceCulling) {
            expect(derivedCommand).toBe(drawCommand._silhouetteColorCommand);
          }

          expect(command.renderState.cull.enabled).toBe(updateBackFaceCulling);
        }
      });

      it("doesn't update back face culling for skipLevelOfDetail backface command", function () {
        const drawCommand = createModelDrawCommand({
          deriveSkipLevelOfDetail: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(4);

        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          // Backface culling is only enabled for the backface command.
          const backfaceCulling = command.renderState.cull.enabled;
          if (backfaceCulling) {
            expect(derivedCommand).toBe(drawCommand._skipLodBackfaceCommand);
          }
        }

        drawCommand.backFaceCulling = true;
        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          const isBackfaceCommand =
            derivedCommand === drawCommand._skipLodBackfaceCommand;
          const isTranslucentCommand =
            derivedCommand === drawCommand._translucentCommand;

          if (isTranslucentCommand) {
            expect(derivedCommand.updateBackFaceCulling).toBe(false);
            expect(command.renderState.cull.enabled).toBe(false);
          } else if (isBackfaceCommand) {
            expect(derivedCommand.updateBackFaceCulling).toBe(false);
            expect(command.renderState.cull.enabled).toBe(true);
          } else {
            expect(derivedCommand.updateBackFaceCulling).toBe(true);
            expect(command.renderState.cull.enabled).toBe(true);
          }
        }

        drawCommand.backFaceCulling = false;
        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          const isBackfaceCommand =
            derivedCommand === drawCommand._skipLodBackfaceCommand;
          const isTranslucentCommand =
            derivedCommand === drawCommand._translucentCommand;

          if (isTranslucentCommand) {
            expect(derivedCommand.updateBackFaceCulling).toBe(false);
            expect(command.renderState.cull.enabled).toBe(false);
          } else if (isBackfaceCommand) {
            expect(derivedCommand.updateBackFaceCulling).toBe(false);
            expect(command.renderState.cull.enabled).toBe(true);
          } else {
            expect(derivedCommand.updateBackFaceCulling).toBe(true);
            expect(command.renderState.cull.enabled).toBe(false);
          }
        }
      });
    });

    describe("cull face", function () {
      it("updates cull face for opaque command", function () {
        const drawCommand = createModelDrawCommand();

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(2);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.renderState.cull.face).toBe(CullFace.BACK);
        }

        drawCommand.cullFace = CullFace.FRONT;

        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          const updateCullFace = derivedCommand.updateCullFace;
          if (!updateCullFace) {
            expect(derivedCommand).toBe(drawCommand._translucentCommand);
            expect(command.renderState.cull.face).toBe(CullFace.BACK);
          } else {
            expect(command.renderState.cull.face).toBe(CullFace.FRONT);
          }
        }
      });

      it("doesn't update cull face for silhouette command", function () {
        const drawCommand = createModelDrawCommand({
          deriveSilhouette: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(3);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.renderState.cull.face).toBe(CullFace.BACK);
        }

        drawCommand.cullFace = CullFace.FRONT;

        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;

          const updateCullFace = derivedCommand.updateCullFace;
          if (!updateCullFace) {
            expect(derivedCommand).toBe(drawCommand._silhouetteColorCommand);
            expect(command.renderState.cull.face).toBe(CullFace.BACK);
          } else {
            expect(command.renderState.cull.face).toBe(CullFace.FRONT);
          }
        }
      });
    });

    describe("debugShowBoundingVolume", function () {
      it("updates debugShowBoundingVolume", function () {
        const drawCommand = createModelDrawCommand();

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(2);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.debugShowBoundingVolume).toBe(false);
        }

        drawCommand.debugShowBoundingVolume = true;

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.debugShowBoundingVolume).toBe(true);
        }
      });

      it("doesn't update debugShowBoundingVolume for silhouette command", function () {
        const drawCommand = createModelDrawCommand({
          deriveSilhouette: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(3);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.debugShowBoundingVolume).toBe(false);
        }

        drawCommand.debugShowBoundingVolume = true;

        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;
          const updateDebugShowBoundingVolume =
            derivedCommand.updateDebugShowBoundingVolume;
          if (!updateDebugShowBoundingVolume) {
            expect(derivedCommand).toBe(drawCommand._silhouetteColorCommand);
          }

          expect(command.debugShowBoundingVolume).toBe(
            updateDebugShowBoundingVolume
          );
        }
      });

      it("doesn't update debugShowBoundingVolume for skipLevelOfDetail backface command", function () {
        const drawCommand = createModelDrawCommand({
          deriveSkipLevelOfDetail: true,
        });

        const derivedCommands = drawCommand._derivedCommands;
        const length = derivedCommands.length;
        expect(length).toEqual(4);

        for (let i = 0; i < length; i++) {
          const command = derivedCommands[i].command;
          expect(command.debugShowBoundingVolume).toBe(false);
        }

        drawCommand.debugShowBoundingVolume = true;

        for (let i = 0; i < length; i++) {
          const derivedCommand = derivedCommands[i];
          const command = derivedCommand.command;
          const updateDebugShowBoundingVolume =
            derivedCommand.updateDebugShowBoundingVolume;
          if (!updateDebugShowBoundingVolume) {
            expect(derivedCommand).toBe(drawCommand._skipLodBackfaceCommand);
          }

          expect(command.debugShowBoundingVolume).toBe(
            updateDebugShowBoundingVolume
          );
        }
      });
    });
  },
  "WebGL"
);
