import {
  BoundingSphere,
  Cartesian3,
  defined,
  JulianDate,
  Matrix4,
  Resource,
  BoundingSphereState,
  Cesium3DTileset,
  ConstantPositionProperty,
  ConstantProperty,
  EntityCollection,
  Cesium3DTilesetGraphics,
  Cesium3DTilesetVisualizer,
  Globe,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "DataSources/Cesium3DTilesetVisualizer",
  function () {
    const tilesetUrl =
      "./Data/Cesium3DTiles/Batched/BatchedColors/tileset.json";

    let scene;
    let visualizer;

    beforeAll(function () {
      scene = createScene();
      scene.globe = new Globe();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      if (defined(visualizer)) {
        visualizer = visualizer.destroy();
      }
    });

    it("constructor throws if no scene is passed.", function () {
      expect(function () {
        return new Cesium3DTilesetVisualizer();
      }).toThrowDeveloperError();
    });

    it("update throws if no time specified.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(function () {
        visualizer.update();
      }).toThrowDeveloperError();
    });

    it("isDestroy returns false until destroyed.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(visualizer.isDestroyed()).toEqual(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toEqual(true);
      visualizer = undefined;
    });

    it("removes the listener from the entity collection when destroyed", function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
      visualizer = undefined;
    });

    it("object with no tileset does not create one.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("object with no position does not set modelMatrix.", async function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const tileset = (testObject.tileset = new Cesium3DTilesetGraphics());
      tileset.uri = new ConstantProperty(tilesetUrl);

      visualizer.update(JulianDate.now());

      await pollToPromise(function () {
        return defined(scene.primitives.get(0));
      });

      const tilesetPrimitive = scene.primitives.get(0);
      expect(tilesetPrimitive.modelMatrix).toEqual(Matrix4.IDENTITY);
    });

    it("A Cesium3DTilesetGraphics causes a primitive to be created and updated.", async function () {
      const time = JulianDate.now();
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const tileset = new Cesium3DTilesetGraphics();
      tileset.show = new ConstantProperty(true);
      tileset.maximumScreenSpaceError = new ConstantProperty(24.0);
      tileset.uri = new ConstantProperty(tilesetUrl);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.tileset = tileset;

      visualizer.update(time);

      await pollToPromise(function () {
        return defined(scene.primitives.get(0));
      });

      expect(scene.primitives.length).toEqual(1);
      expect(scene.primitives.get(0)).toBeInstanceOf(Cesium3DTileset);

      const primitive = scene.primitives.get(0);
      visualizer.update(time);
      expect(primitive.show).toEqual(true);
      expect(primitive.maximumScreenSpaceError).toEqual(24.0);
    });

    it("A Cesium3DTilesetGraphics with a Resource causes a primitive to be created.", async function () {
      const time = JulianDate.now();
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const tileset = new Cesium3DTilesetGraphics();
      tileset.show = new ConstantProperty(true);
      tileset.uri = new ConstantProperty(
        new Resource({
          url: tilesetUrl,
        })
      );

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.tileset = tileset;

      visualizer.update(time);

      await pollToPromise(function () {
        return defined(scene.primitives.get(0));
      });

      expect(scene.primitives.length).toEqual(1);
      expect(scene.primitives.get(0)).toBeInstanceOf(Cesium3DTileset);
    });

    it("removing removes primitives.", async function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const tileset = new Cesium3DTilesetGraphics();
      tileset.uri = new ConstantProperty(tilesetUrl);

      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      testObject.tileset = tileset;
      visualizer.update(time);
      await pollToPromise(function () {
        return defined(scene.primitives.get(0));
      });
      expect(scene.primitives.length).toEqual(1);
      visualizer.update(time);
      entityCollection.removeAll();
      visualizer.update(time);
      expect(scene.primitives.length).toEqual(0);
    });

    it("Visualizer sets id property.", async function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const tileset = new Cesium3DTilesetGraphics();
      testObject.tileset = tileset;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      tileset.uri = new ConstantProperty(tilesetUrl);
      visualizer.update(time);

      await pollToPromise(function () {
        return defined(scene.primitives.get(0));
      });

      const tilesetPrimitive = scene.primitives.get(0);
      expect(tilesetPrimitive.id).toEqual(testObject);
    });

    it("Visualizer does not create tileset primitive when show is false.", async function () {
      const time = JulianDate.now();
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const tileset = new Cesium3DTilesetGraphics();
      tileset.show = new ConstantProperty(false);
      tileset.uri = new ConstantProperty(
        new Resource({
          url: tilesetUrl,
        })
      );

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.tileset = tileset;

      spyOn(Cesium3DTileset, "fromUrl").and.callThrough();

      visualizer.update(time);

      expect(Cesium3DTileset.fromUrl).not.toHaveBeenCalled();

      tileset.show = new ConstantProperty(true);

      visualizer.update(time);

      expect(Cesium3DTileset.fromUrl).toHaveBeenCalled();

      await pollToPromise(function () {
        return defined(scene.primitives.get(0));
      });

      expect(scene.primitives.length).toEqual(1);
      expect(scene.primitives.get(0)).toBeInstanceOf(Cesium3DTileset);
      expect(scene.primitives.get(0).show).toEqual(true);
    });

    it("Visualizer does not create tileset primitive when show is false.", async function () {
      const time = JulianDate.now();
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const tileset = new Cesium3DTilesetGraphics();
      tileset.show = new ConstantProperty(true);
      tileset.uri = new ConstantProperty(
        new Resource({
          url: tilesetUrl,
        })
      );

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.tileset = tileset;

      spyOn(Cesium3DTileset, "fromUrl");
      visualizer.update(time);

      tileset.show = new ConstantProperty(false);

      expect(() => visualizer.update(time)).not.toThrow();
    });

    it("Visualizer sets show property.", async function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const tileset = new Cesium3DTilesetGraphics();
      testObject.tileset = tileset;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      tileset.uri = new ConstantProperty(tilesetUrl);
      visualizer.update(time);

      await pollToPromise(function () {
        return defined(scene.primitives.get(0));
      });

      const tilesetPrimitive = scene.primitives.get(0);
      expect(tilesetPrimitive.show).toEqual(true);

      tileset.show = new ConstantProperty(false);

      visualizer.update(time);

      expect(tilesetPrimitive.show).toEqual(false);
    });

    it("Computes bounding sphere.", async function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const tileset = new Cesium3DTilesetGraphics();
      testObject.tileset = tileset;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      tileset.uri = new ConstantProperty(tilesetUrl);
      visualizer.update(time);

      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      await pollToPromise(function () {
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      });

      const tilesetPrimitive = scene.primitives.get(0);
      expect(state).toBe(BoundingSphereState.DONE);
      expect(result).toEqual(tilesetPrimitive.boundingSphere);
    });

    it("Fails bounding sphere for entity without tileset.", function () {
      const entityCollection = new EntityCollection();
      const testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      visualizer.update(JulianDate.now());
      const result = new BoundingSphere();
      const state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("Fails bounding sphere when tileset fails to load.", async function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const tileset = new Cesium3DTilesetGraphics();
      testObject.tileset = tileset;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      tileset.uri = new ConstantProperty("/path/to/incorrect/file");
      visualizer.update(time);

      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      await pollToPromise(function () {
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      });

      state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("Compute bounding sphere throws without entity.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      const result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();
    });

    it("Compute bounding sphere throws without result.", function () {
      const entityCollection = new EntityCollection();
      const testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(function () {
        visualizer.getBoundingSphere(testObject, undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
