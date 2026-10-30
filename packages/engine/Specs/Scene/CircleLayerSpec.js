import { Cartesian3, Color } from "@cesium/core";
import {
  BlendOption,
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  Camera,
  CircleLayer,
  SceneMode,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/CircleLayer",
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
      scene.vectorPrimitives.removeAll();
      collection.destroy();
    });

    it("throws without a collection", function () {
      expect(() => new CircleLayer({})).toThrowDeveloperError();
    });

    it("renders points with the layer color", function () {
      const material = new BufferPointMaterial({ color: Color.RED, size: 8 });
      collection.add({ position, material }, new BufferPoint());

      scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          color: Color.LIME,
          blendOption: BlendOption.OPAQUE,
        }),
      );

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders points after the layer color changes", function () {
      collection.add({ position }, new BufferPoint());

      const layer = scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          color: Color.LIME,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 255, 0, 255]);

      layer.color = Color.BLUE;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders the outline color", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorPrimitives.add(
        new CircleLayer({
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

      scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          color: Color.RED.withAlpha(0.6),
          blendOption: BlendOption.TRANSLUCENT,
        }),
      );

      expect(scene).toRender([153, 0, 0, 255]);
    });

    it("renders points after blendOption changes", function () {
      collection.add({ position }, new BufferPoint());

      const layer = scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          color: Color.RED.withAlpha(0.6),
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      layer.blendOption = BlendOption.TRANSLUCENT;
      expect(scene).toRender([153, 0, 0, 255]);
    });

    it("does not render if layer.show = false", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          blendOption: BlendOption.OPAQUE,
          show: false,
        }),
      );

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render if point.show = false", function () {
      const point = collection.add({ position }, new BufferPoint());

      scene.vectorPrimitives.add(
        new CircleLayer({ collection, blendOption: BlendOption.OPAQUE }),
      );
      expect(scene).toRender([255, 255, 255, 255]);

      point.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders one collection with two layers", function () {
      const point = collection.add({ position }, new BufferPoint());

      const red = scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          color: Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      const blue = scene.vectorPrimitives.add(
        new CircleLayer({
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

    it("renders a collection after another layer is destroyed", function () {
      collection.add({ position }, new BufferPoint());

      const red = scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          color: Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      scene.vectorPrimitives.remove(red);
      expect(red.isDestroyed()).toBe(true);
      expect(scene).toRender([0, 0, 0, 255]);

      scene.vectorPrimitives.add(
        new CircleLayer({
          collection,
          color: Color.BLUE,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("picks points", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorPrimitives.add(new CircleLayer({ collection }));

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });
    });

    it("does not pick if layer.show = false", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorPrimitives.add(new CircleLayer({ collection, show: false }));

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });
  },
  "WebGL",
);
