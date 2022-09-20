import {
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  defaultValue,
  defined,
  GeometryInstance,
  PerspectiveFrustum,
  Rectangle,
  RectangleGeometry,
  Resource,
  Transforms,
  BillboardCollection,
  Globe,
  HorizontalOrigin,
  LabelCollection,
  Material,
  PerInstanceColorAppearance,
  PolylineCollection,
  Primitive,
  SceneMode,
  VerticalOrigin,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";;
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/PrimitiveCulling",
  function () {
    let scene;
    const rectangle = Rectangle.fromDegrees(-100.0, 30.0, -93.0, 37.0);
    let primitive;
    let greenImage;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;

      return Resource.fetchImage("./Data/Images/Green.png").then(function (
        image
      ) {
        greenImage = image;
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.morphTo3D(0.0);

      const camera = scene.camera;
      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitive = primitive && primitive.destroy();
    });

    function testCull(primitive) {
      scene.camera.setView({
        destination: rectangle,
      });

      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(primitive);

      expect(scene).notToRender([0, 0, 0, 255]);

      if (scene.mode !== SceneMode.SCENE2D) {
        // move the camera through the rectangle so that is behind the view frustum
        scene.camera.moveForward(100000000.0);
        expect(scene).toRender([0, 0, 0, 255]);
      }
    }

    function testCullIn3D(primitive) {
      scene.mode = SceneMode.SCENE3D;
      testCull(primitive);
    }

    function testCullInColumbusView(primitive) {
      scene.mode = SceneMode.COLUMBUS_VIEW;
      testCull(primitive);
    }

    function testCullIn2D(primitive) {
      scene.mode = SceneMode.SCENE2D;
      testCull(primitive);
    }

    function testOcclusionCull(primitive) {
      scene.mode = SceneMode.SCENE3D;
      scene.camera.setView({
        destination: rectangle,
      });

      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(primitive);

      expect(scene).notToRender([0, 0, 0, 255]);

      // create the globe; it should occlude the primitive
      scene.globe = new Globe();

      expect(scene).toRender([0, 0, 0, 255]);

      scene.globe = undefined;
    }

    function createPrimitive(height) {
      height = defaultValue(height, 0);
      const primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            rectangle: rectangle,
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            height: height,
          }),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(Color.RED),
          },
        }),
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });
      return primitive;
    }

    it("frustum culls polygon in 3D", function () {
      primitive = createPrimitive();
      testCullIn3D(primitive);
    });

    it("frustum culls polygon in Columbus view", function () {
      primitive = createPrimitive();
      testCullInColumbusView(primitive);
    });

    it("frustum culls polygon in 2D", function () {
      primitive = createPrimitive();
      testCullIn2D(primitive);
    });

    it("polygon occlusion", function () {
      primitive = createPrimitive(-1000000.0);
      testOcclusionCull(primitive);
    });

    function allLabelsReady(labels) {
      // render until all labels have been updated
      return pollToPromise(function () {
        scene.renderForSpecs();
        const backgroundBillboard = labels._backgroundBillboardCollection.get(
          0
        );
        return (
          (!defined(backgroundBillboard) || backgroundBillboard.ready) &&
          labels._labelsToUpdate.length === 0
        );
      });
    }

    function createLabels(height) {
      height = defaultValue(height, 0);
      const labels = new LabelCollection();
      const center = Cartesian3.fromDegrees(-96.5, 33.5, height);
      labels.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
      labels.add({
        position: Cartesian3.ZERO,
        text: "X",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });
      return labels;
    }

    function testLabelsCull(labels, occulude) {
      scene.camera.setView({
        destination: rectangle,
      });

      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(labels);

      return allLabelsReady(labels).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        if (occulude) {
          // create the globe; it should occlude the primitive
          scene.globe = new Globe();
          expect(scene).toRender([0, 0, 0, 255]);
          scene.globe = undefined;
          return;
        }

        if (scene.mode !== SceneMode.SCENE2D) {
          // move the camera through the rectangle so that is behind the view frustum
          scene.camera.moveForward(100000000.0);
          expect(scene).toRender([0, 0, 0, 255]);
        }
      });
    }

    it("frustum culls labels in 3D", function () {
      primitive = createLabels();
      scene.mode = SceneMode.SCENE3D;
      return testLabelsCull(primitive);
    });

    it("frustum culls labels in Columbus view", function () {
      primitive = createLabels();
      scene.mode = SceneMode.COLUMBUS_VIEW;
      return testLabelsCull(primitive);
    });

    it("frustum culls labels in 2D", function () {
      primitive = createLabels();
      scene.mode = SceneMode.SCENE2D;
      return testLabelsCull(primitive);
    });

    it("label occlusion", function () {
      primitive = createLabels(-1000000.0);
      scene.mode = SceneMode.SCENE3D;
      return testLabelsCull(primitive, true);
    });

    function createBillboard(height) {
      height = defaultValue(height, 0);
      const billboards = new BillboardCollection();
      billboards.add({
        position: Cartesian3.fromDegrees(-96.5, 33.5, height),
        image: greenImage,
      });
      return billboards;
    }

    function testBillboardsCull(billboards, occulude) {
      scene.camera.setView({
        destination: rectangle,
      });

      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(billboards);

      return pollToPromise(function () {
        scene.renderForSpecs();
        return billboards.get(0).ready;
      }).then(function () {
        expect(scene).notToRender([0, 0, 0, 255]);

        if (occulude) {
          // create the globe; it should occlude the primitive
          scene.globe = new Globe();
          expect(scene).toRender([0, 0, 0, 255]);
          scene.globe = undefined;
          return;
        }

        if (scene.mode !== SceneMode.SCENE2D) {
          // move the camera through the rectangle so that is behind the view frustum
          scene.camera.moveForward(100000000.0);
          expect(scene).toRender([0, 0, 0, 255]);
        }
      });
    }

    it("frustum culls billboards in 3D", function () {
      primitive = createBillboard();
      scene.mode = SceneMode.SCENE3D;
      return testBillboardsCull(primitive);
    });

    it("frustum culls billboards in Columbus view", function () {
      primitive = createBillboard();
      scene.mode = SceneMode.COLUMBUS_VIEW;
      return testBillboardsCull(primitive);
    });

    it("frustum culls billboards in 2D", function () {
      primitive = createBillboard();
      scene.mode = SceneMode.SCENE2D;
      return testBillboardsCull(primitive);
    });

    it("billboard occlusion", function () {
      primitive = createBillboard(-1000000.0);
      scene.mode = SceneMode.SCENE3D;
      return testBillboardsCull(primitive, true);
    });

    function createPolylines(height) {
      height = defaultValue(height, 0);
      const material = Material.fromType("Color");
      material.translucent = false;

      const polylines = new PolylineCollection();
      polylines.add({
        positions: Cartesian3.fromDegreesArrayHeights([
          -100.0,
          30.0,
          height,
          -93.0,
          37.0,
          height,
        ]),
        material: material,
      });
      return polylines;
    }

    it("frustum culls polylines in 3D", function () {
      primitive = createPolylines();
      testCullIn3D(primitive);
    });

    it("frustum culls polylines in Columbus view", function () {
      primitive = createPolylines();
      testCullInColumbusView(primitive);
    });

    it("frustum culls polylines in 2D", function () {
      primitive = createPolylines();
      testCullIn2D(primitive);
    });

    it("polyline occlusion", function () {
      primitive = createPolylines(-1000000.0);
      testOcclusionCull(primitive);
    });
  },
  "WebGL"
);
