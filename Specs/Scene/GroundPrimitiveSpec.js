import { ApproximateTerrainHeights } from "../../Source/Cesium.js";
import { arraySlice } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { ColorGeometryInstanceAttribute } from "../../Source/Cesium.js";
import { destroyObject } from "../../Source/Cesium.js";
import { DistanceDisplayConditionGeometryInstanceAttribute } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeometryInstance } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PolygonGeometry } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { RectangleGeometry } from "../../Source/Cesium.js";
import { ShowGeometryInstanceAttribute } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { ClassificationType } from "../../Source/Cesium.js";
import { EllipsoidSurfaceAppearance } from "../../Source/Cesium.js";
import { GroundPrimitive } from "../../Source/Cesium.js";
import { InvertClassification } from "../../Source/Cesium.js";
import { Material } from "../../Source/Cesium.js";
import { PerInstanceColorAppearance } from "../../Source/Cesium.js";
import { Primitive } from "../../Source/Cesium.js";
import { StencilConstants } from "../../Source/Cesium.js";
import createCanvas from "../createCanvas.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/GroundPrimitive",
  function () {
    let scene;
    let context;

    let ellipsoid;
    let rectangle;

    let depthColor;
    let rectColor;

    let rectangleInstance;
    let primitive;
    let globePrimitive;
    let tilesetPrimitive;
    let reusableGlobePrimitive;
    let reusableTilesetPrimitive;

    function createPrimitive(rectangle, pass) {
      let renderState;
      if (pass === Pass.CESIUM_3D_TILE) {
        renderState = RenderState.fromCache({
          stencilTest: StencilConstants.setCesium3DTileBit(),
          stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
          depthTest: {
            enabled: true,
          },
        });
      }
      const depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(0.0, 0.0, 1.0, 1.0)
      );
      depthColor = depthColorAttribute.value;
      return new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            ellipsoid: Ellipsoid.WGS84,
            rectangle: rectangle,
          }),
          id: "depth rectangle",
          attributes: {
            color: depthColorAttribute,
          },
        }),
        appearance: new PerInstanceColorAppearance({
          translucent: false,
          flat: true,
          renderState: renderState,
        }),
        asynchronous: false,
      });
    }

    function MockPrimitive(primitive, pass) {
      this._primitive = primitive;
      this._pass = pass;
      this.show = true;
    }

    MockPrimitive.prototype.update = function (frameState) {
      if (!this.show) {
        return;
      }

      const commandList = frameState.commandList;
      const startLength = commandList.length;
      this._primitive.update(frameState);

      for (let i = startLength; i < commandList.length; ++i) {
        const command = commandList[i];
        command.pass = this._pass;
      }
    };

    MockPrimitive.prototype.isDestroyed = function () {
      return false;
    };

    MockPrimitive.prototype.destroy = function () {
      return destroyObject(this);
    };

    beforeAll(function () {
      scene = createScene();

      scene.postProcessStages.fxaa.enabled = false;

      context = scene.context;

      ellipsoid = Ellipsoid.WGS84;

      const bigRectangle = Rectangle.fromDegrees(
        -180 + CesiumMath.EPSILON4,
        -90 + CesiumMath.EPSILON4,
        180 - CesiumMath.EPSILON4,
        90 - CesiumMath.EPSILON4
      );
      reusableGlobePrimitive = createPrimitive(bigRectangle, Pass.GLOBE);
      reusableTilesetPrimitive = createPrimitive(
        bigRectangle,
        Pass.CESIUM_3D_TILE
      );

      return GroundPrimitive.initializeTerrainHeights();
    });

    afterAll(function () {
      reusableGlobePrimitive.destroy();
      reusableTilesetPrimitive.destroy();
      scene.destroyForSpecs();
      // Leave ground primitive uninitialized
      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;
    });

    beforeEach(function () {
      scene.morphTo3D(0);

      rectangle = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);

      // wrap rectangle primitive so it gets executed during the globe pass and 3D Tiles pass to lay down depth
      globePrimitive = new MockPrimitive(reusableGlobePrimitive, Pass.GLOBE);
      tilesetPrimitive = new MockPrimitive(
        reusableTilesetPrimitive,
        Pass.CESIUM_3D_TILE
      );

      const rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(1.0, 1.0, 0.0, 1.0)
      );
      rectColor = rectColorAttribute.value;
      rectangleInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: rectangle,
        }),
        id: "rectangle",
        attributes: {
          color: rectColorAttribute,
        },
      });
    });

    afterEach(function () {
      scene.primitives.removeAll();
      scene.groundPrimitives.removeAll();
      primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
      globePrimitive =
        globePrimitive &&
        !globePrimitive.isDestroyed() &&
        globePrimitive.destroy();
      tilesetPrimitive =
        tilesetPrimitive &&
        !tilesetPrimitive.isDestroyed() &&
        tilesetPrimitive.destroy();
    });

    it("default constructs", function () {
      primitive = new GroundPrimitive();
      expect(primitive.geometryInstances).not.toBeDefined();
      expect(primitive.show).toEqual(true);
      expect(primitive.vertexCacheOptimize).toEqual(false);
      expect(primitive.interleave).toEqual(false);
      expect(primitive.compressVertices).toEqual(true);
      expect(primitive.releaseGeometryInstances).toEqual(true);
      expect(primitive.allowPicking).toEqual(true);
      expect(primitive.asynchronous).toEqual(true);
      expect(primitive.debugShowBoundingVolume).toEqual(false);
      expect(primitive.debugShowShadowVolume).toEqual(false);
    });

    it("constructs with options", function () {
      const geometryInstances = [];

      primitive = new GroundPrimitive({
        geometryInstances: geometryInstances,
        show: false,
        vertexCacheOptimize: true,
        interleave: true,
        compressVertices: false,
        releaseGeometryInstances: false,
        allowPicking: false,
        asynchronous: false,
        debugShowBoundingVolume: true,
        debugShowShadowVolume: true,
      });

      expect(primitive.geometryInstances).toEqual(geometryInstances);
      expect(primitive.show).toEqual(false);
      expect(primitive.vertexCacheOptimize).toEqual(true);
      expect(primitive.interleave).toEqual(true);
      expect(primitive.compressVertices).toEqual(false);
      expect(primitive.releaseGeometryInstances).toEqual(false);
      expect(primitive.allowPicking).toEqual(false);
      expect(primitive.asynchronous).toEqual(false);
      expect(primitive.debugShowBoundingVolume).toEqual(true);
      expect(primitive.debugShowShadowVolume).toEqual(true);
    });

    it("releases geometry instances when releaseGeometryInstances is true", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        releaseGeometryInstances: true,
        asynchronous: false,
      });

      expect(primitive.geometryInstances).toBeDefined();
      scene.groundPrimitives.add(primitive);
      scene.renderForSpecs();
      expect(primitive.geometryInstances).not.toBeDefined();
    });

    it("does not release geometry instances when releaseGeometryInstances is false", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        releaseGeometryInstances: false,
        asynchronous: false,
      });

      expect(primitive.geometryInstances).toBeDefined();
      scene.groundPrimitives.add(primitive);
      scene.renderForSpecs();
      expect(primitive.geometryInstances).toBeDefined();
    });

    it("adds afterRender promise to frame state", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        releaseGeometryInstances: false,
        asynchronous: false,
      });

      scene.groundPrimitives.add(primitive);
      scene.renderForSpecs();

      return primitive.readyPromise.then(function (param) {
        expect(param.ready).toBe(true);
      });
    });

    it("does not render when geometryInstances is undefined", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: undefined,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.groundPrimitives.add(primitive);
      scene.renderForSpecs();
      expect(scene.frameState.commandList.length).toEqual(0);
    });

    it("does not render when show is false", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.groundPrimitives.add(primitive);
      scene.renderForSpecs();
      expect(scene.frameState.commandList.length).toBeGreaterThan(0);

      primitive.show = false;
      scene.renderForSpecs();
      expect(scene.frameState.commandList.length).toEqual(0);
    });

    it("becomes ready when show is false", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = scene.groundPrimitives.add(
        new GroundPrimitive({
          geometryInstances: rectangleInstance,
          asynchronous: false,
          show: false,
        })
      );

      let ready = false;
      primitive.readyPromise.then(function () {
        ready = true;
      });

      return pollToPromise(function () {
        scene.renderForSpecs();
        return ready;
      }).then(function () {
        expect(ready).toEqual(true);
      });
    });

    it("does not render other than for the color or pick pass", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      const frameState = scene.frameState;
      frameState.passes.render = false;
      frameState.passes.pick = false;

      primitive.update(frameState);
      expect(frameState.commandList.length).toEqual(0);
    });

    function expectRender(scene, color) {
      expect(scene).toRenderAndCall(function (rgba) {
        expect(arraySlice(rgba, 0, 4)).toEqual(color);
      });
    }

    function expectRenderBlank(scene) {
      expect(scene).toRenderAndCall(function (rgba) {
        expect(arraySlice(rgba)).not.toEqual([0, 0, 0, 255]);
        expect(rgba[0]).toEqual(0);
      });
    }

    function verifyGroundPrimitiveRender(primitive, color) {
      scene.camera.setView({ destination: rectangle });

      scene.primitives.add(globePrimitive);
      scene.primitives.add(tilesetPrimitive);

      expectRenderBlank(scene);

      scene.groundPrimitives.add(primitive);

      primitive.classificationType = ClassificationType.BOTH;
      globePrimitive.show = false;
      tilesetPrimitive.show = true;
      expectRender(scene, color);
      globePrimitive.show = true;
      tilesetPrimitive.show = false;
      expectRender(scene, color);

      primitive.classificationType = ClassificationType.CESIUM_3D_TILE;
      globePrimitive.show = false;
      tilesetPrimitive.show = true;
      expectRender(scene, color);
      globePrimitive.show = true;
      tilesetPrimitive.show = false;
      expectRenderBlank(scene);

      primitive.classificationType = ClassificationType.TERRAIN;
      globePrimitive.show = false;
      tilesetPrimitive.show = true;
      expectRenderBlank(scene);
      globePrimitive.show = true;
      tilesetPrimitive.show = false;
      expectRender(scene, color);

      globePrimitive.show = true;
      tilesetPrimitive.show = true;
    }

    it("renders in 3D", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it("renders GroundPrimitives with spherical texture coordinates across the IDL in 3D", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      const rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(1.0, 1.0, 0.0, 1.0)
      );
      const bigIdlRectangle = Rectangle.fromDegrees(176.0, 30.0, -176.0, 34.0);
      const bigIdlRectangleInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: bigIdlRectangle,
        }),
        id: "rectangle",
        attributes: {
          color: rectColorAttribute,
        },
      });

      primitive = new GroundPrimitive({
        geometryInstances: bigIdlRectangleInstance,
        asynchronous: false,
      });

      scene.camera.setView({ destination: bigIdlRectangle });

      scene.primitives.add(globePrimitive);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
        expect(rgba[0]).toEqual(0);
      });

      scene.groundPrimitives.add(primitive);
      expect(scene).toRender(rectColor);
    });

    it("renders GroundPrimitives with planar texture coordinates across the IDL in 3D", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      const rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(1.0, 1.0, 0.0, 1.0)
      );
      const smallIdlRectangle = Rectangle.fromDegrees(
        179.6,
        30.0,
        -179.6,
        30.9
      );
      const smallIdlRectangleInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: smallIdlRectangle,
        }),
        id: "rectangle",
        attributes: {
          color: rectColorAttribute,
        },
      });

      primitive = new GroundPrimitive({
        geometryInstances: smallIdlRectangleInstance,
        asynchronous: false,
      });

      scene.camera.setView({ destination: smallIdlRectangle });

      scene.primitives.add(globePrimitive);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
        expect(rgba[0]).toEqual(0);
      });

      scene.groundPrimitives.add(primitive);
      expect(scene).toRender(rectColor);
    });

    it("renders in Columbus view when scene3DOnly is false", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.morphToColumbusView(0);
      verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it("renders in 2D when scene3DOnly is false", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.morphTo2D(0);
      verifyGroundPrimitiveRender(primitive, rectColor);
    });

    describe("larger scene", function () {
      // Screen space techniques may produce unexpected results with 1x1 canvasses
      let largeScene;
      let largeSceneReusableGlobePrimitive;
      let largeSceneReusableTilesetPrimitive;
      beforeAll(function () {
        largeScene = createScene({
          canvas: createCanvas(2, 2),
        });

        const bigRectangle = Rectangle.fromDegrees(
          -180 + CesiumMath.EPSILON4,
          -90 + CesiumMath.EPSILON4,
          180 - CesiumMath.EPSILON4,
          90 - CesiumMath.EPSILON4
        );
        largeSceneReusableGlobePrimitive = createPrimitive(
          bigRectangle,
          Pass.GLOBE
        );
        largeSceneReusableTilesetPrimitive = createPrimitive(
          bigRectangle,
          Pass.CESIUM_3D_TILE
        );
      });
      afterAll(function () {
        largeSceneReusableGlobePrimitive.destroy();
        largeSceneReusableTilesetPrimitive.destroy();
        largeScene.destroyForSpecs();
      });
      afterEach(function () {
        largeScene.primitives.removeAll();
        largeScene.groundPrimitives.removeAll();
      });

      function verifyLargerScene(groundPrimitive, expectedColor, destination) {
        largeScene.renderForSpecs();

        largeScene.postProcessStages.fxaa.enabled = false;
        largeScene.camera.setView({ destination: destination });

        const largeSceneGlobePrimitive = new MockPrimitive(
          largeSceneReusableGlobePrimitive,
          Pass.GLOBE
        );
        const largeSceneTilesetPrimitive = new MockPrimitive(
          largeSceneReusableTilesetPrimitive,
          Pass.CESIUM_3D_TILE
        );

        largeScene.primitives.add(largeSceneGlobePrimitive);
        largeScene.primitives.add(largeSceneTilesetPrimitive);

        expectRenderBlank(largeScene);

        largeScene.groundPrimitives.add(groundPrimitive);

        groundPrimitive.classificationType = ClassificationType.BOTH;
        largeSceneGlobePrimitive.show = false;
        largeSceneTilesetPrimitive.show = true;
        expectRender(largeScene, expectedColor);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        expectRender(largeScene, expectedColor);

        groundPrimitive.classificationType = ClassificationType.CESIUM_3D_TILE;
        largeSceneGlobePrimitive.show = false;
        largeSceneTilesetPrimitive.show = true;
        expectRender(largeScene, expectedColor);
        globePrimitive.show = true;
        largeSceneTilesetPrimitive.show = false;
        expectRenderBlank(largeScene);

        groundPrimitive.classificationType = ClassificationType.TERRAIN;
        largeSceneGlobePrimitive.show = false;
        largeSceneTilesetPrimitive.show = true;
        expectRenderBlank(largeScene);
        largeSceneGlobePrimitive.show = true;
        largeSceneTilesetPrimitive.show = false;
        expectRender(largeScene, expectedColor);

        largeSceneGlobePrimitive.show = true;
        largeSceneTilesetPrimitive.show = true;
      }

      it("renders batched instances", function () {
        if (!GroundPrimitive.isSupported(scene)) {
          return;
        }

        const rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
          new Color(0.0, 1.0, 1.0, 1.0)
        );
        const rectangleInstance1 = new GeometryInstance({
          geometry: new RectangleGeometry({
            ellipsoid: ellipsoid,
            rectangle: new Rectangle(
              rectangle.west,
              rectangle.south,
              rectangle.east,
              (rectangle.north + rectangle.south) * 0.5
            ),
          }),
          id: "rectangle1",
          attributes: {
            color: rectColorAttribute,
          },
        });
        const rectangleInstance2 = new GeometryInstance({
          geometry: new RectangleGeometry({
            ellipsoid: ellipsoid,
            rectangle: new Rectangle(
              rectangle.west,
              (rectangle.north + rectangle.south) * 0.5,
              rectangle.east,
              rectangle.north
            ),
          }),
          id: "rectangle2",
          attributes: {
            color: rectColorAttribute,
          },
        });

        const batchedPrimitive = new GroundPrimitive({
          geometryInstances: [rectangleInstance1, rectangleInstance2],
          asynchronous: false,
        });

        verifyLargerScene(batchedPrimitive, [0, 255, 255, 255], rectangle);
      });

      it("renders small GeometryInstances with texture", function () {
        if (
          !GroundPrimitive.isSupported(scene) ||
          !GroundPrimitive.supportsMaterials(scene)
        ) {
          return;
        }

        const whiteImageMaterial = Material.fromType(Material.DiffuseMapType);
        whiteImageMaterial.uniforms.image = "./Data/Images/White.png";

        const radians = CesiumMath.toRadians(0.1);
        const west = rectangle.west;
        const south = rectangle.south;
        const smallRectangle = new Rectangle(
          west,
          south,
          west + radians,
          south + radians
        );
        const smallRectanglePrimitive = new GroundPrimitive({
          geometryInstances: new GeometryInstance({
            geometry: new RectangleGeometry({
              ellipsoid: ellipsoid,
              rectangle: smallRectangle,
            }),
            id: "smallRectangle",
          }),
          appearance: new EllipsoidSurfaceAppearance({
            aboveGround: false,
            flat: true,
            material: whiteImageMaterial,
          }),
          asynchronous: false,
        });

        verifyLargerScene(
          smallRectanglePrimitive,
          [255, 255, 255, 255],
          smallRectangle
        );
      });

      it("renders large GeometryInstances with texture", function () {
        if (
          !GroundPrimitive.isSupported(scene) ||
          !GroundPrimitive.supportsMaterials(scene)
        ) {
          return;
        }

        const whiteImageMaterial = Material.fromType(Material.DiffuseMapType);
        whiteImageMaterial.uniforms.image = "./Data/Images/White.png";

        const radians = CesiumMath.toRadians(1.1);
        const west = rectangle.west;
        const south = rectangle.south;
        const largeRectangle = new Rectangle(
          west,
          south,
          west + radians,
          south + radians
        );
        const largeRectanglePrimitive = new GroundPrimitive({
          geometryInstances: new GeometryInstance({
            geometry: new RectangleGeometry({
              ellipsoid: ellipsoid,
              rectangle: largeRectangle,
            }),
          }),
          id: "largeRectangle",
          appearance: new EllipsoidSurfaceAppearance({
            aboveGround: false,
            flat: true,
            material: whiteImageMaterial,
          }),
          asynchronous: false,
        });

        verifyLargerScene(
          largeRectanglePrimitive,
          [255, 255, 255, 255],
          largeRectangle
        );
      });

      it("renders GeometryInstances with texture across the IDL", function () {
        if (
          !GroundPrimitive.isSupported(scene) ||
          !GroundPrimitive.supportsMaterials(scene)
        ) {
          return;
        }

        const whiteImageMaterial = Material.fromType(Material.DiffuseMapType);
        whiteImageMaterial.uniforms.image = "./Data/Images/White.png";

        const largeRectangle = Rectangle.fromDegrees(179.0, 30.0, -179.0, 31.0);
        const largeRectanglePrimitive = new GroundPrimitive({
          geometryInstances: new GeometryInstance({
            geometry: new RectangleGeometry({
              ellipsoid: ellipsoid,
              rectangle: largeRectangle,
            }),
          }),
          id: "largeRectangle",
          appearance: new EllipsoidSurfaceAppearance({
            aboveGround: false,
            flat: true,
            material: whiteImageMaterial,
          }),
          asynchronous: false,
        });

        verifyLargerScene(
          largeRectanglePrimitive,
          [255, 255, 255, 255],
          largeRectangle
        );
      });
    });

    it("renders with invert classification and an opaque color", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      scene.invertClassification = true;
      scene.invertClassificationColor = new Color(0.25, 0.25, 0.25, 1.0);

      rectangleInstance.attributes.show = new ShowGeometryInstanceAttribute(
        true
      );

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.camera.setView({ destination: rectangle });

      const invertedColor = new Array(4);
      invertedColor[0] = Color.floatToByte(
        Color.byteToFloat(depthColor[0]) * scene.invertClassificationColor.red
      );
      invertedColor[1] = Color.floatToByte(
        Color.byteToFloat(depthColor[1]) * scene.invertClassificationColor.green
      );
      invertedColor[2] = Color.floatToByte(
        Color.byteToFloat(depthColor[2]) * scene.invertClassificationColor.blue
      );
      invertedColor[3] = 255;

      scene.primitives.add(tilesetPrimitive);
      expect(scene).toRender(invertedColor);

      scene.groundPrimitives.add(primitive);
      expect(scene).toRender(rectColor);

      primitive.getGeometryInstanceAttributes("rectangle").show = [0];
      expect(scene).toRender(depthColor);

      scene.invertClassification = false;
    });

    it("renders with invert classification and a translucent color", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      if (!InvertClassification.isTranslucencySupported(scene.context)) {
        return;
      }

      scene.invertClassification = true;
      scene.invertClassificationColor = new Color(0.25, 0.25, 0.25, 0.25);

      rectangleInstance.attributes.show = new ShowGeometryInstanceAttribute(
        true
      );

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.camera.setView({ destination: rectangle });

      const invertedColor = new Array(4);
      invertedColor[0] = Color.floatToByte(
        Color.byteToFloat(depthColor[0]) *
          scene.invertClassificationColor.red *
          scene.invertClassificationColor.alpha
      );
      invertedColor[1] = Color.floatToByte(
        Color.byteToFloat(depthColor[1]) *
          scene.invertClassificationColor.green *
          scene.invertClassificationColor.alpha
      );
      invertedColor[2] = Color.floatToByte(
        Color.byteToFloat(depthColor[2]) *
          scene.invertClassificationColor.blue *
          scene.invertClassificationColor.alpha
      );
      invertedColor[3] = 255;

      scene.primitives.add(tilesetPrimitive);
      expect(scene).toRender(invertedColor);

      scene.groundPrimitives.add(primitive);
      expect(scene).toRender(rectColor);

      primitive.getGeometryInstanceAttributes("rectangle").show = [0];
      expect(scene).toRender(depthColor);

      scene.invertClassification = false;
    });

    it("renders bounding volume with debugShowBoundingVolume", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
        debugShowBoundingVolume: true,
      });

      scene.groundPrimitives.add(primitive);
      scene.camera.setView({ destination: rectangle });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
        expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
        expect(rgba[2]).toBeGreaterThanOrEqualTo(0);
        expect(rgba[3]).toEqual(255);
      });
    });

    it("renders shadow volume with debugShowShadowVolume", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
        debugShowShadowVolume: true,
      });

      scene.groundPrimitives.add(primitive);
      scene.camera.setView({ destination: rectangle });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
        expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
        expect(rgba[2]).toBeGreaterThanOrEqualTo(0);
        expect(rgba[3]).toEqual(255);
      });
    });

    it("get per instance attributes", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      const attributes = primitive.getGeometryInstanceAttributes("rectangle");
      expect(attributes.color).toBeDefined();
    });

    it("modify color instance attribute", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      scene.primitives.destroyPrimitives = false;
      scene.primitives.removeAll();
      scene.primitives.destroyPrimitives = true;

      scene.groundPrimitives.destroyPrimitives = false;
      scene.groundPrimitives.removeAll();
      scene.groundPrimitives.destroyPrimitives = true;

      const newColor = [255, 255, 255, 255];
      const attributes = primitive.getGeometryInstanceAttributes("rectangle");
      expect(attributes.color).toBeDefined();
      attributes.color = newColor;

      verifyGroundPrimitiveRender(primitive, newColor);
    });

    it("modify show instance attribute", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      rectangleInstance.attributes.show = new ShowGeometryInstanceAttribute(
        true
      );

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      scene.primitives.destroyPrimitives = false;
      scene.primitives.removeAll();
      scene.primitives.destroyPrimitives = true;

      scene.groundPrimitives.destroyPrimitives = false;
      scene.groundPrimitives.removeAll();
      scene.groundPrimitives.destroyPrimitives = true;

      const attributes = primitive.getGeometryInstanceAttributes("rectangle");
      expect(attributes.show).toBeDefined();
      attributes.show = [0];

      verifyGroundPrimitiveRender(primitive, depthColor);
    });

    it("renders with distance display condition per instance attribute", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      const near = 10000.0;
      const far = 1000000.0;
      const rect = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);

      const rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(1.0, 1.0, 0.0, 1.0)
      );
      const rectInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: rectangle,
        }),
        id: "rect",
        attributes: {
          color: rectColorAttribute,
          distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(
            near,
            far
          ),
        },
      });

      primitive = new GroundPrimitive({
        geometryInstances: rectInstance,
        asynchronous: false,
      });

      scene.primitives.add(globePrimitive);
      scene.groundPrimitives.add(primitive);
      scene.camera.setView({ destination: rect });
      scene.renderForSpecs();

      const boundingSphere = primitive.getGeometryInstanceAttributes("rect")
        .boundingSphere;
      const center = boundingSphere.center;
      const radius = boundingSphere.radius;

      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius)
      );
      expect(scene).toRender([0, 0, 255, 255]);

      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + near + 1.0)
      );
      expect(scene).notToRender([0, 0, 255, 255]);

      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + far + 1.0)
      );
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("get bounding sphere from per instance attribute", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      const attributes = primitive.getGeometryInstanceAttributes("rectangle");
      expect(attributes.boundingSphere).toBeDefined();
    });

    it("getGeometryInstanceAttributes returns same object each time", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      const attributes = primitive.getGeometryInstanceAttributes("rectangle");
      const attributes2 = primitive.getGeometryInstanceAttributes("rectangle");
      expect(attributes).toBe(attributes2);
    });

    it("picking in 3D", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      expect(scene).toPickAndCall(function (result) {
        expect(result.id).toEqual("rectangle");
      });
    });

    it("picking in 2D", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.morphTo2D(0);
      verifyGroundPrimitiveRender(primitive, rectColor);

      expect(scene).toPickAndCall(function (result) {
        expect(result.id).toEqual("rectangle");
      });
    });

    it("picking in Columbus View", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.morphToColumbusView(0);
      verifyGroundPrimitiveRender(primitive, rectColor);

      expect(scene).toPickAndCall(function (result) {
        expect(result.id).toEqual("rectangle");
      });
    });

    it("picking without depth texture", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      spyOn(GroundPrimitive, "_supportsMaterials").and.callFake(function () {
        return false;
      });

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      expect(scene).toPickAndCall(function (result) {
        expect(result.id).toEqual("rectangle");
      });
    });

    it("does not pick when allowPicking is false", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        allowPicking: false,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      expect(scene).notToPick();
    });

    it("internally invalid asynchronous geometry resolves promise and sets ready", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: new GeometryInstance({
          geometry: PolygonGeometry.fromPositions({
            positions: [],
          }),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(Color.RED),
          },
        }),
        compressVertices: false,
      });

      scene.groundPrimitives.add(primitive);

      return pollToPromise(function () {
        scene.renderForSpecs();
        return primitive.ready;
      }).then(function () {
        return primitive.readyPromise.then(function (arg) {
          expect(arg).toBe(primitive);
          expect(primitive.ready).toBe(true);
        });
      });
    });

    it("internally invalid synchronous geometry resolves promise and sets ready", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: new GeometryInstance({
          geometry: PolygonGeometry.fromPositions({
            positions: [],
          }),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(Color.RED),
          },
        }),
        asynchronous: false,
        compressVertices: false,
      });

      scene.groundPrimitives.add(primitive);

      return pollToPromise(function () {
        scene.renderForSpecs();
        return primitive.ready;
      }).then(function () {
        return primitive.readyPromise.then(function (arg) {
          expect(arg).toBe(primitive);
          expect(primitive.ready).toBe(true);
        });
      });
    });

    it("update throws when batched instance colors are different and materials on GroundPrimitives are not supported", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }
      spyOn(GroundPrimitive, "_supportsMaterials").and.callFake(function () {
        return false;
      });

      let rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(0.0, 1.0, 1.0, 1.0)
      );
      const rectangleInstance1 = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: new Rectangle(
            rectangle.west,
            rectangle.south,
            rectangle.east,
            (rectangle.north + rectangle.south) * 0.5
          ),
        }),
        id: "rectangle1",
        attributes: {
          color: rectColorAttribute,
        },
      });
      rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(1.0, 1.0, 0.0, 1.0)
      );
      const rectangleInstance2 = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: new Rectangle(
            rectangle.west,
            (rectangle.north + rectangle.south) * 0.5,
            rectangle.east,
            rectangle.north
          ),
        }),
        id: "rectangle2",
        attributes: {
          color: rectColorAttribute,
        },
      });

      primitive = new GroundPrimitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        asynchronous: false,
      });

      expect(function () {
        verifyGroundPrimitiveRender(primitive, rectColorAttribute.value);
      }).toThrowDeveloperError();
    });

    it("update throws when one batched instance color is undefined", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      const rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(0.0, 1.0, 1.0, 1.0)
      );
      const rectangleInstance1 = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: new Rectangle(
            rectangle.west,
            rectangle.south,
            rectangle.east,
            (rectangle.north + rectangle.south) * 0.5
          ),
        }),
        id: "rectangle1",
        attributes: {
          color: rectColorAttribute,
        },
      });
      const rectangleInstance2 = new GeometryInstance({
        geometry: new RectangleGeometry({
          ellipsoid: ellipsoid,
          rectangle: new Rectangle(
            rectangle.west,
            (rectangle.north + rectangle.south) * 0.5,
            rectangle.east,
            rectangle.north
          ),
        }),
        id: "rectangle2",
      });

      primitive = new GroundPrimitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        asynchronous: false,
      });

      expect(function () {
        verifyGroundPrimitiveRender(primitive, rectColorAttribute.value);
      }).toThrowDeveloperError();
    });

    it("setting per instance attribute throws when value is undefined", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      const attributes = primitive.getGeometryInstanceAttributes("rectangle");

      expect(function () {
        attributes.color = undefined;
      }).toThrowDeveloperError();
    });

    it("can disable picking when asynchronous", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: true,
        allowPicking: false,
      });

      scene.groundPrimitives.add(primitive);

      return pollToPromise(function () {
        scene.renderForSpecs();
        return primitive.ready;
      }).then(function () {
        const attributes = primitive.getGeometryInstanceAttributes("rectangle");
        expect(function () {
          attributes.color = undefined;
        }).toThrowDeveloperError();
      });
    });

    it("getGeometryInstanceAttributes throws without id", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      expect(function () {
        primitive.getGeometryInstanceAttributes();
      }).toThrowDeveloperError();
    });

    it("getGeometryInstanceAttributes throws if update was not called", function () {
      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      expect(function () {
        primitive.getGeometryInstanceAttributes("rectangle");
      }).toThrowDeveloperError();
    });

    it("getGeometryInstanceAttributes returns undefined if id does not exist", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      verifyGroundPrimitiveRender(primitive, rectColor);

      expect(
        primitive.getGeometryInstanceAttributes("unknown")
      ).not.toBeDefined();
    });

    it("isDestroyed", function () {
      primitive = new GroundPrimitive();
      expect(primitive.isDestroyed()).toEqual(false);
      primitive.destroy();
      expect(primitive.isDestroyed()).toEqual(true);
    });

    it("renders when using asynchronous pipeline", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
      });

      scene.groundPrimitives.add(primitive);

      return pollToPromise(function () {
        scene.renderForSpecs();
        return primitive.ready;
      }).then(function () {
        // verifyGroundPrimitiveRender adds the primitive, so remove it to avoid being added twice.
        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        verifyGroundPrimitiveRender(primitive, rectColor);
      });
    });

    it("destroy before asynchronous pipeline is complete", function () {
      if (!GroundPrimitive.isSupported(scene)) {
        return;
      }

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
      });

      scene.groundPrimitives.add(primitive);

      scene.renderForSpecs();
      primitive.destroy();
      expect(primitive.isDestroyed()).toEqual(true);

      // The primitive has already been destroyed, so remove it from the scene so it doesn't get destroyed again.
      scene.groundPrimitives.destroyPrimitives = false;
      scene.groundPrimitives.removeAll();
      scene.groundPrimitives.destroyPrimitives = true;
    });

    it("creating a synchronous primitive throws if initializeTerrainHeights wasn't called", function () {
      // Make it seem like initializeTerrainHeights was never called
      const initPromise = ApproximateTerrainHeights._initPromise;
      const terrainHeights = ApproximateTerrainHeights._terrainHeights;
      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;

      primitive = new GroundPrimitive({
        geometryInstances: rectangleInstance,
        asynchronous: false,
      });

      scene.groundPrimitives.add(primitive);

      if (GroundPrimitive.isSupported(scene)) {
        expect(function () {
          scene.renderForSpecs();
        }).toThrowDeveloperError();
      }

      // Set back to initialized state
      ApproximateTerrainHeights._initPromise = initPromise;
      ApproximateTerrainHeights._terrainHeights = terrainHeights;
    });
  },
  "WebGL"
);
