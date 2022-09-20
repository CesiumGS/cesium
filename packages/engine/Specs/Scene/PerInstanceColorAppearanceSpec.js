import {
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  Rectangle,
  RectangleGeometry,
  Appearance,
  PerInstanceColorAppearance,
  Primitive,
} from "../../../Source/Cesium.js";

import createScene from "../createScene.js";

describe(
  "Scene/PerInstanceColorAppearance",
  function () {
    let scene;
    let rectangle;
    let primitive;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
      rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
      scene.camera.setView({ destination: rectangle });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            rectangle: rectangle,
          }),
          attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
          },
        }),
        asynchronous: false,
      });
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitive = primitive && primitive.destroy();
    });

    it("constructor", function () {
      const a = new PerInstanceColorAppearance();

      expect(a.material).not.toBeDefined();
      expect(a.vertexShaderSource).toBeDefined();
      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(true, false)
      );
      expect(a.vertexFormat).toEqual(PerInstanceColorAppearance.VERTEX_FORMAT);
      expect(a.flat).toEqual(false);
      expect(a.faceForward).toEqual(true);
      expect(a.translucent).toEqual(true);
      expect(a.closed).toEqual(false);
    });

    it("renders", function () {
      primitive.appearance = new PerInstanceColorAppearance();

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders flat", function () {
      primitive.appearance = new PerInstanceColorAppearance({
        flat: true,
        translucent: false,
        closed: true,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });
  },
  "WebGL"
);
