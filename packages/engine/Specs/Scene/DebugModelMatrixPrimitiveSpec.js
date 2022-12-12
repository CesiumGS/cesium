import { Cartesian3, Matrix4, DebugModelMatrixPrimitive } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/DebugModelMatrixPrimitive",
  function () {
    let scene;

    beforeAll(function () {
      scene = createScene();
      const camera = scene.camera;
      camera.position = new Cartesian3(1.02, 0.0, 0.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("gets the default properties", function () {
      const p = new DebugModelMatrixPrimitive();
      expect(p.length).toEqual(10000000.0);
      expect(p.width).toEqual(2.0);
      expect(p.modelMatrix).toEqual(Matrix4.IDENTITY);
      expect(p.show).toEqual(true);
      expect(p.id).not.toBeDefined();
      p.destroy();
    });

    it("Constructs with options", function () {
      const p = new DebugModelMatrixPrimitive({
        length: 10.0,
        width: 1.0,
        modelMatrix: Matrix4.fromUniformScale(2.0),
        show: false,
        id: "id",
      });
      expect(p.length).toEqual(10.0);
      expect(p.width).toEqual(1.0);
      expect(p.modelMatrix).toEqual(Matrix4.fromUniformScale(2.0));
      expect(p.show).toEqual(false);
      expect(p.id).toEqual("id");
      p.destroy();
    });

    it("renders", function () {
      const p = scene.primitives.add(new DebugModelMatrixPrimitive());
      expect(scene).notToRender([0, 0, 0, 255]);

      // Update and render again
      p.length = 100.0;
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("does not render when show is false", function () {
      scene.primitives.add(
        new DebugModelMatrixPrimitive({
          show: false,
        })
      );
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("is picked", function () {
      const p = scene.primitives.add(
        new DebugModelMatrixPrimitive({
          id: "id",
        })
      );

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toBe(p);
        expect(result.id).toBe("id");
      });
    });

    it("isDestroyed", function () {
      const p = new DebugModelMatrixPrimitive();
      expect(p.isDestroyed()).toEqual(false);
      p.destroy();
      expect(p.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
