import { TranslucentTileClassification } from "../../Source/Cesium.js";
import { ApproximateTerrainHeights } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { ColorGeometryInstanceAttribute } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { destroyObject } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeometryInstance } from "../../Source/Cesium.js";
import { GroundPolylineGeometry } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { RectangleGeometry } from "../../Source/Cesium.js";
import { ClearCommand } from "../../Source/Cesium.js";
import { Framebuffer } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { PixelDatatype } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { ClassificationType } from "../../Source/Cesium.js";
import { GroundPolylinePrimitive } from "../../Source/Cesium.js";
import { PerInstanceColorAppearance } from "../../Source/Cesium.js";
import { Primitive } from "../../Source/Cesium.js";
import { StencilConstants } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

describe(
  "Scene/TranslucentTileClassification",
  function () {
    var scene;
    var context;
    var passState;
    var globeDepthFramebuffer;
    var ellipsoid;

    var positions = Cartesian3.fromDegreesArray([0.01, 0.0, 0.03, 0.0]);

    var lookPosition = Cartesian3.fromDegrees(0.02, 0.0);
    var lookOffset = new Cartesian3(0.0, 0.0, 10.0);
    var translucentPrimitive;
    var groundPolylinePrimitive;

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
      var commandList = frameState.commandList;
      var startLength = commandList.length;
      this._primitive.update(frameState);

      this.commands = [];
      for (var i = startLength; i < commandList.length; ++i) {
        var command = commandList[i];
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

      var renderState = RenderState.fromCache({
        stencilTest: StencilConstants.setCesium3DTileBit(),
        stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
        depthTest: {
          enabled: true,
        },
      });

      var primitive = new Primitive({
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
      var translucentTileClassification = new TranslucentTileClassification({
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
        defined(translucentTileClassification._drawClassificationFBO)
      ).toBe(toBeDefined);
      expect(defined(translucentTileClassification._packFBO)).toBe(toBeDefined);
      expect(
        defined(translucentTileClassification._opaqueDepthStencilTexture)
      ).toBe(toBeDefined);
      expect(defined(translucentTileClassification._colorTexture)).toBe(
        toBeDefined
      );
      expect(
        defined(translucentTileClassification._translucentDepthStencilTexture)
      ).toBe(toBeDefined);
      expect(
        defined(translucentTileClassification._packedTranslucentDepth)
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
      var translucentTileClassification = new TranslucentTileClassification({
        depthTexture: false,
      });

      expectResources(translucentTileClassification, false);

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer
      );

      expectResources(translucentTileClassification, false);

      translucentTileClassification.destroy();
    });

    it("creates resources on demand", function () {
      var translucentTileClassification = new TranslucentTileClassification(
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
        globeDepthFramebuffer
      );

      expectResources(translucentTileClassification, false);

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer
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
      var translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }
      scene.render(); // prep scene

      var packedDepthFBO = translucentTileClassification._packFBO;

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer
      );

      expect(translucentTileClassification.hasTranslucentDepth).toBe(true);

      var postTranslucentPixels = readPixels(packedDepthFBO);
      expect(postTranslucentPixels).not.toEqual([0, 0, 0, 0]);

      translucentTileClassification.destroy();
    });

    it("draws classification commands into a buffer", function () {
      var translucentTileClassification = new TranslucentTileClassification(
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
        globeDepthFramebuffer
      );

      var drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO;
      var preClassifyPixels = readPixels(drawClassificationFBO);

      var frustumCommands = {
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

      var postClassifyPixels = readPixels(drawClassificationFBO);
      expect(postClassifyPixels).not.toEqual(preClassifyPixels);

      translucentTileClassification.destroy();
    });

    it("draws classification commands into a separate accumulation buffer for multifrustum", function () {
      var translucentTileClassification = new TranslucentTileClassification(
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
        globeDepthFramebuffer
      );

      var accumulationFBO = translucentTileClassification._accumulationFBO;
      var drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO;

      var frustumCommands = {
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
        globeDepthFramebuffer
      );
      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      var secondFrustumAccumulation = accumulationFBO;
      var accumulationPixels = readPixels(secondFrustumAccumulation);
      var classificationPixels = readPixels(drawClassificationFBO);
      var expectedPixels = [
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
      var translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }
      scene.render(); // prep scene

      var drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO;

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        [],
        globeDepthFramebuffer
      );

      var preClassifyPixels = readPixels(drawClassificationFBO);

      var frustumCommands = {
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

      var postClassifyPixels = readPixels(drawClassificationFBO);
      expect(postClassifyPixels).toEqual(preClassifyPixels);

      translucentTileClassification.destroy();
    });

    it("composites classification into a buffer", function () {
      var translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      var colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      });

      var targetColorFBO = new Framebuffer({
        context: context,
        colorTextures: [colorTexture],
      });

      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer
      );

      var frustumCommands = {
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

      var preCompositePixels = readPixels(targetColorFBO);
      var pixelsToComposite = readPixels(
        translucentTileClassification._drawClassificationFBO
      );

      var framebuffer = passState.framebuffer;
      passState.framebuffer = targetColorFBO;
      translucentTileClassification.execute(scene, passState);
      passState.framebuffer = framebuffer;

      var postCompositePixels = readPixels(targetColorFBO);
      expect(postCompositePixels).not.toEqual(preCompositePixels);

      var red = Math.round(pixelsToComposite[0]) + preCompositePixels[0];
      var green = Math.round(pixelsToComposite[1]) + preCompositePixels[1];
      var blue = Math.round(pixelsToComposite[2]) + preCompositePixels[2];
      var alpha = pixelsToComposite[3] + preCompositePixels[3];

      expect(postCompositePixels[0]).toEqual(red);
      expect(postCompositePixels[1]).toEqual(green);
      expect(postCompositePixels[2]).toEqual(blue);
      expect(postCompositePixels[3]).toEqual(alpha);

      translucentTileClassification.destroy();
      targetColorFBO.destroy();
    });

    it("composites from an accumulation texture when there are multiple frustums", function () {
      var translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      var clearCommandRed = new ClearCommand({
        color: new Color(1.0, 0.0, 0.0, 1.0),
      });

      var clearCommandGreen = new ClearCommand({
        color: new Color(0.0, 1.0, 0.0, 1.0),
      });

      var colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      });

      var targetColorFBO = new Framebuffer({
        context: context,
        colorTextures: [colorTexture],
      });

      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        translucentPrimitive.commands,
        globeDepthFramebuffer
      );

      var frustumCommands = {
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
        globeDepthFramebuffer
      );

      translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );

      var framebuffer = passState.framebuffer;

      // Replace classification and accumulation colors to distinguish which is composited
      passState.framebuffer =
        translucentTileClassification._drawClassificationFBO;
      clearCommandRed.execute(context, passState);
      passState.framebuffer = translucentTileClassification._accumulationFBO;
      clearCommandGreen.execute(context, passState);

      passState.framebuffer = targetColorFBO;
      translucentTileClassification.execute(scene, passState);
      passState.framebuffer = framebuffer;

      var postCompositePixels = readPixels(targetColorFBO);
      expect(postCompositePixels).toEqual([0, 255, 0, 255]);

      translucentTileClassification.destroy();
      targetColorFBO.destroy();
    });

    it("does not composite classification if there is no translucent depth", function () {
      var translucentTileClassification = new TranslucentTileClassification(
        context
      );
      if (!translucentTileClassification.isSupported()) {
        return; // don't fail because of lack of support
      }

      var colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      });

      var targetColorFBO = new Framebuffer({
        context: context,
        colorTextures: [colorTexture],
      });

      scene.render(); // prep scene

      translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        [],
        globeDepthFramebuffer
      );

      var frustumCommands = {
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

      var preCompositePixels = readPixels(targetColorFBO);

      var framebuffer = passState.framebuffer;
      passState.framebuffer = targetColorFBO;
      translucentTileClassification.execute(scene, passState);
      passState.framebuffer = framebuffer;

      var postCompositePixels = readPixels(targetColorFBO);
      expect(postCompositePixels).toEqual(preCompositePixels);

      translucentTileClassification.destroy();
      targetColorFBO.destroy();
    });

    it("clears the classification buffer", function () {
      var translucentTileClassification = new TranslucentTileClassification(
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
        globeDepthFramebuffer
      );

      var drawClassificationFBO =
        translucentTileClassification._drawClassificationFBO;
      var preClassifyPixels = readPixels(drawClassificationFBO);

      var frustumCommands = {
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

      var postClassifyPixels = readPixels(drawClassificationFBO);
      expect(postClassifyPixels).not.toEqual(preClassifyPixels);

      translucentTileClassification.execute(scene, passState);

      var postClearPixels = readPixels(drawClassificationFBO);
      expect(postClearPixels).not.toEqual(postClassifyPixels);
      expect(postClearPixels).toEqual(preClassifyPixels);

      translucentTileClassification.destroy();
    });

    it("does not clear the classification buffer if there is no translucent depth", function () {
      var translucentTileClassification = new TranslucentTileClassification(
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
