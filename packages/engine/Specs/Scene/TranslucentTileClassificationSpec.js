import {
  TranslucentTileClassification,
  ApproximateTerrainHeights,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  defined,
  destroyObject,
  Ellipsoid,
  GeometryInstance,
  GroundPolylineGeometry,
  PixelFormat,
  Rectangle,
  RectangleGeometry,
  ClearCommand,
  Framebuffer,
  Pass,
  PixelDatatype,
  RenderState,
  Texture,
  ClassificationType,
  GroundPolylinePrimitive,
  PerInstanceColorAppearance,
  Primitive,
  StencilConstants,
} from "../../../Source/Cesium.js";

import createScene from "../createScene.js";

describe(
  "Scene/TranslucentTileClassification",
  function () {
    let scene;
    let context;
    let passState;
    let globeDepthFramebuffer;
    let ellipsoid;

    const positions = Cartesian3.fromDegreesArray([0.01, 0.0, 0.03, 0.0]);

    const lookPosition = Cartesian3.fromDegrees(0.02, 0.0);
    const lookOffset = new Cartesian3(0.0, 0.0, 10.0);
    let translucentPrimitive;
    let groundPolylinePrimitive;

    beforeAll(function () {
      scene = createScene();
      scene.postProcessStages.fxaa.enabled = false;
      scene.render(); // generate globeDepth.framebuffer

      context = scene.context;
      passState = scene._defaultView.passState;
      if (defined(scene._defaultView.globeDepth)) {
        globeDepthFramebuffer = scene._defaultView.globeDepth.framebuffer;
      }

      ellipsoid = Ellipsoid.WGS84;
      return GroundPolylinePrimitive.initializeTerrainHeights();
    });

    afterAll(function () {
      scene.destroyForSpecs();

      // Leave ground primitive uninitialized
      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function SpecPrimitive(primitive, pass) {
      this._primitive = primitive;
      this._depthForTranslucentClassification = pass === Pass.TRANSLUCENT;
      this._pass = pass;
      this.commands = [];
    }

    SpecPrimitive.prototype.update = function (frameState) {
      const commandList = frameState.commandList;
      const startLength = commandList.length;
      this._primitive.update(frameState);

      this.commands = [];
      for (let i = startLength; i < commandList.length; ++i) {
        const command = commandList[i];
        command.pass = this._pass;
        command.depthForTranslucentClassification = this._depthForTranslucentClassification;
        this.commands.push(command);
      }
    };

    SpecPrimitive.prototype.isDestroyed = function () {
      return false;
    };

    SpecPrimitive.prototype.destroy = function () {
      this._primitive.destroy();
      return destroyObject(this);
    };

    beforeEach(function () {
      scene.morphTo3D(0);
      scene.render(); // clear any afterRender commands
      scene.camera.lookAt(lookPosition, lookOffset);

      const renderState = RenderState.fromCache({
        stencilTest: StencilConstants.setCesium3DTileBit(),
        stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
        depthTest: {
          enabled: true,
        },
      });

      let primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            ellipsoid: ellipsoid,
            rectangle: Rectangle.fromDegrees(-0.1, -0.1, 0.1, 0.1),
            height: 1.0,
          }),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(
              new Color(0.0, 0.0, 1.0, 0.5)
            ),
          },
        }),
        appearance: new PerInstanceColorAppearance({
          translucent: true,
          flat: true,
          renderState: renderState,
        }),
        asynchronous: false,
      });

      translucentPrimitive = new SpecPrimitive(primitive, Pass.TRANSLUCENT);
      scene.primitives.add(translucentPrimitive);

      primitive = new GroundPolylinePrimitive({
        geometryInstances: new GeometryInstance({
          geometry: new GroundPolylineGeometry({
            positions: positions,
            granularity: 0.0,
            width: 1.0,
            loop: false,
            ellipsoid: ellipsoid,
          }),
        }),
        asynchronous: false,
        classificationType: ClassificationType.CESIUM_3D_TILE,
      });

      groundPolylinePrimitive = new SpecPrimitive(
        primitive,
        Pass.CESIUM_3D_TILE_CLASSIFICATION
      );
      scene.groundPrimitives.add(groundPolylinePrimitive);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      scene.groundPrimitives.removeAll();

      translucentPrimitive =
        translucentPrimitive &&
        !translucentPrimitive.isDestroyed() &&
        translucentPrimitive.destroy();

      groundPolylinePrimitive =
        groundPolylinePrimitive &&
        !groundPolylinePrimitive.isDestroyed() &&
        groundPolylinePrimitive.destroy();
    });

    it("checks for support in the context on construction", function () {
      let translucentTileClassification = new TranslucentTileClassification({
        depthTexture: true,
      });

      expect(translucentTileClassification.isSupported()).toBe(true);
      translucentTileClassification.destroy();

      translucentTileClassification = new TranslucentTileClassification({
        depthTexture: false,
      });
      expect(translucentTileClassification.isSupported()).toBe(false);
      translucentTileClassification.destroy();
    });

    function expectResources(translucentTileClassification, toBeDefined) {
      expect(
        defined(
          translucentTileClassification._drawClassificationFBO.framebuffer
        )
      ).toBe(toBeDefined);
      expect(defined(translucentTileClassification._packFBO.framebuffer)).toBe(
        toBeDefined
      );
      expect(
        defined(translucentTileClassification._opaqueDepthStencilTexture)
      ).toBe(toBeDefined);
      expect(
        defined(
          translucentTileClassification._drawClassificationFBO.getColorTexture()
        )
      ).toBe(toBeDefined);
      expect(
        defined(translucentTileClassification._translucentDepthStencilTexture)
      ).toBe(toBeDefined);
      expect(
        defined(translucentTileClassification._packFBO.getColorTexture())
      ).toBe(toBeDefined);
      expect(defined(translucentTileClassification._packDepthCommand)).toBe(
        toBeDefined
      );
      expect(defined(translucentTileClassification._accumulateCommand)).toBe(
        toBeDefined
      );
      expect(defined(translucentTileClassification._compositeCommand)).toBe(
        toBeDefined
      );
      expect(defined(translucentTileClassification._copyCommand)).toBe(
        toBeDefined
      );
    }

    it("does not create resources if unsupported", function () {
      const translucentTileClassification = new TranslucentTileClassification({
        depthTexture: false,
      });

      expectResources(translucentTileClassification, false);

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        undefined
      );

      expectResources(translucentTileClassification, false);

      translucentTileClassification.destroy();
    });

    it("creates resources on demand", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      scene.render(); // prep scene

      expectResources(translucentTileClassification, false);

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        [],
        globeDepthFramebuffer.depthStencilTexture
      );

      expectResources(translucentTileClassification, false);

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      expectResources(translucentTileClassification, true);

      translucentTileClassification.destroy();
    });

    function readPixels(fbo) {
      return context.readPixels({
        framebuffer: fbo,
      });
    }

    function executeCommand(command, scene, context, passState) {
      command.execute(context, passState);
    }

    it("draws translucent commands into a buffer for depth", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }
      scene.render(); // prep scene

      const packedDepthFBO = translucentTileClassification._packFBO.framebuffer;

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      expect(translucentTileClassification.hasTranslucentDepth).toBe(true);

      const postTranslucentPixels = readPixels(packedDepthFBO);
      expect(postTranslucentPixels).not.toEqual([0, 0, 0, 0]);

      translucentTileClassification.destroy();
    });

    it("draws classification commands into a buffer", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }
      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      const drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO.framebuffer;
      const preClassifyPixels = readPixels(drawClassificationFBO);

      const frustumCommands = {
        commands: [],
        indices: [],
      };
      frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION] =
        groundPolylinePrimitive.commands;
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] = [1];

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      const postClassifyPixels = readPixels(drawClassificationFBO);
      expect(postClassifyPixels).not.toEqual(preClassifyPixels);

      translucentTileClassification.destroy();
    });

    it("draws classification commands into a separate accumulation buffer for multifrustum", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }
      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      const accumulationFBO =
        translucentTileClassification._accumulationFBO.framebuffer;
      const drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO.framebuffer;

      const frustumCommands = {
        commands: [],
        indices: [],
      };
      frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION] =
        groundPolylinePrimitive.commands;
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] = [1];

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      expect(readPixels(accumulationFBO)).toEqual([0, 0, 0, 0]);

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );
      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      const secondFrustumAccumulation = accumulationFBO;
      const accumulationPixels = readPixels(secondFrustumAccumulation);
      const classificationPixels = readPixels(drawClassificationFBO);
      const expectedPixels = [
        // Multiply by two to account for premultiplied alpha
        classificationPixels[0] * 2,
        classificationPixels[1] * 2,
        classificationPixels[2] * 2,
        classificationPixels[3],
      ];

      expect(accumulationPixels).not.toEqual([0, 0, 0, 0]);
      expect(accumulationPixels).toEqualEpsilon(expectedPixels, 1);

      translucentTileClassification.destroy();
    });

    it("does not draw classification commands if there is no translucent depth", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }
      scene.render(); // prep scene

      const drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO.framebuffer;

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        [],
        globeDepthFramebuffer.depthStencilTexture
      );

      const preClassifyPixels = readPixels(drawClassificationFBO);

      const frustumCommands = {
        commands: [],
        indices: [],
      };
      frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION] =
        groundPolylinePrimitive.commands;
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] = [1];

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      const postClassifyPixels = readPixels(drawClassificationFBO);
      expect(postClassifyPixels).toEqual(preClassifyPixels);

      translucentTileClassification.destroy();
    });

    it("composites classification into a buffer", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      const colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      });

      const targetColorFBO = new Framebuffer({
        context: context,
        colorTextures: [colorTexture],
      });

      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      const frustumCommands = {
        commands: [],
        indices: [],
      };
      frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION] =
        groundPolylinePrimitive.commands;
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] = [1];

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      const preCompositePixels = readPixels(targetColorFBO);
      const pixelsToComposite = readPixels(
        translucentTileClassification._drawClassificationFBO.framebuffer
      );

      const framebuffer = passState.framebuffer;
      passState.framebuffer = targetColorFBO;
      translucentTileClassification.execute(scene, passState);
      passState.framebuffer = framebuffer;

      const postCompositePixels = readPixels(targetColorFBO);
      expect(postCompositePixels).not.toEqual(preCompositePixels);

      const red = Math.round(pixelsToComposite[0]) + preCompositePixels[0];
      const green = Math.round(pixelsToComposite[1]) + preCompositePixels[1];
      const blue = Math.round(pixelsToComposite[2]) + preCompositePixels[2];
      const alpha = pixelsToComposite[3] + preCompositePixels[3];

      expect(postCompositePixels[0]).toEqual(red);
      expect(postCompositePixels[1]).toEqual(green);
      expect(postCompositePixels[2]).toEqual(blue);
      expect(postCompositePixels[3]).toEqual(alpha);

      translucentTileClassification.destroy();
      targetColorFBO.destroy();
    });

    it("composites from an accumulation texture when there are multiple frustums", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      const clearCommandRed = new ClearCommand({
        color: new Color(1.0, 0.0, 0.0, 1.0),
      });

      const clearCommandGreen = new ClearCommand({
        color: new Color(0.0, 1.0, 0.0, 1.0),
      });

      const colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      });

      const targetColorFBO = new Framebuffer({
        context: context,
        colorTextures: [colorTexture],
      });

      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      const frustumCommands = {
        commands: [],
        indices: [],
      };

      // First Frustum
      frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION] =
        groundPolylinePrimitive.commands;
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] = [1];

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      // Second Frustum
      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      const framebuffer = passState.framebuffer;

      // Replace classification and accumulation colors to distinguish which is composited
      passState.framebuffer =
        translucentTileClassification._drawClassificationFBO.framebuffer;
      clearCommandRed.execute(context, passState);
      passState.framebuffer =
        translucentTileClassification._accumulationFBO.framebuffer;
      clearCommandGreen.execute(context, passState);

      passState.framebuffer = targetColorFBO;
      translucentTileClassification.execute(scene, passState);
      passState.framebuffer = framebuffer;

      const postCompositePixels = readPixels(targetColorFBO);
      expect(postCompositePixels).toEqual([0, 255, 0, 255]);

      translucentTileClassification.destroy();
      targetColorFBO.destroy();
    });

    it("does not composite classification if there is no translucent depth", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      const colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      });

      const targetColorFBO = new Framebuffer({
        context: context,
        colorTextures: [colorTexture],
      });

      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        [],
        globeDepthFramebuffer.depthStencilTexture
      );

      const frustumCommands = {
        commands: [],
        indices: [],
      };
      frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION] =
        groundPolylinePrimitive.commands;
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] = [1];

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      const preCompositePixels = readPixels(targetColorFBO);

      const framebuffer = passState.framebuffer;
      passState.framebuffer = targetColorFBO;
      translucentTileClassification.execute(scene, passState);
      passState.framebuffer = framebuffer;

      const postCompositePixels = readPixels(targetColorFBO);
      expect(postCompositePixels).toEqual(preCompositePixels);

      translucentTileClassification.destroy();
      targetColorFBO.destroy();
    });

    it("clears the classification buffer", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }
      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer.depthStencilTexture
      );

      const drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO.framebuffer;
      const preClassifyPixels = readPixels(drawClassificationFBO);

      const frustumCommands = {
        commands: [],
        indices: [],
      };
      frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION] =
        groundPolylinePrimitive.commands;
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] = [1];

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      const postClassifyPixels = readPixels(drawClassificationFBO);
      expect(postClassifyPixels).not.toEqual(preClassifyPixels);

      translucentTileClassification.execute(scene, passState);

      const postClearPixels = readPixels(drawClassificationFBO);
      expect(postClearPixels).not.toEqual(postClassifyPixels);
      expect(postClearPixels).toEqual(preClassifyPixels);

      translucentTileClassification.destroy();
    });

    it("does not clear the classification buffer if there is no translucent depth", function () {
      const translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      spyOn(translucentTileClassification._clearColorCommand, "execute");

      translucentTileClassification.execute(scene, passState);

      expect(
        translucentTileClassification._clearColorCommand.execute
      ).not.toHaveBeenCalled();
      translucentTileClassification.destroy();
    });
  },
  "WebGL"
);
