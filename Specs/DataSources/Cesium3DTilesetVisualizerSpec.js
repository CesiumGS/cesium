import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { BoundingSphereState } from "../../Source/Cesium.js";
import { ConstantPositionProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";
import { Cesium3DTilesetGraphics } from "../../Source/Cesium.js";
import { Cesium3DTilesetVisualizer } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "DataSources/Cesium3DTilesetVisualizer",
  function () {
    var tilesetUrl = "./Data/Cesium3DTiles/Batched/BatchedColors/tileset.json";

    var scene;
    var visualizer;

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
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(function () {
        visualizer.update();
      }).toThrowDeveloperError();
    });

    it("isDestroy returns false until destroyed.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(visualizer.isDestroyed()).toEqual(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toEqual(true);
      visualizer = undefined;
    });

    it("removes the listener from the entity collection when destroyed", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
      visualizer = undefined;
    });

    it("object with no model does not create one.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("object with no position does not set modelMatrix.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      var tileset = (testObject.tileset = new Cesium3DTilesetGraphics());
      tileset.uri = new ConstantProperty(tilesetUrl);

      visualizer.update(JulianDate.now());

      var tilesetPrimitive = scene.primitives.get(0);
      expect(tilesetPrimitive.modelMatrix).toEqual(Matrix4.IDENTITY);
    });

    it("A Cesium3DTilesetGraphics causes a primitive to be created and updated.", function () {
      var time = JulianDate.now();
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var tileset = new Cesium3DTilesetGraphics();
      tileset.show = new ConstantProperty(true);
      tileset.maximumScreenSpaceError = new ConstantProperty(24.0);
      tileset.uri = new ConstantProperty(tilesetUrl);

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.tileset = tileset;

      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);

      var primitive = scene.primitives.get(0);
      visualizer.update(time);
      expect(primitive.show).toEqual(true);
      expect(primitive.maximumScreenSpaceError).toEqual(24.0);
    });

    it("A Cesium3DTilesetGraphics with a Resource causes a primitive to be created.", function () {
      var time = JulianDate.now();
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var tileset = new Cesium3DTilesetGraphics();
      tileset.show = new ConstantProperty(true);
      tileset.uri = new ConstantProperty(
        new Resource({
          url: tilesetUrl,
        })
      );

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.tileset = tileset;

      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);
    });

    it("removing removes primitives.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var tileset = new Cesium3DTilesetGraphics();
      tileset.uri = new ConstantProperty(tilesetUrl);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      testObject.tileset = tileset;
      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);
      visualizer.update(time);
      entityCollection.removeAll();
      visualizer.update(time);
      expect(scene.primitives.length).toEqual(0);
    });

    it("Visualizer sets id property.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      var tileset = new Cesium3DTilesetGraphics();
      testObject.tileset = tileset;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      tileset.uri = new ConstantProperty(tilesetUrl);
      visualizer.update(time);

      var tilesetPrimitive = scene.primitives.get(0);
      expect(tilesetPrimitive.id).toEqual(testObject);
    });

    it("Computes bounding sphere.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      var tileset = new Cesium3DTilesetGraphics();
      testObject.tileset = tileset;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      tileset.uri = new ConstantProperty(tilesetUrl);
      visualizer.update(time);

      var tilesetPrimitive = scene.primitives.get(0);
      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);
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
      var entityCollection = new EntityCollection();
      var testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      visualizer.update(JulianDate.now());
      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("Fails bounding sphere when model fails to load.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      var tileset = new Cesium3DTilesetGraphics();
      testObject.tileset = tileset;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      tileset.uri = new ConstantProperty("/path/to/incorrect/file");
      visualizer.update(time);

      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);
      return pollToPromise(function () {
        scene.render();
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      }).then(function () {
        expect(state).toBe(BoundingSphereState.FAILED);
      });
    });

    it("Compute bounding sphere throws without entity.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      var result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();
    });

    it("Compute bounding sphere throws without result.", function () {
      var entityCollection = new EntityCollection();
      var testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new Cesium3DTilesetVisualizer(scene, entityCollection);
      expect(function () {
        visualizer.getBoundingSphere(testObject, undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
