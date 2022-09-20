import {
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  Rectangle,
  RectangleGeometry,
  Appearance,
  EllipsoidSurfaceAppearance,
  Material,
  Primitive,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;

describe(
  "Scene/EllipsoidSurfaceAppearance",
  function () {
    let scene;
    let rectangle;
    let primitive;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
      scene.frameState.scene3DOnly = false;

      rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
    });

    beforeEach(function () {
      scene.camera.setView({ destination: rectangle });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    it("constructor", function () {
      const a = new EllipsoidSurfaceAppearance();

      expect(a.material).toBeDefined();
      expect(a.material.type).toEqual(Material.ColorType);
      expect(a.vertexShaderSource).toBeDefined();
      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(true, true)
      );
      expect(a.vertexFormat).toEqual(EllipsoidSurfaceAppearance.VERTEX_FORMAT);
      expect(a.flat).toEqual(false);
      expect(a.faceForward).toEqual(false);
      expect(a.translucent).toEqual(true);
      expect(a.aboveGround).toEqual(false);
      expect(a.closed).toEqual(false);
    });

    it("renders", function () {
      primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            rectangle: rectangle,
            vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
          }),
          attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
          },
        }),
        asynchronous: false,
      });
      primitive.appearance = new EllipsoidSurfaceAppearance();

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });
  },
  "WebGL"
);
