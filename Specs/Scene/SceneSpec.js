import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { GeometryInstance } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { RectangleGeometry } from "../../Source/Cesium.js";
import { RequestScheduler } from "../../Source/Cesium.js";
import { RuntimeError } from "../../Source/Cesium.js";
import { TaskProcessor } from "../../Source/Cesium.js";
import { WebGLConstants } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";
import { DrawCommand } from "../../Source/Cesium.js";
import { Framebuffer } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { PixelDatatype } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { ShaderProgram } from "../../Source/Cesium.js";
import { ShaderSource } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { Camera } from "../../Source/Cesium.js";
import { DirectionalLight } from "../../Source/Cesium.js";
import { EllipsoidSurfaceAppearance } from "../../Source/Cesium.js";
import { FrameState } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import { Material } from "../../Source/Cesium.js";
import { Primitive } from "../../Source/Cesium.js";
import { PrimitiveCollection } from "../../Source/Cesium.js";
import { Scene } from "../../Source/Cesium.js";
import { SceneTransforms } from "../../Source/Cesium.js";
import { ScreenSpaceCameraController } from "../../Source/Cesium.js";
import { SunLight } from "../../Source/Cesium.js";
import { TweenCollection } from "../../Source/Cesium.js";
import { Sun } from "../../Source/Cesium.js";
import { GroundPrimitive } from "../../Source/Cesium.js";
import { PerInstanceColorAppearance } from "../../Source/Cesium.js";
import { ColorGeometryInstanceAttribute } from "../../Source/Cesium.js";
import createCanvas from "../createCanvas.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";
import render from "../render.js";

describe(
  "Scene/Scene",
  function () {
    let scene;
    let simpleShaderProgram;
    let simpleRenderState;

    beforeAll(function () {
      scene = createScene();
      simpleShaderProgram = ShaderProgram.fromCache({
        context: scene.context,
        vertexShaderSource: new ShaderSource({
          sources: ["void main() { gl_Position = vec4(1.0); }"],
        }),
        fragmentShaderSource: new ShaderSource({
          sources: ["void main() { gl_FragColor = vec4(1.0); }"],
        }),
      });
      simpleRenderState = new RenderState();

      return GroundPrimitive.initializeTerrainHeights();
    });

    afterEach(function () {
      scene.backgroundColor = new Color(0.0, 0.0, 0.0, 0.0);
      scene.debugCommandFilter = undefined;
      scene.postProcessStages.fxaa.enabled = false;
      scene.primitives.removeAll();
      scene.morphTo3D(0.0);

      const camera = scene.camera;
      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function createRectangle(rectangle, height) {
      return new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            rectangle: rectangle,
            vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            height: height,
          }),
        }),
        appearance: new EllipsoidSurfaceAppearance({
          aboveGround: false,
        }),
        asynchronous: false,
      });
    }

    it("constructor has expected defaults", function () {
      expect(scene.canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(scene.primitives).toBeInstanceOf(PrimitiveCollection);
      expect(scene.camera).toBeInstanceOf(Camera);
      expect(scene.screenSpaceCameraController).toBeInstanceOf(
        ScreenSpaceCameraController
      );
      expect(scene.mapProjection).toBeInstanceOf(GeographicProjection);
      expect(scene.frameState).toBeInstanceOf(FrameState);
      expect(scene.tweens).toBeInstanceOf(TweenCollection);

      const contextAttributes = scene.context._gl.getContextAttributes();
      // Do not check depth and antialias since they are requests not requirements
      expect(contextAttributes.alpha).toEqual(false);
      expect(contextAttributes.stencil).toEqual(true);
      expect(contextAttributes.premultipliedAlpha).toEqual(true);
      expect(contextAttributes.preserveDrawingBuffer).toEqual(false);
      expect(scene._depthPlane._ellipsoidOffset).toEqual(0);
    });

    it("constructor sets options", function () {
      const webglOptions = {
        alpha: true,
        depth: true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
        stencil: true,
        antialias: false,
        premultipliedAlpha: true, // Workaround IE 11.0.8, which does not honor false.
        preserveDrawingBuffer: true,
      };
      const mapProjection = new WebMercatorProjection();

      const s = createScene({
        contextOptions: {
          webgl: webglOptions,
        },
        mapProjection: mapProjection,
        depthPlaneEllipsoidOffset: Number.POSITIVE_INFINITY,
      });

      const contextAttributes = s.context._gl.getContextAttributes();
      expect(contextAttributes.alpha).toEqual(webglOptions.alpha);
      expect(contextAttributes.depth).toEqual(webglOptions.depth);
      expect(contextAttributes.stencil).toEqual(webglOptions.stencil);
      expect(contextAttributes.antialias).toEqual(webglOptions.antialias);
      expect(contextAttributes.premultipliedAlpha).toEqual(
        webglOptions.premultipliedAlpha
      );
      expect(contextAttributes.preserveDrawingBuffer).toEqual(
        webglOptions.preserveDrawingBuffer
      );
      expect(s.mapProjection).toEqual(mapProjection);
      expect(s._depthPlane._ellipsoidOffset).toEqual(Number.POSITIVE_INFINITY);

      s.destroyForSpecs();
    });

    it("constructor throws without options", function () {
      expect(function () {
        return new Scene();
      }).toThrowDeveloperError();
    });

    it("constructor throws without options.canvas", function () {
      expect(function () {
        return new Scene({});
      }).toThrowDeveloperError();
    });

    it("draws background color", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.backgroundColor = Color.BLUE;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("calls afterRender functions", function () {
      const spyListener = jasmine.createSpy("listener");

      const primitive = {
        update: function (frameState) {
          frameState.afterRender.push(spyListener);
        },
        destroy: function () {},
      };
      scene.primitives.add(primitive);

      scene.renderForSpecs();
      expect(spyListener).toHaveBeenCalled();
    });

    function CommandMockPrimitive(command) {
      this.update = function (frameState) {
        frameState.commandList.push(command);
      };
      this.destroy = function () {};
    }

    it("debugCommandFilter filters commands", function () {
      const c = new DrawCommand({
        shaderProgram: simpleShaderProgram,
        renderState: simpleRenderState,
        pass: Pass.OPAQUE,
      });
      c.execute = function () {};
      spyOn(c, "execute");

      scene.primitives.add(new CommandMockPrimitive(c));

      scene.debugCommandFilter = function (command) {
        return command !== c; // Do not execute command
      };

      scene.renderForSpecs();
      expect(c.execute).not.toHaveBeenCalled();
    });

    it("debugCommandFilter does not filter commands", function () {
      const originalLogDepth = scene.logarithmicDepthBuffer;
      scene.logarithmicDepthBuffer = false;

      const c = new DrawCommand({
        shaderProgram: simpleShaderProgram,
        renderState: simpleRenderState,
        pass: Pass.OPAQUE,
      });
      c.execute = function () {};
      spyOn(c, "execute");

      scene.primitives.add(new CommandMockPrimitive(c));

      expect(scene.debugCommandFilter).toBeUndefined();
      scene.renderForSpecs();
      expect(c.execute).toHaveBeenCalled();

      scene.logarithmicDepthBuffer = originalLogDepth;
    });

    it("debugShowBoundingVolume draws a bounding sphere", function () {
      const originalLogDepth = scene.logarithmicDepthBuffer;
      scene.logarithmicDepthBuffer = false;

      const radius = 10.0;
      const center = Cartesian3.add(
        scene.camera.position,
        scene.camera.direction,
        new Cartesian3()
      );

      const c = new DrawCommand({
        shaderProgram: simpleShaderProgram,
        renderState: simpleRenderState,
        pass: Pass.OPAQUE,
        debugShowBoundingVolume: true,
        boundingVolume: new BoundingSphere(center, radius),
      });
      c.execute = function () {};

      scene.primitives.add(new CommandMockPrimitive(c));
      scene.depthTestAgainstTerrain = true;

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0); // Red bounding sphere
      });

      scene.logarithmicDepthBuffer = originalLogDepth;
    });

    it("debugShowCommands tints commands", function () {
      const originalLogDepth = scene.logarithmicDepthBuffer;
      scene.logarithmicDepthBuffer = false;

      const c = new DrawCommand({
        shaderProgram: simpleShaderProgram,
        renderState: simpleRenderState,
        pass: Pass.OPAQUE,
      });
      c.execute = function () {};

      const originalShallowClone = DrawCommand.shallowClone;
      spyOn(DrawCommand, "shallowClone").and.callFake(function (
        command,
        result
      ) {
        result = originalShallowClone(command, result);
        result.execute = function () {
          result.uniformMap.debugShowCommandsColor();
        };
        return result;
      });

      scene.primitives.add(new CommandMockPrimitive(c));

      scene.debugShowCommands = true;
      scene.renderForSpecs();
      expect(c._debugColor).toBeDefined();
      scene.debugShowCommands = false;

      scene.logarithmicDepthBuffer = originalLogDepth;
    });

    it("debugShowFramesPerSecond", function () {
      scene.debugShowFramesPerSecond = true;
      scene.renderForSpecs();
      expect(scene._performanceDisplay).toBeDefined();
      scene.debugShowFramesPerSecond = false;
    });

    it("opaque/translucent render order (1)", function () {
      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

      const rectanglePrimitive1 = createRectangle(rectangle);
      rectanglePrimitive1.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        1.0
      );

      const rectanglePrimitive2 = createRectangle(rectangle, 1000.0);
      rectanglePrimitive2.appearance.material.uniforms.color = new Color(
        0.0,
        1.0,
        0.0,
        0.5
      );

      const primitives = scene.primitives;
      primitives.add(rectanglePrimitive1);
      primitives.add(rectanglePrimitive2);

      scene.camera.setView({ destination: rectangle });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).not.toEqual(0);
        expect(rgba[2]).toEqual(0);
      });

      primitives.raiseToTop(rectanglePrimitive1);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).not.toEqual(0);
        expect(rgba[2]).toEqual(0);
      });
    });

    it("opaque/translucent render order (2)", function () {
      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

      const rectanglePrimitive1 = createRectangle(rectangle, 1000.0);
      rectanglePrimitive1.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        1.0
      );

      const rectanglePrimitive2 = createRectangle(rectangle);
      rectanglePrimitive2.appearance.material.uniforms.color = new Color(
        0.0,
        1.0,
        0.0,
        0.5
      );

      const primitives = scene.primitives;
      primitives.add(rectanglePrimitive1);
      primitives.add(rectanglePrimitive2);

      scene.camera.setView({ destination: rectangle });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });

      primitives.raiseToTop(rectanglePrimitive1);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });
    });

    it("renders with OIT and without FXAA", function () {
      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

      const rectanglePrimitive = createRectangle(rectangle, 1000.0);
      rectanglePrimitive.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        0.5
      );

      const primitives = scene.primitives;
      primitives.add(rectanglePrimitive);

      scene.camera.setView({ destination: rectangle });
      scene.postProcessStages.fxaa.enabled = false;
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });
    });

    it("renders with forced FXAA", function () {
      const context = scene.context;

      // Workaround for Firefox on Mac, which does not support RGBA + depth texture
      // attachments, which is allowed by the spec.
      if (context.depthTexture) {
        const framebuffer = new Framebuffer({
          context: context,
          colorTextures: [
            new Texture({
              context: context,
              width: 1,
              height: 1,
              pixelFormat: PixelFormat.RGBA,
              pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
            }),
          ],
          depthTexture: new Texture({
            context: context,
            width: 1,
            height: 1,
            pixelFormat: PixelFormat.DEPTH_COMPONENT,
            pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
          }),
        });

        const status = framebuffer.status;
        framebuffer.destroy();

        if (status !== WebGLConstants.FRAMEBUFFER_COMPLETE) {
          return;
        }
      }

      const s = createScene();

      if (defined(s._oit)) {
        s._oit._translucentMRTSupport = false;
        s._oit._translucentMultipassSupport = false;
      }

      s.postProcessStages.fxaa.enabled = false;

      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

      const rectanglePrimitive = createRectangle(rectangle, 1000.0);
      rectanglePrimitive.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        1.0
      );

      const primitives = s.primitives;
      primitives.add(rectanglePrimitive);

      s.camera.setView({ destination: rectangle });

      expect(s).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });

      s.destroyForSpecs();
    });

    it("setting a globe", function () {
      const scene = createScene();
      const ellipsoid = Ellipsoid.UNIT_SPHERE;
      const globe = new Globe(ellipsoid);
      scene.globe = globe;

      expect(scene.globe).toBe(globe);

      scene.destroyForSpecs();
    });

    it("destroys primitive on set globe", function () {
      const scene = createScene();
      const globe = new Globe(Ellipsoid.UNIT_SPHERE);

      scene.globe = globe;
      expect(globe.isDestroyed()).toEqual(false);

      scene.globe = undefined;
      expect(globe.isDestroyed()).toEqual(true);

      scene.destroyForSpecs();
    });

    describe("render tests", function () {
      let s;

      beforeEach(function () {
        s = createScene();
      });

      afterEach(function () {
        s.destroyForSpecs();
      });

      it("renders a globe", function () {
        s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
        s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        s.camera.direction = Cartesian3.negate(
          Cartesian3.normalize(s.camera.position, new Cartesian3()),
          new Cartesian3()
        );

        // To avoid Jasmine's spec has no expectations error
        expect(true).toEqual(true);

        return expect(s).toRenderAndCall(function () {
          return pollToPromise(function () {
            render(s.frameState, s.globe);
            return !jasmine.matchersUtil.equals(s._context.readPixels(), [
              0,
              0,
              0,
              0,
            ]);
          });
        });
      });

      it("renders a globe with an ElevationContour", function () {
        s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        s.globe.material = Material.fromType("ElevationContour");
        s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
        s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        s.camera.direction = Cartesian3.negate(
          Cartesian3.normalize(s.camera.position, new Cartesian3()),
          new Cartesian3()
        );

        // To avoid Jasmine's spec has no expectations error
        expect(true).toEqual(true);

        return expect(s).toRenderAndCall(function () {
          return pollToPromise(function () {
            render(s.frameState, s.globe);
            return !jasmine.matchersUtil.equals(s._context.readPixels(), [
              0,
              0,
              0,
              0,
            ]);
          });
        });
      });

      it("renders a globe with a SlopeRamp", function () {
        s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        s.globe.material = Material.fromType("SlopeRamp");
        s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
        s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        s.camera.direction = Cartesian3.negate(
          Cartesian3.normalize(s.camera.position, new Cartesian3()),
          new Cartesian3()
        );

        // To avoid Jasmine's spec has no expectations error
        expect(true).toEqual(true);

        return expect(s).toRenderAndCall(function () {
          return pollToPromise(function () {
            render(s.frameState, s.globe);
            return !jasmine.matchersUtil.equals(s._context.readPixels(), [
              0,
              0,
              0,
              0,
            ]);
          });
        });
      });

      it("renders a globe with AspectRamp", function () {
        s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        s.globe.material = Material.fromType("AspectRamp");
        s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
        s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        s.camera.direction = Cartesian3.negate(
          Cartesian3.normalize(s.camera.position, new Cartesian3()),
          new Cartesian3()
        );

        // To avoid Jasmine's spec has no expectations error
        expect(true).toEqual(true);

        return expect(s).toRenderAndCall(function () {
          return pollToPromise(function () {
            render(s.frameState, s.globe);
            return !jasmine.matchersUtil.equals(s._context.readPixels(), [
              0,
              0,
              0,
              0,
            ]);
          });
        });
      });

      it("renders a globe with a ElevationRamp", function () {
        s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        s.globe.material = Material.fromType("ElevationRamp");
        s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
        s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        s.camera.direction = Cartesian3.negate(
          Cartesian3.normalize(s.camera.position, new Cartesian3()),
          new Cartesian3()
        );

        // To avoid Jasmine's spec has no expectations error
        expect(true).toEqual(true);

        return expect(s).toRenderAndCall(function () {
          return pollToPromise(function () {
            render(s.frameState, s.globe);
            return !jasmine.matchersUtil.equals(s._context.readPixels(), [
              0,
              0,
              0,
              0,
            ]);
          });
        });
      });

      it("renders a globe with an ElevationBand", function () {
        s.globe = new Globe(Ellipsoid.UNIT_SPHERE);
        s.globe.material = Material.fromType("ElevationBand");
        s.camera.position = new Cartesian3(1.02, 0.0, 0.0);
        s.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
        s.camera.direction = Cartesian3.negate(
          Cartesian3.normalize(s.camera.position, new Cartesian3()),
          new Cartesian3()
        );

        // To avoid Jasmine's spec has no expectations error
        expect(true).toEqual(true);

        return expect(s).toRenderAndCall(function () {
          return pollToPromise(function () {
            render(s.frameState, s.globe);
            return !jasmine.matchersUtil.equals(s._context.readPixels(), [
              0,
              0,
              0,
              0,
            ]);
          });
        });
      });
    });

    it("renders with multipass OIT if MRT is available", function () {
      if (scene.context.drawBuffers) {
        const s = createScene();
        if (defined(s._oit)) {
          s._oit._translucentMRTSupport = false;
          s._oit._translucentMultipassSupport = true;

          const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

          const rectanglePrimitive = createRectangle(rectangle, 1000.0);
          rectanglePrimitive.appearance.material.uniforms.color = new Color(
            1.0,
            0.0,
            0.0,
            0.5
          );

          const primitives = s.primitives;
          primitives.add(rectanglePrimitive);

          s.camera.setView({ destination: rectangle });

          expect(s).toRenderAndCall(function (rgba) {
            expect(rgba[0]).not.toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
          });
        }

        s.destroyForSpecs();
      }
    });

    it("renders with alpha blending if floating point textures are available", function () {
      if (!scene.context.floatingPointTexture) {
        return;
      }
      const s = createScene();
      if (defined(s._oit)) {
        s._oit._translucentMRTSupport = false;
        s._oit._translucentMultipassSupport = false;

        const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        const rectanglePrimitive = createRectangle(rectangle, 1000.0);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          0.5
        );

        const primitives = s.primitives;
        primitives.add(rectanglePrimitive);

        s.camera.setView({ destination: rectangle });

        expect(s).toRenderAndCall(function (rgba) {
          expect(rgba[0]).not.toEqual(0);
          expect(rgba[1]).toEqual(0);
          expect(rgba[2]).toEqual(0);
        });
      }
      s.destroyForSpecs();
    });

    it("renders map twice when in 2D", function () {
      scene.morphTo2D(0.0);

      const rectangle = Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0);

      const rectanglePrimitive1 = createRectangle(rectangle, 0.0);
      rectanglePrimitive1.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        1.0
      );

      const primitives = scene.primitives;
      primitives.add(rectanglePrimitive1);

      scene.camera.setView({
        destination: new Cartesian3(
          Ellipsoid.WGS84.maximumRadius * Math.PI + 10000.0,
          0.0,
          10.0
        ),
        convert: false,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });
    });

    it("renders map when the camera is on the IDL in 2D", function () {
      const s = createScene({
        canvas: createCanvas(5, 5),
      });
      s.morphTo2D(0.0);

      const rectangle = Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0);

      const rectanglePrimitive1 = createRectangle(rectangle, 0.0);
      rectanglePrimitive1.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        1.0
      );

      const primitives = s.primitives;
      primitives.add(rectanglePrimitive1);

      s.camera.setView({
        destination: new Cartesian3(
          Ellipsoid.WGS84.maximumRadius * Math.PI,
          0.0,
          10.0
        ),
        convert: false,
      });

      expect(s).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });

      s.destroyForSpecs();
    });

    it("renders with HDR when available", function () {
      if (!scene.highDynamicRangeSupported) {
        return;
      }

      const s = createScene();
      s.highDynamicRange = true;

      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

      const rectanglePrimitive = createRectangle(rectangle, 1000.0);
      rectanglePrimitive.appearance.material.uniforms.color = new Color(
        10.0,
        0.0,
        0.0,
        1.0
      );

      const primitives = s.primitives;
      primitives.add(rectanglePrimitive);

      s.camera.setView({ destination: rectangle });

      expect(s).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0);
        expect(rgba[0]).toBeLessThanOrEqual(255);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });

      s.destroyForSpecs();
    });

    it("copies the globe depth", function () {
      const scene = createScene();
      if (scene.context.depthTexture) {
        const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        const rectanglePrimitive = createRectangle(rectangle, 1000.0);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          0.5
        );

        const primitives = scene.primitives;
        primitives.add(rectanglePrimitive);

        scene.camera.setView({ destination: rectangle });

        const uniformState = scene.context.uniformState;

        expect(scene).toRenderAndCall(function (rgba) {
          expect(uniformState.globeDepthTexture).toBeDefined();
        });
      }

      scene.destroyForSpecs();
    });

    it("pickPosition", function () {
      if (!scene.pickPositionSupported) {
        return;
      }

      const rectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
      scene.camera.setView({ destination: rectangle });

      const canvas = scene.canvas;
      const windowPosition = new Cartesian2(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2
      );

      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position).not.toBeDefined();

        const rectanglePrimitive = createRectangle(rectangle);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          1.0
        );

        const primitives = scene.primitives;
        primitives.add(rectanglePrimitive);
      });

      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position.x).toBeGreaterThan(Ellipsoid.WGS84.minimumRadius);
        expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
        expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
      });
    });

    it("pickPosition in CV", function () {
      if (!scene.pickPositionSupported) {
        return;
      }

      scene.morphToColumbusView(0.0);

      const rectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
      scene.camera.setView({ destination: rectangle });

      const canvas = scene.canvas;
      const windowPosition = new Cartesian2(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2
      );

      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position).not.toBeDefined();

        const rectanglePrimitive = createRectangle(rectangle);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          1.0
        );

        const primitives = scene.primitives;
        primitives.add(rectanglePrimitive);
      });

      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position.x).toBeGreaterThan(Ellipsoid.WGS84.minimumRadius);
        expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
        expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
      });
    });

    it("pickPosition in 2D", function () {
      if (!scene.pickPositionSupported) {
        return;
      }

      scene.morphTo2D(0.0);

      const rectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
      scene.camera.setView({ destination: rectangle });

      const canvas = scene.canvas;
      const windowPosition = new Cartesian2(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2
      );

      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position).not.toBeDefined();

        const rectanglePrimitive = createRectangle(rectangle);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          1.0
        );

        const primitives = scene.primitives;
        primitives.add(rectanglePrimitive);
      });

      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position.x).toBeGreaterThan(Ellipsoid.WGS84.minimumRadius);
        expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
        expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
      });
    });

    it("pickPosition returns undefined when useDepthPicking is false", function () {
      if (!scene.pickPositionSupported) {
        return;
      }

      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
      scene.camera.setView({
        destination: rectangle,
      });

      const canvas = scene.canvas;
      const windowPosition = new Cartesian2(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2
      );

      const rectanglePrimitive = createRectangle(rectangle);
      rectanglePrimitive.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        1.0
      );

      const primitives = scene.primitives;
      primitives.add(rectanglePrimitive);

      scene.useDepthPicking = false;
      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position).not.toBeDefined();
      });

      scene.useDepthPicking = true;
      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position).toBeDefined();
      });
    });

    it("pickPosition picks translucent geometry when pickTranslucentDepth is true", function () {
      if (!scene.pickPositionSupported) {
        return;
      }

      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
      scene.camera.setView({
        destination: rectangle,
      });

      const canvas = scene.canvas;
      const windowPosition = new Cartesian2(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2
      );

      const rectanglePrimitive = scene.primitives.add(
        createRectangle(rectangle)
      );
      rectanglePrimitive.appearance.material.uniforms.color = new Color(
        1.0,
        0.0,
        0.0,
        0.5
      );

      scene.useDepthPicking = true;
      scene.pickTranslucentDepth = false;
      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position).not.toBeDefined();
      });

      scene.pickTranslucentDepth = true;
      expect(scene).toRenderAndCall(function () {
        const position = scene.pickPosition(windowPosition);
        expect(position).toBeDefined();
      });
    });

    it("pickPosition caches results per frame", function () {
      if (!scene.pickPositionSupported) {
        return;
      }

      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
      scene.camera.setView({ destination: rectangle });

      const canvas = scene.canvas;
      const windowPosition = new Cartesian2(
        canvas.clientWidth / 2,
        canvas.clientHeight / 2
      );
      spyOn(
        SceneTransforms,
        "transformWindowToDrawingBuffer"
      ).and.callThrough();

      expect(scene).toRenderAndCall(function () {
        scene.pickPosition(windowPosition);
        expect(
          SceneTransforms.transformWindowToDrawingBuffer
        ).toHaveBeenCalled();

        scene.pickPosition(windowPosition);
        expect(
          SceneTransforms.transformWindowToDrawingBuffer.calls.count()
        ).toEqual(1);

        const rectanglePrimitive = createRectangle(rectangle);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          1.0
        );

        const primitives = scene.primitives;
        primitives.add(rectanglePrimitive);
      });

      expect(scene).toRenderAndCall(function () {
        scene.pickPosition(windowPosition);
        expect(
          SceneTransforms.transformWindowToDrawingBuffer.calls.count()
        ).toEqual(2);

        scene.pickPosition(windowPosition);
        expect(
          SceneTransforms.transformWindowToDrawingBuffer.calls.count()
        ).toEqual(2);
      });
    });

    it("pickPosition throws without windowPosition", function () {
      expect(function () {
        scene.pickPosition();
      }).toThrowDeveloperError();
    });

    it("isDestroyed", function () {
      const s = createScene();
      expect(s.isDestroyed()).toEqual(false);
      s.destroyForSpecs();
      expect(s.isDestroyed()).toEqual(true);
    });

    it("raises renderError when render throws", function () {
      const s = createScene({
        rethrowRenderErrors: false,
      });

      const spyListener = jasmine.createSpy("listener");
      s.renderError.addEventListener(spyListener);

      const error = "foo";
      s.primitives.update = function () {
        throw error;
      };

      s.render();

      expect(spyListener).toHaveBeenCalledWith(s, error);

      s.destroyForSpecs();
    });

    it("a render error is rethrown if rethrowRenderErrors is true", function () {
      const s = createScene();
      s.rethrowRenderErrors = true;

      const spyListener = jasmine.createSpy("listener");
      s.renderError.addEventListener(spyListener);

      const error = new RuntimeError("error");
      s.primitives.update = function () {
        throw error;
      };

      expect(function () {
        s.render();
      }).toThrowError(RuntimeError);

      expect(spyListener).toHaveBeenCalledWith(s, error);

      s.destroyForSpecs();
    });

    it("alwayas raises preUpdate event prior to updating", function () {
      const s = createScene();

      const spyListener = jasmine.createSpy("listener");
      s.preUpdate.addEventListener(spyListener);

      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.requestRenderMode = true;
      s.maximumRenderTimeChange = undefined;

      s.render();

      expect(spyListener.calls.count()).toBe(2);

      s.destroyForSpecs();
    });

    it("always raises preUpdate event after updating", function () {
      const s = createScene();

      const spyListener = jasmine.createSpy("listener");
      s.preUpdate.addEventListener(spyListener);

      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.requestRenderMode = true;
      s.maximumRenderTimeChange = undefined;

      s.render();

      expect(spyListener.calls.count()).toBe(2);

      s.destroyForSpecs();
    });

    it("raises the preRender event prior to rendering only if the scene renders", function () {
      const s = createScene();

      const spyListener = jasmine.createSpy("listener");
      s.preRender.addEventListener(spyListener);

      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.requestRenderMode = true;
      s.maximumRenderTimeChange = undefined;

      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.destroyForSpecs();
    });

    it("raises the postRender event after rendering if the scene rendered", function () {
      const s = createScene();

      const spyListener = jasmine.createSpy("listener");
      s.postRender.addEventListener(spyListener);

      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.requestRenderMode = true;
      s.maximumRenderTimeChange = undefined;

      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.destroyForSpecs();
    });

    it("raises the cameraMoveStart event after moving the camera", function () {
      const s = createScene();
      s.render();

      const spyListener = jasmine.createSpy("listener");
      s.camera.moveStart.addEventListener(spyListener);
      s._cameraStartFired = false; // reset this value after camera changes for initial render trigger the event

      s.camera.moveLeft();
      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.destroyForSpecs();
    });

    it("raises the cameraMoveEvent event when the camera stops moving", function () {
      const s = createScene();
      s.render();

      const spyListener = jasmine.createSpy("listener");
      s.camera.moveEnd.addEventListener(spyListener);

      // We use negative time here to ensure the event runs on the next frame.
      s.cameraEventWaitTime = -1.0;
      s.camera.moveLeft();
      // The first render will trigger the moveStart event.
      s.render();
      // The second will trigger the moveEnd.
      s.render();

      expect(spyListener.calls.count()).toBe(1);

      s.destroyForSpecs();
    });

    it("raises the camera changed event on direction changed", function () {
      const s = createScene();

      const spyListener = jasmine.createSpy("listener");
      s.camera.changed.addEventListener(spyListener);

      s.initializeFrame();
      s.render();

      s.camera.lookLeft(
        s.camera.frustum.fov * (s.camera.percentageChanged + 0.1)
      );

      s.initializeFrame();
      s.render();

      expect(spyListener.calls.count()).toBe(1);

      const args = spyListener.calls.allArgs();
      expect(args.length).toEqual(1);
      expect(args[0].length).toEqual(1);
      expect(args[0][0]).toBeGreaterThan(s.camera.percentageChanged);

      s.destroyForSpecs();
    });

    it("raises the camera changed event on heading changed", function () {
      const s = createScene();

      const spyListener = jasmine.createSpy("listener");
      s.camera.changed.addEventListener(spyListener);

      s.initializeFrame();
      s.render();

      s.camera.twistLeft(CesiumMath.PI * (s.camera.percentageChanged + 0.1));

      s.initializeFrame();
      s.render();

      expect(spyListener.calls.count()).toBe(1);

      const args = spyListener.calls.allArgs();
      expect(args.length).toEqual(1);
      expect(args[0].length).toEqual(1);
      expect(args[0][0]).toBeGreaterThan(s.camera.percentageChanged);

      s.destroyForSpecs();
    });

    it("raises the camera changed event on position changed", function () {
      const s = createScene();

      const spyListener = jasmine.createSpy("listener");
      s.camera.changed.addEventListener(spyListener);

      s.initializeFrame();
      s.render();

      s.camera.moveUp(
        s.camera.positionCartographic.height *
          (s.camera.percentageChanged + 0.1)
      );

      s.initializeFrame();
      s.render();

      expect(spyListener.calls.count()).toBe(1);

      const args = spyListener.calls.allArgs();
      expect(args.length).toEqual(1);
      expect(args[0].length).toEqual(1);
      expect(args[0][0]).toBeGreaterThan(s.camera.percentageChanged);

      s.destroyForSpecs();
    });

    it("raises the camera changed event in 2D", function () {
      const s = createScene();
      s.morphTo2D(0);

      const spyListener = jasmine.createSpy("listener");
      s.camera.changed.addEventListener(spyListener);

      s.initializeFrame();
      s.render();

      s.camera.moveLeft(
        s.camera.positionCartographic.height *
          (s.camera.percentageChanged + 0.1)
      );

      s.initializeFrame();
      s.render();

      expect(spyListener.calls.count()).toBe(1);

      const args = spyListener.calls.allArgs();
      expect(args.length).toEqual(1);
      expect(args[0].length).toEqual(1);
      expect(args[0][0]).toBeGreaterThan(s.camera.percentageChanged);

      s.destroyForSpecs();
    });

    it("get maximumAliasedLineWidth", function () {
      const s = createScene();
      expect(s.maximumAliasedLineWidth).toBeGreaterThanOrEqual(1);
      s.destroyForSpecs();
    });

    it("get maximumCubeMapSize", function () {
      const s = createScene();
      expect(s.maximumCubeMapSize).toBeGreaterThanOrEqual(16);
      s.destroyForSpecs();
    });

    it("does not throw with debugShowCommands", function () {
      const s = createScene();
      if (s.context.drawBuffers) {
        s.debugShowCommands = true;

        const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        const rectanglePrimitive = createRectangle(rectangle, 1000.0);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          0.5
        );

        const primitives = s.primitives;
        primitives.add(rectanglePrimitive);

        s.camera.setView({ destination: rectangle });

        expect(function () {
          s.renderForSpecs();
        }).not.toThrowError(RuntimeError);
      }
      s.destroyForSpecs();
    });

    it("does not throw with debugShowFrustums", function () {
      const s = createScene();
      if (s.context.drawBuffers) {
        s.debugShowFrustums = true;

        const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);

        const rectanglePrimitive = createRectangle(rectangle, 1000.0);
        rectanglePrimitive.appearance.material.uniforms.color = new Color(
          1.0,
          0.0,
          0.0,
          0.5
        );

        const primitives = s.primitives;
        primitives.add(rectanglePrimitive);

        s.camera.setView({ destination: rectangle });

        expect(function () {
          s.renderForSpecs();
        }).not.toThrowError(RuntimeError);
      }
      s.destroyForSpecs();
    });

    it("throws when minimumDisableDepthTestDistance is set less than 0.0", function () {
      expect(function () {
        scene.minimumDisableDepthTestDistance = -1.0;
      }).toThrowDeveloperError();
    });

    it("converts to canvas coordinates", function () {
      const mockPosition = new Cartesian3();
      spyOn(SceneTransforms, "wgs84ToWindowCoordinates");
      scene.cartesianToCanvasCoordinates(mockPosition);

      expect(SceneTransforms.wgs84ToWindowCoordinates).toHaveBeenCalledWith(
        scene,
        mockPosition,
        undefined
      );
    });

    it("converts to canvas coordinates and return it in a variable", function () {
      const result = new Cartesian2();
      const mockPosition = new Cartesian3();
      spyOn(SceneTransforms, "wgs84ToWindowCoordinates");
      scene.cartesianToCanvasCoordinates(mockPosition, result);

      expect(SceneTransforms.wgs84ToWindowCoordinates).toHaveBeenCalledWith(
        scene,
        mockPosition,
        result
      );
    });

    it("Gets imageryLayers", function () {
      const scene = createScene();
      const globe = (scene.globe = new Globe(Ellipsoid.UNIT_SPHERE));
      expect(scene.imageryLayers).toBe(globe.imageryLayers);

      scene.globe = undefined;
      expect(scene.imageryLayers).toBeUndefined();

      scene.destroyForSpecs();
    });

    it("Gets terrainProvider", function () {
      const scene = createScene();
      const globe = (scene.globe = new Globe(Ellipsoid.UNIT_SPHERE));
      expect(scene.terrainProvider).toBe(globe.terrainProvider);

      scene.globe = undefined;
      expect(scene.terrainProvider).toBeUndefined();

      scene.destroyForSpecs();
    });

    it("Sets terrainProvider", function () {
      const scene = createScene();
      const globe = (scene.globe = new Globe(Ellipsoid.UNIT_SPHERE));
      scene.terrainProvider = new CesiumTerrainProvider({
        url: "//terrain/tiles",
      });

      return scene.terrainProvider.readyPromise
        .catch(() => {
          expect(scene.terrainProvider).toBe(globe.terrainProvider);
          scene.globe = undefined;
          const newProvider = new CesiumTerrainProvider({
            url: "//newTerrain/tiles",
          });
          return newProvider.readyPromise.catch(() => {
            expect(function () {
              scene.terrainProvider = newProvider;
            }).not.toThrow();
          });
        })
        .finally(() => {
          scene.destroyForSpecs();
        });
    });

    it("Gets terrainProviderChanged", function () {
      const scene = createScene();
      const globe = (scene.globe = new Globe(Ellipsoid.UNIT_SPHERE));
      expect(scene.terrainProviderChanged).toBe(globe.terrainProviderChanged);

      scene.globe = undefined;
      expect(scene.terrainProviderChanged).toBeUndefined();

      scene.destroyForSpecs();
    });

    it("Sets material", function () {
      const scene = createScene();
      const globe = (scene.globe = new Globe(Ellipsoid.UNIT_SPHERE));
      const material = Material.fromType("ElevationContour");
      globe.material = material;
      expect(globe.material).toBe(material);

      globe.material = undefined;
      expect(globe.material).toBeUndefined();

      scene.destroyForSpecs();
    });

    const scratchTime = new JulianDate();

    it("doesn't render scene if requestRenderMode is enabled", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;
      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("requestRender causes a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      scene.requestRender();
      expect(scene._renderRequested).toBe(true);

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("moving the camera causes a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      scene.camera.moveLeft();

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("changing the camera frustum does not cause continuous rendering in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      let lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      scene.camera.frustum.near *= 1.1;

      // Render once properly
      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      // Render again - but this time nothing should happen.
      lastFrameNumber = scene.frameState.frameNumber;
      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("successful completed requests causes a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      RequestScheduler.requestCompletedEvent.raiseEvent();

      scene.renderForSpecs();

      expect(scene._renderRequested).toBe(true);

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("data returning from a web worker causes a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      TaskProcessor.taskCompletedEvent.raiseEvent();

      scene.renderForSpecs();

      expect(scene._renderRequested).toBe(true);

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("Executing an after render function causes a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      let functionCalled = false;
      scene._frameState.afterRender.push(function () {
        functionCalled = true;
      });

      scene.renderForSpecs();

      expect(functionCalled).toBe(true);
      expect(scene._renderRequested).toBe(true);

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("Globe tile loading triggers a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      let lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      const ellipsoid = Ellipsoid.UNIT_SPHERE;
      const globe = new Globe(ellipsoid);
      scene.globe = globe;

      scene.requestRender();
      Object.defineProperty(globe, "tilesLoaded", { value: false });
      scene.renderForSpecs();
      lastFrameNumber = scene.frameState.frameNumber;

      expect(scene._renderRequested).toBe(true);
      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("Globe imagery updates triggers a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      const ellipsoid = Ellipsoid.UNIT_SPHERE;
      const globe = new Globe(ellipsoid);
      scene.globe = globe;
      globe.imageryLayersUpdatedEvent.raiseEvent();

      scene.renderForSpecs();

      expect(scene._renderRequested).toBe(true);

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("Globe changing terrain providers triggers a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      const ellipsoid = Ellipsoid.UNIT_SPHERE;
      const globe = new Globe(ellipsoid);
      scene.globe = globe;
      globe.terrainProviderChanged.raiseEvent();

      scene.renderForSpecs();

      expect(scene._renderRequested).toBe(true);

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("scene morphing causes a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();
      scene.renderForSpecs();

      let lastFrameNumber = scene.frameState.frameNumber;
      let lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);
      expect(lastRenderTime).toBeDefined();
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      scene.morphTo2D(1.0);
      scene.renderForSpecs(
        JulianDate.addSeconds(lastRenderTime, 0.5, new JulianDate())
      );
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.completeMorph();
      scene.renderForSpecs();
      lastFrameNumber = scene.frameState.frameNumber;

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);
      lastFrameNumber = scene.frameState.frameNumber;
      lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

      scene.morphToColumbusView(1.0);
      scene.renderForSpecs(
        JulianDate.addSeconds(lastRenderTime, 0.5, new JulianDate())
      );
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.completeMorph();
      scene.renderForSpecs();
      lastFrameNumber = scene.frameState.frameNumber;

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);
      lastFrameNumber = scene.frameState.frameNumber;
      lastRenderTime = JulianDate.clone(scene.lastRenderTime, scratchTime);

      scene.morphTo3D(1.0);
      scene.renderForSpecs(
        JulianDate.addSeconds(lastRenderTime, 0.5, new JulianDate())
      );
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.completeMorph();
      scene.renderForSpecs();
      lastFrameNumber = scene.frameState.frameNumber;

      scene.renderForSpecs();
      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("time change exceeding maximumRenderTimeChange causes a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      const lastRenderTime = JulianDate.clone(
        scene.lastRenderTime,
        scratchTime
      );
      expect(lastRenderTime).toBeDefined();
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;

      scene.renderForSpecs(lastRenderTime);
      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);

      scene.maximumRenderTimeChange = 100.0;

      scene.renderForSpecs(
        JulianDate.addSeconds(lastRenderTime, 50.0, new JulianDate())
      );
      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);

      scene.renderForSpecs(
        JulianDate.addSeconds(lastRenderTime, 150.0, new JulianDate())
      );
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("undefined maximumRenderTimeChange will not cause a new frame to be rendered in requestRenderMode", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      const lastRenderTime = JulianDate.clone(
        scene.lastRenderTime,
        scratchTime
      );
      expect(lastRenderTime).toBeDefined();
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      const farFuture = JulianDate.addDays(
        lastRenderTime,
        10000,
        new JulianDate()
      );

      scene.renderForSpecs();
      scene.renderForSpecs(farFuture);

      expect(scene.frameState.frameNumber).toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    it("forceRender renders a scene regardless of whether a render was requested", function () {
      const scene = createScene();

      scene.renderForSpecs();

      const lastFrameNumber = scene.frameState.frameNumber;
      expect(scene._renderRequested).toBe(false);

      scene.requestRenderMode = true;
      scene.maximumRenderTimeChange = undefined;

      scene.forceRender();
      expect(scene.frameState.frameNumber).not.toEqual(lastFrameNumber);

      scene.destroyForSpecs();
    });

    function getFrustumCommandsLength(scene, pass) {
      let commandsLength = 0;
      const frustumCommandsList = scene.frustumCommandsList;
      const frustumsLength = frustumCommandsList.length;
      for (let i = 0; i < frustumsLength; ++i) {
        const frustumCommands = frustumCommandsList[i];
        for (let j = 0; j < Pass.NUMBER_OF_PASSES; ++j) {
          if (!defined(pass) || j === pass) {
            commandsLength += frustumCommands.indices[j];
          }
        }
      }
      return commandsLength;
    }

    it("occludes primitive", function () {
      const scene = createScene();
      scene.globe = new Globe(Ellipsoid.WGS84);

      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
      const rectanglePrimitive = createRectangle(rectangle, 10);
      scene.primitives.add(rectanglePrimitive);

      scene.camera.setView({
        destination: new Cartesian3(
          -588536.1057451078,
          -10512475.371849751,
          6737159.100747835
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179586,
          -1.5688261558859757,
          0.0
        ),
      });
      scene.renderForSpecs();
      expect(getFrustumCommandsLength(scene)).toBe(1);

      scene.camera.setView({
        destination: new Cartesian3(
          -5754647.167415793,
          14907694.100240812,
          -483807.2406259497
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179586,
          -1.5698869547885104,
          0.0
        ),
      });
      scene.renderForSpecs();
      expect(getFrustumCommandsLength(scene)).toBe(0);

      // Still on opposite side of globe but now show is false, the command should not be occluded anymore
      scene.globe.show = false;
      scene.renderForSpecs();
      expect(getFrustumCommandsLength(scene)).toBe(1);

      scene.destroyForSpecs();
    });

    it("does not occlude if DrawCommand.occlude is false", function () {
      const scene = createScene();
      scene.globe = new Globe(Ellipsoid.WGS84);

      const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -90.0, 40.0);
      const rectanglePrimitive = createRectangle(rectangle, 10);
      scene.primitives.add(rectanglePrimitive);

      scene.renderForSpecs();
      rectanglePrimitive._colorCommands[0].occlude = false;

      scene.camera.setView({
        destination: new Cartesian3(
          -5754647.167415793,
          14907694.100240812,
          -483807.2406259497
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179586,
          -1.5698869547885104,
          0.0
        ),
      });
      scene.renderForSpecs();
      expect(getFrustumCommandsLength(scene)).toBe(1);

      scene.destroyForSpecs();
    });

    it("sets light", function () {
      const scene = createScene();
      const uniformState = scene.context.uniformState;
      const lightDirectionWC = uniformState._lightDirectionWC;
      const sunDirectionWC = uniformState._sunDirectionWC;
      const lightColor = uniformState._lightColor;
      const lightColorHdr = uniformState._lightColorHdr;

      // Default light is a sun light
      scene.renderForSpecs();
      expect(lightDirectionWC).toEqual(sunDirectionWC);
      expect(lightColor).toEqual(new Cartesian3(1.0, 1.0, 1.0));
      expect(lightColorHdr).toEqual(new Cartesian3(2.0, 2.0, 2.0));

      // Test directional light
      scene.light = new DirectionalLight({
        direction: new Cartesian3(1.0, 0.0, 0.0),
        color: Color.RED,
        intensity: 2.0,
      });
      scene.renderForSpecs();
      expect(lightDirectionWC).toEqual(new Cartesian3(-1.0, 0.0, 0.0)); // Negated because the uniform is the direction to the light, not from the light
      expect(lightColor).toEqual(new Cartesian3(1.0, 0.0, 0.0));
      expect(lightColorHdr).toEqual(new Cartesian3(2.0, 0.0, 0.0));

      // Test sun light
      scene.light = new SunLight({
        color: Color.BLUE,
        intensity: 0.5,
      });
      scene.renderForSpecs();
      expect(lightDirectionWC).toEqual(sunDirectionWC);
      expect(lightColor).toEqual(new Cartesian3(0.0, 0.0, 0.5));
      expect(lightColorHdr).toEqual(new Cartesian3(0.0, 0.0, 0.5));

      // Test light set to undefined
      scene.light = undefined;
      scene.renderForSpecs();
      expect(lightDirectionWC).toEqual(sunDirectionWC);
      expect(lightColor).toEqual(new Cartesian3(1.0, 1.0, 1.0));
      expect(lightColorHdr).toEqual(new Cartesian3(2.0, 2.0, 2.0));

      scene.destroyForSpecs();
    });

    function updateGlobeUntilDone(scene) {
      return pollToPromise(function () {
        scene.renderForSpecs();
        return scene.globe.tilesLoaded;
      });
    }

    it("detects when camera is underground", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;

      scene.camera.setView({
        destination: new Rectangle(0.0001, 0.0001, 0.003, 0.003),
      });

      return updateGlobeUntilDone(scene)
        .then(function () {
          expect(scene.cameraUnderground).toBe(false);

          // Look underground
          scene.camera.setView({
            destination: new Cartesian3(
              -746658.0557573901,
              -5644191.0002196245,
              2863585.099969967
            ),
            orientation: new HeadingPitchRoll(
              0.3019699121236403,
              0.07316306869231592,
              0.0007089903642230055
            ),
          });
          return updateGlobeUntilDone(scene);
        })
        .then(function () {
          expect(scene.cameraUnderground).toBe(true);
          scene.destroyForSpecs();
        });
    });

    it("detects that camera is above ground if globe is undefined", function () {
      const scene = createScene();
      scene.renderForSpecs();
      expect(scene.cameraUnderground).toBe(false);
      scene.destroyForSpecs();
    });

    it("detects that camera is above ground if scene mode is 2D", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;
      scene.morphTo2D(0.0);
      expect(scene.cameraUnderground).toBe(false);
      scene.destroyForSpecs();
    });

    it("detects that camera is above ground if scene mode is morphing", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;
      scene.morphTo2D(1.0);
      expect(scene.cameraUnderground).toBe(false);
      scene.destroyForSpecs();
    });

    it("detects that camera is underground in Columbus View", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;

      // Look underground
      scene.camera.setView({
        destination: new Cartesian3(
          -4643042.379120885,
          4314056.579506199,
          -451828.8968118975
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179586,
          -0.7855491933100796,
          6.283185307179586
        ),
      });
      scene.morphToColumbusView(0.0);

      return updateGlobeUntilDone(scene).then(function () {
        expect(scene.cameraUnderground).toBe(true);
        scene.destroyForSpecs();
      });
    });

    it("does not occlude primitives when camera is underground", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;

      // A primitive at height -25000.0 is less than the minor axis for WGS84 and will get culled unless the camera is underground
      const center = Cartesian3.fromRadians(
        2.3929070618374535,
        -0.07149851443375346,
        -25000.0,
        globe.ellipsoid
      );
      const radius = 10.0;

      const command = new DrawCommand({
        shaderProgram: simpleShaderProgram,
        renderState: simpleRenderState,
        pass: Pass.OPAQUE,
        boundingVolume: new BoundingSphere(center, radius),
      });

      scene.primitives.add(new CommandMockPrimitive(command));

      spyOn(DrawCommand.prototype, "execute"); // Don't execute any commands, just watch what gets added to the frustum commands list

      return updateGlobeUntilDone(scene)
        .then(function () {
          expect(getFrustumCommandsLength(scene, Pass.OPAQUE)).toBe(0);

          // Look underground at the primitive
          scene.camera.setView({
            destination: new Cartesian3(
              -4643042.379120885,
              4314056.579506199,
              -451828.8968118975
            ),
            orientation: new HeadingPitchRoll(
              6.283185307179586,
              -0.7855491933100796,
              6.283185307179586
            ),
          });
          return updateGlobeUntilDone(scene);
        })
        .then(function () {
          expect(getFrustumCommandsLength(scene, Pass.OPAQUE)).toBe(1);
          scene.destroyForSpecs();
        });
    });

    it("does not occlude primitives when the globe is translucent", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;

      // A primitive at height -25000.0 is less than the minor axis for WGS84 and will get culled unless the globe is translucent
      const center = Cartesian3.fromRadians(
        2.3929070618374535,
        -0.07149851443375346,
        -25000.0,
        globe.ellipsoid
      );
      const radius = 10.0;

      const command = new DrawCommand({
        shaderProgram: simpleShaderProgram,
        renderState: simpleRenderState,
        pass: Pass.OPAQUE,
        boundingVolume: new BoundingSphere(center, radius),
      });

      scene.primitives.add(new CommandMockPrimitive(command));

      spyOn(DrawCommand.prototype, "execute"); // Don't execute any commands, just watch what gets added to the frustum commands list

      scene.renderForSpecs();
      expect(getFrustumCommandsLength(scene, Pass.OPAQUE)).toBe(0);

      scene.globe.translucency.enabled = true;
      scene.globe.translucency.frontFaceAlpha = 0.5;

      scene.renderForSpecs();
      expect(getFrustumCommandsLength(scene, Pass.OPAQUE)).toBe(1);

      scene.destroyForSpecs();
    });

    it("does not render environment when camera is underground and translucency is disabled", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;
      scene.sun = new Sun();

      // Look underground at the sun
      scene.camera.setView({
        destination: new Cartesian3(
          2838477.9315700866,
          -4939120.816857662,
          1978094.4576285738
        ),
        orientation: new HeadingPitchRoll(
          5.955798516387474,
          -1.0556025616093283,
          0.39098563693868016
        ),
      });

      return updateGlobeUntilDone(scene).then(function () {
        const time = JulianDate.fromIso8601(
          "2020-04-25T03:07:26.04924034334544558Z"
        );
        globe.translucency.enabled = true;
        globe.translucency.frontFaceAlpha = 0.5;
        scene.renderForSpecs(time);

        expect(scene.environmentState.isSunVisible).toBe(true);
        globe.translucency.enabled = false;
        scene.renderForSpecs(time);
        expect(scene.environmentState.isSunVisible).toBe(false);
        scene.destroyForSpecs(time);
      });
    });

    it("renders globe with translucency", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;

      scene.camera.setView({
        destination: new Cartesian3(
          2764681.3022502237,
          -20999839.371941473,
          14894754.464869803
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179586,
          -1.5687983447998315,
          0
        ),
      });

      return updateGlobeUntilDone(scene).then(function () {
        let opaqueColor;
        expect(scene).toRenderAndCall(function (rgba) {
          opaqueColor = rgba;
        });

        globe.translucency.enabled = true;
        globe.translucency.frontFaceAlpha = 0.5;

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(opaqueColor);
          scene.destroyForSpecs();
        });
      });
    });

    it("renders ground primitive on translucent globe", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;
      globe.baseColor = Color.BLACK;
      globe.translucency.enabled = true;
      globe.translucency.frontFaceAlpha = 0.5;

      scene.camera.setView({
        destination: new Cartesian3(
          -557278.4840232887,
          -6744284.200717078,
          2794079.461722868
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179586,
          -1.5687983448015541,
          0
        ),
      });

      const redRectangleInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-110.0, 20.0, -80.0, 25.0),
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(
            new Color(1.0, 0.0, 0.0, 0.5)
          ),
        },
      });

      scene.primitives.add(
        new GroundPrimitive({
          geometryInstances: [redRectangleInstance],
          appearance: new PerInstanceColorAppearance({
            closed: true,
          }),
          asynchronous: false,
        })
      );

      return updateGlobeUntilDone(scene).then(function () {
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          scene.destroyForSpecs();
        });
      });
    });

    it("picks ground primitive on translucent globe", function () {
      const scene = createScene();
      const globe = new Globe();
      scene.globe = globe;
      globe.baseColor = Color.BLACK;
      globe.translucency.enabled = true;
      globe.translucency.frontFaceAlpha = 0.5;

      scene.camera.setView({
        destination: new Cartesian3(
          -557278.4840232887,
          -6744284.200717078,
          2794079.461722868
        ),
        orientation: new HeadingPitchRoll(
          6.283185307179586,
          -1.5687983448015541,
          0
        ),
      });

      const redRectangleInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          rectangle: Rectangle.fromDegrees(-110.0, 20.0, -80.0, 25.0),
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(
            new Color(1.0, 0.0, 0.0, 0.5)
          ),
        },
      });

      const primitive = scene.primitives.add(
        new GroundPrimitive({
          geometryInstances: [redRectangleInstance],
          appearance: new PerInstanceColorAppearance({
            closed: true,
          }),
          asynchronous: false,
        })
      );

      return updateGlobeUntilDone(scene).then(function () {
        expect(scene).toPickPrimitive(primitive);
        scene.destroyForSpecs();
      });
    });
  },

  "WebGL"
);
