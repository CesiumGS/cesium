import {
  ArcType,
  Cartesian3,
  GeometryInstance,
  PolylineGeometry,
  Appearance,
  Material,
  PolylineMaterialAppearance,
  Primitive,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;

describe(
  "Scene/PolylineMaterialAppearance",
  function () {
    let scene;
    let primitive;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    it("constructor", function () {
      const a = new PolylineMaterialAppearance();

      expect(a.material).toBeDefined();
      expect(a.material.type).toEqual(Material.ColorType);
      expect(a.vertexShaderSource).toBeDefined();
      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(true, false)
      );
      expect(a.vertexFormat).toEqual(PolylineMaterialAppearance.VERTEX_FORMAT);
      expect(a.translucent).toEqual(true);
      expect(a.closed).toEqual(false);
    });

    it("renders", function () {
      primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new PolylineGeometry({
            positions: [
              new Cartesian3(0.0, -10000000, 0.0),
              new Cartesian3(0.0, 1000000.0, 0.0),
            ],
            width: 10.0,
            vertexFormat: PolylineMaterialAppearance.VERTEX_FORMAT,
            arcType: ArcType.NONE,
          }),
        }),
        appearance: new PolylineMaterialAppearance({
          material: Material.fromType(Material.PolylineOutlineType),
          translucent: false,
        }),
        asynchronous: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });
  },
  "WebGL"
);
