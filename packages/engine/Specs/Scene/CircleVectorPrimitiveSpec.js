import { Cartesian3, Color } from "@cesium/core";
import {
  BlendOption,
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  Camera,
  CircleVectorPrimitive,
  SceneMode,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/CircleVectorPrimitive",
  () => {
    let scene;
    let collection;

    const position = new Cartesian3(0, -1000, 0);

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.mode = SceneMode.SCENE3D;
      scene.camera = new Camera(scene);
      collection = new BufferPointCollection({ allowPicking: true });
    });

    afterEach(function () {
      scene.primitives.removeAll();
      collection.destroy();
    });

    it("throws without a collection", function () {
      expect(() => new CircleVectorPrimitive({})).toThrowDeveloperError();
    });

    it("renders points with the primitive color", function () {
      const material = new BufferPointMaterial({ color: Color.RED, size: 8 });
      collection.add({ position, material }, new BufferPoint());

      scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.LIME,
          blendOption: BlendOption.OPAQUE,
        }),
      );

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders points after the primitive color changes", function () {
      collection.add({ position }, new BufferPoint());

      const primitive = scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.LIME,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 255, 0, 255]);

      primitive.color = Color.BLUE;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders the outline color", function () {
      collection.add({ position }, new BufferPoint());

      scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          radius: 0.0,
          color: Color.RED,
          outlineColor: Color.BLUE,
          outlineWidth: 4.0,
          blendOption: BlendOption.OPAQUE,
        }),
      );

      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders translucent points", function () {
      collection.add({ position }, new BufferPoint());

      scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.RED.withAlpha(0.6),
          blendOption: BlendOption.TRANSLUCENT,
        }),
      );

      expect(scene).toRender([153, 0, 0, 255]);
    });

    it("renders points after blendOption changes", function () {
      collection.add({ position }, new BufferPoint());

      const primitive = scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.RED.withAlpha(0.6),
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      primitive.blendOption = BlendOption.TRANSLUCENT;
      expect(scene).toRender([153, 0, 0, 255]);
    });

    it("does not render if primitive.show = false", function () {
      collection.add({ position }, new BufferPoint());

      scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          blendOption: BlendOption.OPAQUE,
          show: false,
        }),
      );

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if point.show = false", function () {
      const point = collection.add({ position }, new BufferPoint());

      scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 255, 255, 255]);

      point.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders one collection with two primitives", function () {
      const point = collection.add({ position }, new BufferPoint());

      const red = scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      const blue = scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.BLUE,
          blendOption: BlendOption.OPAQUE,
          show: false,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      red.show = false;
      blue.show = true;
      expect(scene).toRender([0, 0, 255, 255]);

      point.show = false;
      expect(scene).toRender([0, 0, 0, 255]);

      red.show = true;
      blue.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("draws a later translucent primitive over an earlier one without OIT", function () {
      const sceneWithoutOIT = createScene({
        orderIndependentTranslucency: false,
      });
      sceneWithoutOIT.camera.position = new Cartesian3(10.0, 0.0, 0.0);
      sceneWithoutOIT.camera.direction = new Cartesian3(-1.0, 0.0, 0.0);
      sceneWithoutOIT.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

      collection.add({ position: Cartesian3.ZERO }, new BufferPoint());
      sceneWithoutOIT.primitives.add(
        new CircleVectorPrimitive({ collection, color: Color.RED }),
      );
      sceneWithoutOIT.primitives.add(
        new CircleVectorPrimitive({ collection, color: Color.LIME }),
      );

      expect(sceneWithoutOIT).toRender([0, 255, 0, 255]);

      sceneWithoutOIT.destroyForSpecs();
    });

    it("renders a collection after another primitive is destroyed", function () {
      collection.add({ position }, new BufferPoint());

      const red = scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      scene.primitives.remove(red);
      expect(red.isDestroyed()).toBe(true);
      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(
        new CircleVectorPrimitive({
          collection,
          color: Color.BLUE,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("picks points", function () {
      collection.add({ position }, new BufferPoint());

      scene.primitives.add(new CircleVectorPrimitive({ collection }));

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });
    });

    it("does not pick if primitive.show = false", function () {
      collection.add({ position }, new BufferPoint());

      scene.primitives.add(
        new CircleVectorPrimitive({ collection, show: false }),
      );

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });
  },
  "WebGL",
);
