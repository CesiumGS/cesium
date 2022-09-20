import {
  Color,
  ColorGeometryInstanceAttribute,
  defaultValue,
  GeometryInstance,
  Rectangle,
  RectangleGeometry,
  Appearance,
  Material,
  MaterialAppearance,
  Primitive,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;

describe(
  "Scene/MaterialAppearance",
  function () {
    let scene;
    let primitive;
    const rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
    const backgroundColor = [0, 0, 255, 255];

    beforeAll(function () {
      scene = createScene();
      Color.unpack(backgroundColor, 0, scene.backgroundColor);
      scene.primitives.destroyPrimitives = false;
      scene.camera.setView({ destination: rectangle });
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitive = primitive && primitive.destroy();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function createPrimitive(vertexFormat) {
      vertexFormat = defaultValue(
        vertexFormat,
        MaterialAppearance.MaterialSupport.ALL.vertexFormat
      );
      primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            vertexFormat: vertexFormat,
            rectangle: rectangle,
          }),
          attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
          },
        }),
        asynchronous: false,
      });
    }

    it("constructor", function () {
      const a = new MaterialAppearance();

      expect(a.materialSupport).toEqual(
        MaterialAppearance.MaterialSupport.TEXTURED
      );
      expect(a.material).toBeDefined();
      expect(a.material.type).toEqual(Material.ColorType);
      expect(a.vertexShaderSource).toEqual(
        MaterialAppearance.MaterialSupport.TEXTURED.vertexShaderSource
      );
      expect(a.fragmentShaderSource).toEqual(
        MaterialAppearance.MaterialSupport.TEXTURED.fragmentShaderSource
      );
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(true, false)
      );
      expect(a.vertexFormat).toEqual(
        MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat
      );
      expect(a.flat).toEqual(false);
      expect(a.faceForward).toEqual(true);
      expect(a.translucent).toEqual(true);
      expect(a.closed).toEqual(false);
    });

    it("renders basic", function () {
      createPrimitive(MaterialAppearance.MaterialSupport.BASIC.vertexFormat);
      primitive.appearance = new MaterialAppearance({
        materialSupport: MaterialAppearance.MaterialSupport.BASIC,
        translucent: false,
        closed: true,
        material: Material.fromType(Material.DotType),
      });

      expect(scene).toRender(backgroundColor);

      scene.primitives.add(primitive);
      expect(scene).notToRender(backgroundColor);
    });

    it("renders textured", function () {
      createPrimitive(MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat);
      primitive.appearance = new MaterialAppearance({
        materialSupport: MaterialAppearance.MaterialSupport.TEXTURED,
        translucent: false,
        closed: true,
        material: Material.fromType(Material.ImageType, {
          image: "../Data/images/Red16x16.png",
        }),
      });

      expect(scene).toRender(backgroundColor);

      scene.primitives.add(primitive);
      expect(scene).notToRender(backgroundColor);
    });

    it("renders all", function () {
      createPrimitive(MaterialAppearance.MaterialSupport.ALL.vertexFormat);
      primitive.appearance = new MaterialAppearance({
        materialSupport: MaterialAppearance.MaterialSupport.ALL,
        translucent: false,
        closed: true,
        material: Material.fromType(Material.NormalMapType),
      });

      expect(scene).toRender(backgroundColor);

      scene.primitives.add(primitive);
      expect(scene).notToRender(backgroundColor);
    });
  },
  "WebGL"
);
