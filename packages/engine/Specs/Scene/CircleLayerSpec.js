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
      scene.vectorLayers.removeAll();
      collection.destroy();
    });

    it("throws without a collection", function () {
      expect(() => new CircleLayer({})).toThrowDeveloperError();
    });

    it("renders points with the layer color", function () {
      const material = new BufferPointMaterial({ color: Color.RED, size: 8 });
      collection.add({ position, material }, new BufferPoint());

      scene.vectorLayers.add(
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

      const layer = scene.vectorLayers.add(
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

      scene.vectorLayers.add(
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

      scene.vectorLayers.add(
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

      const layer = scene.vectorLayers.add(
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

      scene.vectorLayers.add(
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

      scene.vectorLayers.add(
        new CircleLayer({ collection, blendOption: BlendOption.OPAQUE }),
      );
      expect(scene).toRender([255, 255, 255, 255]);

      point.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders one collection with two layers", function () {
      const point = collection.add({ position }, new BufferPoint());

      const red = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      const blue = scene.vectorLayers.add(
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

      const red = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      scene.vectorLayers.remove(red);
      expect(red.isDestroyed()).toBe(true);
      expect(scene).toRender([0, 0, 0, 255]);

      scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: Color.BLUE,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders points with a color callback", function () {
      collection.add({ position, featureId: 7 }, new BufferPoint());

      scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: (point) => (point.featureId === 7 ? Color.LIME : Color.RED),
          blendOption: BlendOption.OPAQUE,
        }),
      );

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders points with a radius callback", function () {
      collection.add({ position }, new BufferPoint());

      const layer = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          radius: () => 0.0,
          color: Color.RED,
          outlineColor: Color.BLUE,
          outlineWidth: 4.0,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 0, 255, 255]);

      layer.radius = () => 4.0;
      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("renders the outline color from callbacks", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorLayers.add(
        new CircleLayer({
          collection,
          radius: 0.0,
          color: Color.RED,
          outlineColor: () => Color.BLUE,
          outlineWidth: () => 4.0,
          blendOption: BlendOption.OPAQUE,
        }),
      );

      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders translucent points with a color callback", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: () => Color.RED.withAlpha(0.6),
          blendOption: BlendOption.TRANSLUCENT,
        }),
      );

      expect(scene).toRender([153, 0, 0, 255]);
    });

    it("filters points", function () {
      collection.add({ position }, new BufferPoint());

      const layer = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          filter: () => false,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 0, 0, 255]);

      layer.filter = () => true;
      expect(scene).toRender([255, 255, 255, 255]);

      layer.filter = undefined;
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("does not render filtered-in points if point.show = false", function () {
      const point = collection.add({ position }, new BufferPoint());

      scene.vectorLayers.add(
        new CircleLayer({
          collection,
          filter: () => true,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 255, 255, 255]);

      point.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders points after switching between values and callbacks", function () {
      collection.add({ position }, new BufferPoint());

      const layer = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: () => Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      layer.color = Color.LIME;
      expect(scene).toRender([0, 255, 0, 255]);

      layer.color = () => Color.BLUE;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders points after a global value changes while a callback is set", function () {
      collection.add({ position }, new BufferPoint());

      const layer = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          radius: () => 4.0,
          color: Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      layer.color = Color.BLUE;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("re-evaluates callbacks after makeStyleDirty", function () {
      collection.add({ position, featureId: 0 }, new BufferPoint());
      const colors = [Color.RED];

      const layer = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: (point) => colors[point.featureId],
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);

      colors[0] = Color.BLUE;
      expect(scene).toRender([255, 0, 0, 255]);

      layer.makeStyleDirty();
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("evaluates callbacks only for changed points", function () {
      const point = collection.add({ position }, new BufferPoint());
      collection.add({ position }, new BufferPoint());

      let calls = 0;
      scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: () => {
            calls++;
            return Color.RED;
          },
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([255, 0, 0, 255]);
      const initialCalls = calls;
      expect(initialCalls).toBeGreaterThanOrEqual(2);

      scene.renderForSpecs();
      expect(calls).toBe(initialCalls);

      point.show = false;
      scene.renderForSpecs();
      expect(calls).toBe(initialCalls + 1);
    });

    it("evaluates callbacks for added points", function () {
      scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: () => Color.LIME,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      expect(scene).toRender([0, 0, 0, 255]);

      collection.add({ position }, new BufferPoint());
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders one collection with a callback layer and a global layer", function () {
      collection.add({ position }, new BufferPoint());

      const red = scene.vectorLayers.add(
        new CircleLayer({
          collection,
          color: () => Color.RED,
          blendOption: BlendOption.OPAQUE,
        }),
      );
      const blue = scene.vectorLayers.add(
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
    });

    it("picks points", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorLayers.add(new CircleLayer({ collection }));

      expect(scene).toPickAndCall((result) => {
        expect(result.collection).toBe(collection);
        expect(result.index).toBe(0);
      });
    });

    it("does not pick if layer.show = false", function () {
      collection.add({ position }, new BufferPoint());

      scene.vectorLayers.add(new CircleLayer({ collection, show: false }));

      expect(scene).toPickAndCall((result) => {
        expect(result).toBeUndefined();
      });
    });
  },
  "WebGL",
);
