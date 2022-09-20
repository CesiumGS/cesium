import {
  BoundingSphere,
  Cartesian3,
  defined,
  JulianDate,
  Matrix4,
  Resource,
  BoundingSphereState,
  ConstantPositionProperty,
  ConstantProperty,
  EntityCollection,
  Cesium3DTilesetGraphics,
  Cesium3DTilesetVisualizer,
  Globe,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;
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

    function allPrimitivesReady() {
      const promises = [];
      for (let i = 0; i < scene.primitives.length; ++i) {
        promises.push(scene.primitives.get(i).readyPromise);
      }
      return Promise.all(promises).catch(function (e) {
        // 404 errors
      });
    }

    afterEach(function () {
      return allPrimitivesReady().then(function () {
        if (defined(visualizer)) {
          visualizer = visualizer.destroy();
        }
      });
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

    it("object with no model does not create one.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("object with no position does not set modelMatrix.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const tileset = (testObject.tileset = new Cesium3DTilesetGraphics());
      tileset.uri = new ConstantProperty(tilesetUrl);

      visualizer.update(JulianDate.now());

      const tilesetPrimitive = scene.primitives.get(0);
      expect(tilesetPrimitive.modelMatrix).toEqual(Matrix4.IDENTITY);
    });

    it("A Cesium3DTilesetGraphics causes a primitive to be created and updated.", function () {
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

      expect(scene.primitives.length).toEqual(1);

      const primitive = scene.primitives.get(0);
      visualizer.update(time);
      expect(primitive.show).toEqual(true);
      expect(primitive.maximumScreenSpaceError).toEqual(24.0);
    });

    it("A Cesium3DTilesetGraphics with a Resource causes a primitive to be created.", function () {
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

      expect(scene.primitives.length).toEqual(1);
    });

    it("removing removes primitives.", function () {
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
      return allPrimitivesReady().then(function () {
        expect(scene.primitives.length).toEqual(1);
        visualizer.update(time);
        entityCollection.removeAll();
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(0);
      });
    });

    it("Visualizer sets id property.", function () {
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

      const tilesetPrimitive = scene.primitives.get(0);
      expect(tilesetPrimitive.id).toEqual(testObject);
    });

    it("Computes bounding sphere.", function () {
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

      const tilesetPrimitive = scene.primitives.get(0);
      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      return pollToPromise(function () {
        scene.render();
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      }).then(function () {
        expect(state).toBe(BoundingSphereState.DONE);
        expect(result).toEqual(tilesetPrimitive.boundingSphere);
      });
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

    it("Fails bounding sphere when model fails to load.", function () {
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
      return allPrimitivesReady()
        .catch(function (e) {
          // 404 error
        })
        .finally(function () {
          state = visualizer.getBoundingSphere(testObject, result);
          expect(state).toBe(BoundingSphereState.FAILED);
        });
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
