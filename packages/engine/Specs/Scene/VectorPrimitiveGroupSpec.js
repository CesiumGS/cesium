import { Cartesian3, Color } from "@cesium/core";
import {
  BlendOption,
  BufferPoint,
  BufferPointCollection,
  Camera,
  CircleVectorPrimitive,
  SceneMode,
  VectorPrimitiveGroup,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/VectorPrimitiveGroup",
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
      collection = new BufferPointCollection();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      collection.destroy();
    });

    it("has default values", function () {
      const group = new VectorPrimitiveGroup();

      expect(group.length).toBe(0);
      expect(group.name).toBeUndefined();
      expect(group.show).toBe(true);
      expect(group.flatten()).toEqual([]);
    });

    it("gets members by index and nested groups by name", function () {
      const circle = new CircleVectorPrimitive({ collection });
      const labels = new VectorPrimitiveGroup({ name: "labels" });
      const group = new VectorPrimitiveGroup({
        name: "style",
        primitives: [circle, labels],
      });

      expect(group.name).toBe("style");
      expect(group.length).toBe(2);
      expect(group.get(0)).toBe(circle);
      expect(group.get(1)).toBe(labels);
      expect(group.getPrimitiveIndexByName("labels")).toBe(1);
      expect(group.getPrimitiveIndexByName("missing")).toBe(-1);

      group.destroy();
    });

    it("flattens nested groups in drawing order", function () {
      const first = new CircleVectorPrimitive({ collection });
      const second = new CircleVectorPrimitive({ collection });
      const third = new CircleVectorPrimitive({ collection });
      const group = new VectorPrimitiveGroup({
        primitives: [
          new VectorPrimitiveGroup({ primitives: [first, second] }),
          third,
        ],
      });

      expect(group.flatten()).toEqual([first, second, third]);

      group.destroy();
    });

    it("destroys its members", function () {
      const circle = new CircleVectorPrimitive({ collection });
      const nested = new VectorPrimitiveGroup();
      const group = new VectorPrimitiveGroup({ primitives: [circle, nested] });

      group.destroy();

      expect(group.isDestroyed()).toBe(true);
      expect(circle.isDestroyed()).toBe(true);
      expect(nested.isDestroyed()).toBe(true);
      expect(collection.isDestroyed()).toBe(false);
    });

    it("draws its members", function () {
      collection.add({ position }, new BufferPoint());
      scene.primitives.add(
        new VectorPrimitiveGroup({
          primitives: [
            new CircleVectorPrimitive({
              collection,
              color: Color.LIME,
              blendOption: BlendOption.OPAQUE,
            }),
          ],
        }),
      );

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("does not draw if show is false", function () {
      collection.add({ position }, new BufferPoint());
      const group = scene.primitives.add(
        new VectorPrimitiveGroup({
          primitives: [
            new CircleVectorPrimitive({
              collection,
              color: Color.LIME,
              blendOption: BlendOption.OPAQUE,
            }),
          ],
        }),
      );

      group.show = false;

      expect(scene).toRender([0, 0, 0, 255]);
    });
  },
  "WebGL",
);
